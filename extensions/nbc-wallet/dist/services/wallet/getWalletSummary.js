import { pool } from '@evershop/evershop/lib/postgres';
import { getExchangeRate } from './getExchangeRate.js';
export async function getWalletSummary(customerId) {
    const result = await pool.query(`SELECT wallet_id, uuid, customer_id, wallet_address, chain_id, balance,
            frozen_balance, status, last_login_at, created_at, updated_at
       FROM nbc_wallet
      WHERE customer_id = $1`, [
        customerId
    ]);
    const wallet = result.rows[0];
    if (!wallet) {
        return null;
    }
    const balance = Number(wallet.balance);
    const frozenBalance = Number(wallet.frozen_balance);
    const exchangeRate = await getExchangeRate();
    return {
        walletId: wallet.wallet_id,
        uuid: wallet.uuid,
        customerId: wallet.customer_id,
        walletAddress: wallet.wallet_address,
        chainId: wallet.chain_id,
        balance,
        frozenBalance,
        availableBalance: balance - frozenBalance,
        currency: 'NBC',
        status: wallet.status,
        exchangeRate,
        cnyValue: balance * exchangeRate,
        availableCnyValue: (balance - frozenBalance) * exchangeRate,
        lastLoginAt: wallet.last_login_at,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
    };
}
