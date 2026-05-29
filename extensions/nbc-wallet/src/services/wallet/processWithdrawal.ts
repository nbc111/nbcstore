import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { getTreasurySigner } from './getTreasurySigner.js';

export async function processWithdrawal(
  withdrawalUuid: string,
  performedBy = 'system'
) {
  const { token } = getTreasurySigner();
  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const withdrawalResult = await connection.query(
      'SELECT * FROM nbc_withdrawal WHERE uuid = $1 FOR UPDATE',
      [withdrawalUuid]
    );
    const withdrawal = withdrawalResult.rows[0];

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status === 'completed') {
      await commit(connection);
      return {
        withdrawalUuid,
        status: 'completed',
        txHash: withdrawal.tx_hash,
        alreadyProcessed: true
      };
    }

    if (withdrawal.status !== 'requested') {
      throw new Error(`Withdrawal status ${withdrawal.status} cannot be processed`);
    }

    const walletResult = await connection.query(
      'SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE',
      [withdrawal.wallet_id]
    );
    const wallet = walletResult.rows[0];

    if (!wallet) {
      throw new Error('NBC wallet not found');
    }

    const amount = Number(withdrawal.amount);
    const frozenBalance = Number(wallet.frozen_balance);
    const balanceBefore = Number(wallet.balance);

    if (frozenBalance < amount) {
      throw new Error('Frozen balance is insufficient for withdrawal');
    }
    if (balanceBefore < amount) {
      throw new Error('Wallet balance is insufficient for withdrawal');
    }

    const tx = await token.transfer(withdrawal.wallet_address, BigInt(amount));
    const receipt = await tx.wait();

    const balanceAfter = balanceBefore - amount;
    const nextFrozenBalance = frozenBalance - amount;

    await connection.query(
      `UPDATE nbc_wallet
          SET balance = $1,
              frozen_balance = $2,
              updated_at = NOW()
        WHERE wallet_id = $3`,
      [balanceAfter, nextFrozenBalance, wallet.wallet_id]
    );

    const walletTx = await insert('nbc_wallet_transaction')
      .given({
        wallet_id: wallet.wallet_id,
        transaction_type: 'withdrawal',
        amount: -amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference: withdrawal.uuid,
        status: 'completed',
        metadata: {
          source: 'onchain_withdrawal',
          tx_hash: receipt?.hash || tx.hash,
          performed_by: performedBy
        }
      })
      .execute(connection);

    await connection.query(
      `UPDATE nbc_withdrawal
          SET tx_hash = $1,
              wallet_tx_id = $2,
              status = 'completed',
              processed_at = NOW(),
              updated_at = NOW(),
              metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE withdrawal_id = $4`,
      [
        receipt?.hash || tx.hash,
        walletTx.insertId || walletTx.wallet_tx_id,
        JSON.stringify({ performed_by: performedBy }),
        withdrawal.withdrawal_id
      ]
    );

    await commit(connection);

    return {
      withdrawalUuid,
      status: 'completed',
      txHash: receipt?.hash || tx.hash,
      balanceAfter,
      frozenBalance: nextFrozenBalance
    };
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
