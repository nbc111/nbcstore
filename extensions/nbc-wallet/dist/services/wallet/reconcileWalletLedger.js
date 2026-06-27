import { pool } from '@evershop/evershop/lib/postgres';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { emit } from '@evershop/evershop/lib/event';
import { JsonRpcProvider } from 'ethers';
import { settleOnchainDeposit } from './settleOnchainDeposit.js';
import { getOnchainConfig } from './getOnchainConfig.js';
import { writeAuditLog } from './writeAuditLog.js';
/**
 * Reconcile on-chain deposits (pending / failed / unmatched).
 */ async function reconcileDeposits(limit) {
    const result = await pool.query(`SELECT deposit_id
       FROM nbc_onchain_deposit
      WHERE status IN ('pending', 'failed', 'unmatched')
      ORDER BY created_at ASC, deposit_id ASC
      LIMIT $1`, [
        Math.max(Number(limit) || 100, 1)
    ]);
    let completed = 0;
    let unmatched = 0;
    let failed = 0;
    for (const row of result.rows){
        try {
            const settlement = await settleOnchainDeposit(Number(row.deposit_id));
            if (settlement.status === 'completed') completed += 1;
            else if (settlement.status === 'unmatched') unmatched += 1;
        } catch (error) {
            failed += 1;
            await pool.query(`UPDATE nbc_onchain_deposit
            SET status = 'failed',
                error_message = $1,
                updated_at = NOW()
          WHERE deposit_id = $2`, [
                error instanceof Error ? error.message : String(error),
                row.deposit_id
            ]);
        }
    }
    return {
        scanned: result.rows.length,
        completed,
        unmatched,
        failed
    };
}
/**
 * Reconcile stuck `processing` withdrawals.
 *
 * A withdrawal is considered "stuck" when it has been in `processing` for more
 * than `staleAfterMinutes` without a `tx_hash`. This indicates Phase 2 of
 * processWithdrawal failed before the chain call, or the DB finalisation failed
 * after a successful chain call.
 *
 * Action taken:
 * - If the withdrawal has a `tx_hash`: check the chain; if mined → `completed`;
 *   if not found → mark `failed` and restore balance.
 * - If no `tx_hash` (Phase 1 committed, Phase 2 never ran): mark `failed` and
 *   restore balance — safe to retry manually.
 */ async function reconcileProcessingWithdrawals(staleAfterMinutes = 30) {
    const config = getOnchainConfig();
    const result = await pool.query(`SELECT w.*, nw.balance, nw.frozen_balance
       FROM nbc_withdrawal w
       JOIN nbc_wallet nw ON nw.wallet_id = w.wallet_id
      WHERE w.status = 'processing'
        AND w.processing_at < NOW() - INTERVAL '${staleAfterMinutes} minutes'
      ORDER BY w.processing_at ASC
      LIMIT 50`);
    let finalized = 0;
    let restored = 0;
    for (const row of result.rows){
        const amount = Number(row.amount);
        if (row.tx_hash && config.enabled && config.rpcUrl) {
            try {
                const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
                const receipt = await provider.getTransactionReceipt(row.tx_hash);
                if (receipt && receipt.status === 1) {
                    // Chain tx confirmed — finalise as completed
                    const conn = await getConnection();
                    try {
                        await startTransaction(conn);
                        const walletTx = await insert('nbc_wallet_transaction').given({
                            wallet_id: row.wallet_id,
                            transaction_type: 'withdrawal',
                            amount: -amount,
                            balance_before: Number(row.balance) + amount,
                            balance_after: Number(row.balance),
                            reference: row.uuid,
                            status: 'completed',
                            metadata: {
                                source: 'onchain_withdrawal_reconciled',
                                tx_hash: row.tx_hash
                            }
                        }).execute(conn);
                        await conn.query(`UPDATE nbc_withdrawal
                  SET status = 'completed', processed_at = NOW(), updated_at = NOW(),
                      wallet_tx_id = $1
                WHERE withdrawal_id = $2`, [
                            walletTx.insertId || walletTx.wallet_tx_id,
                            row.withdrawal_id
                        ]);
                        await commit(conn);
                        finalized += 1;
                        await Promise.all([
                            emit('nbc_wallet_withdrawal_completed', {
                                withdrawalUuid: row.uuid,
                                withdrawalId: row.withdrawal_id,
                                walletId: row.wallet_id,
                                txHash: row.tx_hash,
                                amount,
                                balanceAfter: Number(row.balance)
                            }).catch(()=>{}),
                            writeAuditLog({
                                entityType: 'withdrawal',
                                entityId: row.withdrawal_id,
                                action: 'completed_via_reconcile',
                                metadata: {
                                    tx_hash: row.tx_hash
                                }
                            })
                        ]);
                    } catch (_err) {
                        await rollback(conn);
                    }
                    continue;
                }
            } catch (_chainErr) {
                continue;
            }
        }
        // No tx_hash or tx not found/failed — safe to restore and mark failed
        const conn2 = await getConnection();
        try {
            await startTransaction(conn2);
            const currentBalance = Number(row.balance);
            const restoredBalance = currentBalance + amount;
            await conn2.query(`UPDATE nbc_wallet SET balance = $1, updated_at = NOW() WHERE wallet_id = $2`, [
                restoredBalance,
                row.wallet_id
            ]);
            const failReason = row.tx_hash ? `Reconcile: tx ${row.tx_hash} not confirmed after ${staleAfterMinutes}m` : `Reconcile: stuck in processing without tx_hash after ${staleAfterMinutes}m`;
            await conn2.query(`UPDATE nbc_withdrawal
            SET status = 'failed', failed_at = NOW(), error_message = $1, updated_at = NOW()
          WHERE withdrawal_id = $2`, [
                failReason,
                row.withdrawal_id
            ]);
            await commit(conn2);
            restored += 1;
            await Promise.all([
                emit('nbc_wallet_withdrawal_failed', {
                    withdrawalUuid: row.uuid,
                    withdrawalId: row.withdrawal_id,
                    walletId: row.wallet_id,
                    error: failReason
                }).catch(()=>{}),
                writeAuditLog({
                    entityType: 'withdrawal',
                    entityId: row.withdrawal_id,
                    action: 'failed_via_reconcile',
                    metadata: {
                        tx_hash: row.tx_hash,
                        reason: failReason
                    }
                })
            ]);
        } catch (_err) {
            await rollback(conn2);
        }
    }
    return {
        scanned: result.rows.length,
        finalized,
        restored
    };
}
export async function reconcileWalletLedger(limit = 100) {
    const [deposits, withdrawals] = await Promise.all([
        reconcileDeposits(limit),
        reconcileProcessingWithdrawals(30)
    ]);
    return {
        deposits,
        withdrawals
    };
}
