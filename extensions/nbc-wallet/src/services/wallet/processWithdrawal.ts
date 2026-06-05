import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { emit } from '@evershop/evershop/lib/event';
import { getTreasurySigner } from './getTreasurySigner.js';
import { getChainRpcConfig } from './getChainRpcConfig.js';

const PROCESSABLE_STATUSES = ['requested', 'approved'];

/**
 * Two-phase withdrawal processing to prevent double-spend:
 *
 * Phase 1 (DB transaction):
 *   - Validate withdrawal (status, balance)
 *   - Deduct balance and frozen_balance atomically
 *   - Mark as `processing` and commit
 *   Idempotency gate: concurrent retries see `processing` and abort early.
 *
 * Phase 2 (outside DB transaction):
 *   - Execute on-chain token.transfer()
 *   - Success → update status to `completed`, write tx_hash
 *   - Failure → restore balance, mark as `failed`
 *
 * If Phase 2 DB write fails after a successful chain tx, the row stays in
 * `processing`. A reconcile job must detect and finalise it — do NOT re-run
 * the chain transfer.
 */
export async function processWithdrawal(
  withdrawalUuid: string,
  performedBy = 'system'
) {
  const { token } = getTreasurySigner();
  const { tokenDecimals } = getChainRpcConfig();

  // ── Phase 1: validate + mark processing (committed DB txn) ───────────────
  let withdrawalId: number;
  let walletId: number;
  let walletAddress: string;
  let amount: number;
  let balanceBefore: number;
  let balanceAfter: number;
  let frozenBefore: number;

  {
    const conn = await getConnection();
    try {
      await startTransaction(conn);

      const wdResult = await conn.query(
        'SELECT * FROM nbc_withdrawal WHERE uuid = $1 FOR UPDATE',
        [withdrawalUuid]
      );
      const wd = wdResult.rows[0];

      if (!wd) throw new Error('Withdrawal not found');

      if (wd.status === 'completed') {
        await commit(conn);
        return { withdrawalUuid, status: 'completed', txHash: wd.tx_hash, alreadyProcessed: true };
      }

      if (wd.status === 'processing') {
        await commit(conn);
        return { withdrawalUuid, status: 'processing', txHash: wd.tx_hash, alreadyProcessed: true };
      }

      if (!PROCESSABLE_STATUSES.includes(wd.status)) {
        throw new Error(`Withdrawal status "${wd.status}" cannot be processed`);
      }

      const walletResult = await conn.query(
        'SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE',
        [wd.wallet_id]
      );
      const wallet = walletResult.rows[0];
      if (!wallet) throw new Error('NBC wallet not found');

      amount = Number(wd.amount);
      frozenBefore = Number(wallet.frozen_balance);
      balanceBefore = Number(wallet.balance);

      if (frozenBefore < amount) throw new Error('Frozen balance is insufficient for withdrawal');
      if (balanceBefore < amount) throw new Error('Wallet balance is insufficient for withdrawal');

      balanceAfter = balanceBefore - amount;
      const nextFrozen = frozenBefore - amount;

      await conn.query(
        `UPDATE nbc_wallet
            SET balance = $1, frozen_balance = $2, updated_at = NOW()
          WHERE wallet_id = $3`,
        [balanceAfter, nextFrozen, wallet.wallet_id]
      );

      await conn.query(
        `UPDATE nbc_withdrawal
            SET status = 'processing', processing_at = NOW(), updated_at = NOW(),
                metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
          WHERE withdrawal_id = $2`,
        [JSON.stringify({ performed_by: performedBy }), wd.withdrawal_id]
      );

      withdrawalId = wd.withdrawal_id;
      walletId = wallet.wallet_id;
      walletAddress = wd.wallet_address;

      await commit(conn);
    } catch (err) {
      await rollback(conn);
      throw err;
    }
  }

  // ── Phase 2: on-chain transfer (outside DB transaction) ──────────────────
  let txHash: string | undefined;
  let onchainError: Error | undefined;

  try {
    const onchainAmount = BigInt(amount) * BigInt(10) ** BigInt(tokenDecimals);
    const tx = await token.transfer(walletAddress, onchainAmount);
    const receipt = await tx.wait();
    txHash = receipt?.hash || tx.hash;
  } catch (err) {
    onchainError = err instanceof Error ? err : new Error(String(err));
  }

  // ── Phase 2 DB write: finalise status ────────────────────────────────────
  if (txHash) {
    // Success path
    const conn2 = await getConnection();
    try {
      await startTransaction(conn2);

      const walletTx = await insert('nbc_wallet_transaction')
        .given({
          wallet_id: walletId,
          transaction_type: 'withdrawal',
          amount: -amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference: withdrawalUuid,
          status: 'completed',
          metadata: {
            source: 'onchain_withdrawal',
            tx_hash: txHash,
            performed_by: performedBy
          }
        })
        .execute(conn2);

      await conn2.query(
        `UPDATE nbc_withdrawal
            SET tx_hash      = $1,
                wallet_tx_id = $2,
                status       = 'completed',
                processed_at = NOW(),
                updated_at   = NOW()
          WHERE withdrawal_id = $3`,
        [txHash, walletTx.insertId || walletTx.wallet_tx_id, withdrawalId]
      );

      await commit(conn2);
    } catch (dbErr) {
      await rollback(conn2);
      // Chain tx succeeded but DB write failed. Row stays in `processing`.
      // Reconcile job must handle this — do NOT retry the chain transfer.
      throw new Error(
        `Chain transfer succeeded (txHash=${txHash}) but DB finalisation failed: ` +
          `${(dbErr as Error).message}. Row ${withdrawalId} is in 'processing' state.`
      );
    }

    await emit('nbc_wallet_withdrawal_completed', {
      withdrawalUuid, withdrawalId, walletId, txHash, amount, balanceAfter
    }).catch(() => {});

    return {
      withdrawalUuid,
      status: 'completed',
      txHash,
      balanceAfter,
      frozenBalance: frozenBefore - amount
    };
  } else {
    // Failure path — restore balance and mark as failed
    const conn3 = await getConnection();
    try {
      await startTransaction(conn3);

      await conn3.query(
        `UPDATE nbc_wallet
            SET balance = $1, frozen_balance = $2, updated_at = NOW()
          WHERE wallet_id = $3`,
        [balanceBefore, frozenBefore, walletId]
      );

      await conn3.query(
        `UPDATE nbc_withdrawal
            SET status = 'failed', failed_at = NOW(),
                error_message = $1, updated_at = NOW()
          WHERE withdrawal_id = $2`,
        [onchainError!.message, withdrawalId]
      );

      await commit(conn3);
    } catch (_restoreErr) {
      await rollback(conn3);
      // Restoration failed — row stays in `processing`, needs manual review
    }

    await emit('nbc_wallet_withdrawal_failed', {
      withdrawalUuid, withdrawalId, walletId, error: onchainError!.message
    }).catch(() => {});

    throw onchainError!;
  }
}
