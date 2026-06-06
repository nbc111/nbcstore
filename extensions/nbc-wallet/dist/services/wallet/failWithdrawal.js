import { commit, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { emit } from '@evershop/evershop/lib/event';
import { writeAuditLog } from './writeAuditLog.js';
/**
 * Reject or cancel a withdrawal and restore the user's balance.
 *
 * Balance restoration depends on the current status:
 *
 * • `requested` / `approved`:
 *     processWithdrawal Phase 1 has NOT run yet.
 *     State: balance unchanged, frozen_balance += amount  (set by requestWithdrawal)
 *     Restore: frozen_balance -= amount
 *
 * • `processing`:
 *     processWithdrawal Phase 1 has already committed:
 *       balance -= amount, frozen_balance -= amount  (net: balance is down, frozen is back to pre-request level)
 *     MUST only be called after confirming the on-chain tx was NOT mined.
 *     Restore: balance += amount  (frozen_balance is already correct)
 */
export async function failWithdrawal(withdrawalUuid, reason, performedBy = 'system') {
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const withdrawalResult = await connection.query('SELECT * FROM nbc_withdrawal WHERE uuid = $1 FOR UPDATE', [withdrawalUuid]);
        const withdrawal = withdrawalResult.rows[0];
        if (!withdrawal)
            throw new Error('Withdrawal not found');
        if (withdrawal.status === 'completed') {
            throw new Error('Completed withdrawal cannot be failed');
        }
        if (withdrawal.status === 'failed') {
            await commit(connection);
            return { withdrawalUuid, status: 'failed', alreadyFailed: true };
        }
        const walletResult = await connection.query('SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE', [withdrawal.wallet_id]);
        const wallet = walletResult.rows[0];
        if (!wallet)
            throw new Error('NBC wallet not found');
        const amount = Number(withdrawal.amount);
        const currentBalance = Number(wallet.balance);
        const currentFrozen = Number(wallet.frozen_balance);
        let newBalance = currentBalance;
        let newFrozen = currentFrozen;
        if (withdrawal.status === 'processing') {
            // Phase 1 already deducted balance; restore it
            // frozen_balance was already decreased back to pre-request level in Phase 1
            newBalance = currentBalance + amount;
        }
        else {
            // requested / approved: only frozen_balance was increased by requestWithdrawal
            newFrozen = Math.max(currentFrozen - amount, 0);
        }
        await connection.query(`UPDATE nbc_wallet
          SET balance        = $1,
              frozen_balance = $2,
              updated_at     = NOW()
        WHERE wallet_id = $3`, [newBalance, newFrozen, wallet.wallet_id]);
        await connection.query(`UPDATE nbc_withdrawal
          SET status        = 'failed',
              failed_at     = NOW(),
              error_message = $1,
              updated_at    = NOW(),
              metadata      = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
        WHERE withdrawal_id = $3`, [
            reason,
            JSON.stringify({ performed_by: performedBy }),
            withdrawal.withdrawal_id
        ]);
        await commit(connection);
        const result = {
            withdrawalUuid,
            withdrawalId: withdrawal.withdrawal_id,
            walletId: withdrawal.wallet_id,
            customerId: withdrawal.customer_id,
            status: 'failed',
            previousStatus: withdrawal.status,
            amount,
            balanceRestored: newBalance,
            frozenBalance: newFrozen,
            errorMessage: reason
        };
        await Promise.all([
            emit('nbc_wallet_withdrawal_failed', result).catch(() => { }),
            writeAuditLog({
                entityType: 'withdrawal',
                entityId: withdrawal.withdrawal_id,
                action: 'failed',
                performedBy,
                metadata: {
                    reason,
                    previous_status: withdrawal.status,
                    balance_restored: newBalance,
                    amount
                }
            })
        ]);
        return result;
    }
    catch (error) {
        await rollback(connection);
        throw error;
    }
}
//# sourceMappingURL=failWithdrawal.js.map