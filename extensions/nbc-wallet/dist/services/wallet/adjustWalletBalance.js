import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
function normalizeAmount(amount) {
    const normalized = Number(amount);
    if (!Number.isInteger(normalized) || normalized <= 0) {
        throw new Error('Adjustment amount must be a positive integer');
    }
    return normalized;
}
function normalizeAdjustmentType(type) {
    if (type !== 'credit' && type !== 'debit') {
        throw new Error('Adjustment type must be credit or debit');
    }
    return type;
}
function buildWalletLookup(input) {
    if (input.walletId) {
        return {
            sql: 'wallet_id = $1',
            params: [
                input.walletId
            ]
        };
    }
    if (input.customerId) {
        return {
            sql: 'customer_id = $1',
            params: [
                input.customerId
            ]
        };
    }
    if (input.walletAddress) {
        return {
            sql: 'wallet_address = $1',
            params: [
                normalizeWalletAddress(input.walletAddress)
            ]
        };
    }
    throw new Error('walletId, customerId or walletAddress is required');
}
export async function adjustWalletBalance(input) {
    const amount = normalizeAmount(input.amount);
    const type = normalizeAdjustmentType(input.type);
    const reason = String(input.reason || '').trim();
    if (!reason) {
        throw new Error('Adjustment reason is required');
    }
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const lookup = buildWalletLookup(input);
        const walletResult = await connection.query(`SELECT * FROM nbc_wallet WHERE ${lookup.sql} FOR UPDATE`, lookup.params);
        const wallet = walletResult.rows[0];
        if (!wallet) {
            throw new Error('NBC wallet not found');
        }
        const balanceBefore = Number(wallet.balance);
        const balanceAfter = type === 'credit' ? balanceBefore + amount : balanceBefore - amount;
        if (balanceAfter < 0) {
            throw new Error('NBC balance is insufficient for debit adjustment');
        }
        await connection.query(`UPDATE nbc_wallet
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_id = $2`, [
            balanceAfter,
            wallet.wallet_id
        ]);
        const transaction = await insert('nbc_wallet_transaction').given({
            wallet_id: wallet.wallet_id,
            order_id: null,
            transaction_type: type === 'credit' ? 'admin_credit' : 'admin_debit',
            amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            exchange_rate: null,
            cny_amount: null,
            reference: input.reference || `admin_adjust:${Date.now()}`,
            status: 'completed',
            metadata: {
                source: 'admin_adjustment',
                performed_by: input.performedBy,
                reason
            }
        }).execute(connection);
        await commit(connection);
        return {
            walletId: wallet.wallet_id,
            customerId: wallet.customer_id,
            walletAddress: wallet.wallet_address,
            transactionId: transaction.insertId || transaction.wallet_tx_id,
            transactionType: type === 'credit' ? 'admin_credit' : 'admin_debit',
            amount,
            balanceBefore,
            balanceAfter,
            reason,
            reference: input.reference || null
        };
    } catch (error) {
        await rollback(connection);
        throw error;
    }
}
