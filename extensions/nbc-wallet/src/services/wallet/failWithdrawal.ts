import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';

export async function failWithdrawal(
  withdrawalUuid: string,
  reason: string,
  performedBy = 'system'
) {
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
      throw new Error('Completed withdrawal cannot be failed');
    }

    if (withdrawal.status === 'failed') {
      await commit(connection);
      return {
        withdrawalUuid,
        status: 'failed',
        alreadyFailed: true
      };
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
    const nextFrozenBalance = Math.max(frozenBalance - amount, 0);

    await connection.query(
      `UPDATE nbc_wallet
          SET frozen_balance = $1,
              updated_at = NOW()
        WHERE wallet_id = $2`,
      [nextFrozenBalance, wallet.wallet_id]
    );

    await connection.query(
      `UPDATE nbc_withdrawal
          SET status = 'failed',
              failed_at = NOW(),
              error_message = $1,
              updated_at = NOW(),
              metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
        WHERE withdrawal_id = $3`,
      [
        reason,
        JSON.stringify({ performed_by: performedBy }),
        withdrawal.withdrawal_id
      ]
    );

    await commit(connection);

    return {
      withdrawalUuid,
      status: 'failed',
      frozenBalance: nextFrozenBalance,
      errorMessage: reason
    };
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
