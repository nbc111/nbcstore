import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getChainRpcConfig } from './getChainRpcConfig.js';
import { getWalletByCustomerId } from './getWalletByCustomerId.js';
function getWithdrawalLimits() {
    return {
        minAmount: Math.max(Number(getConfig('nbcWallet.withdrawal.minAmount', 1)), 1),
        maxAmount: Number(getConfig('nbcWallet.withdrawal.maxAmount', 0)),
        dailyLimit: Number(getConfig('nbcWallet.withdrawal.dailyLimit', 0))
    };
}
export async function requestWithdrawal(input) {
    const amount = Math.floor(Number(input.amount || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
    }
    const limits = getWithdrawalLimits();
    if (amount < limits.minAmount) {
        throw new Error(`Withdrawal amount must be at least ${limits.minAmount} NBC`);
    }
    if (limits.maxAmount > 0 && amount > limits.maxAmount) {
        throw new Error(`Withdrawal amount must not exceed ${limits.maxAmount} NBC per transaction`);
    }
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const wallet = await getWalletByCustomerId(input.customerId);
        if (!wallet) {
            throw new Error('NBC wallet not found');
        }
        const lockedWalletResult = await connection.query('SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE', [
            wallet.wallet_id
        ]);
        const lockedWallet = lockedWalletResult.rows[0];
        if (!lockedWallet) {
            throw new Error('NBC wallet not found');
        }
        // Daily cumulative limit check
        if (limits.dailyLimit > 0) {
            const todayResult = await connection.query(`SELECT COALESCE(SUM(amount), 0) AS daily_total
           FROM nbc_withdrawal
          WHERE customer_id = $1
            AND status NOT IN ('failed')
            AND created_at >= CURRENT_DATE`, [
                input.customerId
            ]);
            const dailyTotal = Number(todayResult.rows[0]?.daily_total || 0);
            if (dailyTotal + amount > limits.dailyLimit) {
                const remaining = Math.max(limits.dailyLimit - dailyTotal, 0);
                throw new Error(`Daily withdrawal limit of ${limits.dailyLimit} NBC exceeded. ` + `Remaining today: ${remaining} NBC`);
            }
        }
        const availableBalance = Number(lockedWallet.balance) - Number(lockedWallet.frozen_balance);
        if (availableBalance < amount) {
            throw new Error('NBC balance is insufficient for withdrawal');
        }
        const chain = getChainRpcConfig();
        if (!chain.chainId || !chain.tokenAddress) {
            throw new Error('On-chain withdrawal configuration is incomplete');
        }
        const nextFrozenBalance = Number(lockedWallet.frozen_balance) + amount;
        await connection.query(`UPDATE nbc_wallet
          SET frozen_balance = $1, updated_at = NOW()
        WHERE wallet_id = $2`, [
            nextFrozenBalance,
            lockedWallet.wallet_id
        ]);
        const withdrawal = await insert('nbc_withdrawal').given({
            wallet_id: lockedWallet.wallet_id,
            customer_id: lockedWallet.customer_id,
            wallet_address: lockedWallet.wallet_address,
            chain_id: chain.chainId,
            token_address: chain.tokenAddress,
            amount,
            status: 'requested',
            metadata: {
                source: 'customer_request'
            }
        }).execute(connection);
        await commit(connection);
        return {
            withdrawalId: withdrawal.insertId || withdrawal.withdrawal_id,
            amount,
            walletAddress: lockedWallet.wallet_address,
            frozenBalance: nextFrozenBalance
        };
    } catch (error) {
        await rollback(connection);
        throw error;
    }
}
