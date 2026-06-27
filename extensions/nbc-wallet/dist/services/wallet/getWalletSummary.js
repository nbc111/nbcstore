import { pool } from '@evershop/evershop/lib/postgres';
import { getExchangeRate } from './getExchangeRate.js';
function roundAmount(value, digits = 8) {
    return Number(value.toFixed(digits));
}
export async function getWalletSummary(customerId) {
    const result = await pool.query(`SELECT wallet_id, uuid, customer_id, wallet_address, deposit_address,
            address_index, chain_id, balance,
            frozen_balance, status, last_login_at, created_at, updated_at
       FROM nbc_wallet
      WHERE customer_id = $1`, [
        customerId
    ]);
    const wallet = result.rows[0];
    if (!wallet) {
        return null;
    }
    const fractionalDeltaResult = await pool.query(`SELECT COALESCE(
              SUM(
                (d.amount::numeric / POWER(10::numeric, 18))
                - t.amount::numeric
              ),
              0
            ) AS fractional_delta
       FROM nbc_onchain_deposit d
       INNER JOIN nbc_wallet_transaction t ON t.wallet_tx_id = d.wallet_tx_id
      WHERE d.wallet_id = $1
        AND d.status = 'completed'
        AND t.transaction_type = 'onchain_deposit'`, [
        wallet.wallet_id
    ]);
    const balance = roundAmount(Number(wallet.balance) + Number(fractionalDeltaResult.rows[0]?.fractional_delta || 0));
    const frozenBalance = Number(wallet.frozen_balance);
    const availableBalance = roundAmount(balance - frozenBalance);
    const exchangeRate = await getExchangeRate();
    return {
        walletId: wallet.wallet_id,
        uuid: wallet.uuid,
        customerId: wallet.customer_id,
        walletAddress: wallet.wallet_address,
        depositAddress: wallet.deposit_address || null,
        addressIndex: wallet.address_index === null ? null : Number(wallet.address_index),
        chainId: wallet.chain_id,
        balance,
        frozenBalance,
        availableBalance,
        currency: 'NBC',
        status: wallet.status,
        exchangeRate,
        cnyValue: roundAmount(balance * exchangeRate),
        availableCnyValue: roundAmount(availableBalance * exchangeRate),
        lastLoginAt: wallet.last_login_at,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
    };
}
