import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getWalletAssetConfig, normalizeAssetSymbol } from './assets.js';
import { getWalletByCustomerId } from './getWalletByCustomerId.js';
import { ensureWalletAssetBalance } from './walletAssetBalance.js';
function getWithdrawalLimits(assetSymbol = 'NBC') {
    const prefix = assetSymbol === 'USDT' ? 'nbcWallet.assets.USDT.withdrawal' : 'nbcWallet.withdrawal';
    return {
        minAmount: Math.max(Number(getConfig(`${prefix}.minAmount`, 1)), 1),
        maxAmount: Number(getConfig(`${prefix}.maxAmount`, 0)),
        dailyLimit: Number(getConfig(`${prefix}.dailyLimit`, 0)),
        frequencyWindowSeconds: Number(getConfig(`${prefix}.frequencyWindowSeconds`, 3600)),
        maxRequestsPerWindow: Number(getConfig(`${prefix}.maxRequestsPerWindow`, 3))
    };
}
function getConfiguredList(path) {
    const value = getConfig(path, []);
    if (Array.isArray(value)) {
        return value.map((item)=>String(item));
    }
    return String(value || '').split(',').map((item)=>item.trim()).filter(Boolean);
}
export async function requestWithdrawal(input) {
    const amount = Math.floor(Number(input.amount || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
    }
    const assetSymbol = normalizeAssetSymbol(input.assetSymbol);
    const asset = getWalletAssetConfig(assetSymbol);
    const limits = getWithdrawalLimits(assetSymbol);
    if (amount < limits.minAmount) {
        throw new Error(`Withdrawal amount must be at least ${limits.minAmount} ${asset.symbol}`);
    }
    if (limits.maxAmount > 0 && amount > limits.maxAmount) {
        throw new Error(`Withdrawal amount must not exceed ${limits.maxAmount} ${asset.symbol} per transaction`);
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
        const normalizedWithdrawalAddress = String(lockedWallet.wallet_address || '').toLowerCase();
        const blacklist = getConfiguredList(`nbcWallet.withdrawal.blacklistedAddresses`).map((item)=>item.toLowerCase());
        const assetBlacklist = getConfiguredList(`nbcWallet.assets.${asset.symbol}.withdrawal.blacklistedAddresses`).map((item)=>item.toLowerCase());
        if (blacklist.includes(normalizedWithdrawalAddress) || assetBlacklist.includes(normalizedWithdrawalAddress)) {
            throw new Error('Withdrawal address is blocked');
        }
        // Daily cumulative limit check
        if (limits.dailyLimit > 0) {
            const todayResult = await connection.query(`SELECT COALESCE(SUM(amount), 0) AS daily_total
           FROM nbc_withdrawal
          WHERE customer_id = $1
            AND status NOT IN ('failed')
            AND asset_symbol = $2
            AND created_at >= CURRENT_DATE`, [
                input.customerId,
                asset.symbol
            ]);
            const dailyTotal = Number(todayResult.rows[0]?.daily_total || 0);
            if (dailyTotal + amount > limits.dailyLimit) {
                const remaining = Math.max(limits.dailyLimit - dailyTotal, 0);
                throw new Error(`Daily withdrawal limit of ${limits.dailyLimit} ${asset.symbol} exceeded. ` + `Remaining today: ${remaining} ${asset.symbol}`);
            }
        }
        if (limits.maxRequestsPerWindow > 0 && limits.frequencyWindowSeconds > 0) {
            const frequencyResult = await connection.query(`SELECT COUNT(*) AS request_count
           FROM nbc_withdrawal
          WHERE wallet_address = $1
            AND asset_symbol = $2
            AND status NOT IN ('failed')
            AND created_at >= NOW() - ($3 || ' seconds')::interval`, [
                lockedWallet.wallet_address,
                asset.symbol,
                limits.frequencyWindowSeconds.toString()
            ]);
            const requestCount = Number(frequencyResult.rows[0]?.request_count || 0);
            if (requestCount >= limits.maxRequestsPerWindow) {
                throw new Error('Withdrawal request frequency limit exceeded');
            }
        }
        const assetBalance = await ensureWalletAssetBalance(connection, lockedWallet, asset);
        const availableBalance = Number(assetBalance.balance) - Number(assetBalance.frozen_balance);
        if (availableBalance < amount) {
            throw new Error(`${asset.symbol} balance is insufficient for withdrawal`);
        }
        if (!asset.chainId || asset.assetType === 'erc20' && !asset.tokenAddress) {
            throw new Error('On-chain withdrawal configuration is incomplete');
        }
        const nextFrozenBalance = Number(assetBalance.frozen_balance) + amount;
        await connection.query(`UPDATE nbc_wallet_asset_balance
          SET frozen_balance = $1, updated_at = NOW()
        WHERE wallet_asset_id = $2`, [
            nextFrozenBalance,
            assetBalance.wallet_asset_id
        ]);
        if (asset.symbol === 'NBC') {
            await connection.query(`UPDATE nbc_wallet
            SET frozen_balance = $1, updated_at = NOW()
          WHERE wallet_id = $2`, [
                nextFrozenBalance,
                lockedWallet.wallet_id
            ]);
        }
        const withdrawal = await insert('nbc_withdrawal').given({
            wallet_id: lockedWallet.wallet_id,
            customer_id: lockedWallet.customer_id,
            wallet_address: lockedWallet.wallet_address,
            chain_id: asset.chainId,
            token_address: asset.tokenAddress,
            token_decimals: asset.tokenDecimals,
            asset_symbol: asset.symbol,
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
            assetSymbol: asset.symbol,
            walletAddress: lockedWallet.wallet_address,
            frozenBalance: nextFrozenBalance
        };
    } catch (error) {
        await rollback(connection);
        throw error;
    }
}
