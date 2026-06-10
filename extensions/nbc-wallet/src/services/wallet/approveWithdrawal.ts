import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { emit } from '@evershop/evershop/lib/event';
import { writeAuditLog } from './writeAuditLog.js';

/**
 * Approve a withdrawal request.
 *
 * State machine: requested → approved
 *
 * This is the "human review" gate that separates the approval decision from
 * the actual on-chain transfer (handled by processWithdrawal). Keeping them
 * separate enables dual-control workflows and audit trails.
 */
export async function approveWithdrawal(
  withdrawalUuid: string,
  performedBy = 'system'
) {
  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const result = await connection.query(
      'SELECT * FROM nbc_withdrawal WHERE uuid = $1 FOR UPDATE',
      [withdrawalUuid]
    );
    const wd = result.rows[0];

    if (!wd) throw new Error('Withdrawal not found');

    if (wd.status === 'approved') {
      await commit(connection);
      return { withdrawalUuid, status: 'approved', alreadyApproved: true };
    }

    if (wd.status !== 'requested') {
      throw new Error(
        `Withdrawal status "${wd.status}" cannot be approved (must be "requested")`
      );
    }

    await connection.query(
      `UPDATE nbc_withdrawal
          SET status      = 'approved',
              approved_at = NOW(),
              approved_by = $1,
              updated_at  = NOW(),
              metadata    = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
        WHERE withdrawal_id = $3`,
      [
        performedBy,
        JSON.stringify({ approved_by: performedBy }),
        wd.withdrawal_id
      ]
    );

    await commit(connection);

    const approved = {
      withdrawalUuid,
      withdrawalId: wd.withdrawal_id,
      walletId: wd.wallet_id,
      customerId: wd.customer_id,
      amount: Number(wd.amount),
      walletAddress: wd.wallet_address,
      status: 'approved' as const,
      approvedBy: performedBy,
      alreadyApproved: false
    };

    await Promise.all([
      emit('nbc_wallet_withdrawal_approved', approved).catch(() => {}),
      writeAuditLog({
        entityType: 'withdrawal',
        entityId: wd.withdrawal_id,
        action: 'approved',
        performedBy,
        metadata: { amount: Number(wd.amount), wallet_address: wd.wallet_address }
      })
    ]);

    return approved;
  } catch (err) {
    await rollback(connection);
    throw err;
  }
}
