import { pool } from '@evershop/evershop/lib/postgres';
import { getAssetExchangeRate, getExchangeRate } from './getExchangeRate.js';
import { getWalletAssetConfigs } from './assets.js';
function roundAmount(value, digits = 8) {
    return Number(value.toFixed(digits));
}
export async function getWalletSummary(customerId) {
    var _a;
    const result = await pool.query(`SELECT wallet_id, uuid, customer_id, wallet_address, deposit_address,
            address_index, chain_id, balance,
            frozen_balance, status, last_login_at, created_at, updated_at
       FROM nbc_wallet
      WHERE customer_id = $1`, [customerId]);
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
        AND COALESCE(d.asset_symbol, t.asset_symbol, 'NBC') = 'NBC'
        AND d.status = 'completed'
        AND t.transaction_type = 'onchain_deposit'
        AND COALESCE(t.asset_symbol, 'NBC') = 'NBC'`, [wallet.wallet_id]);
    const balance = roundAmount(Number(wallet.balance) + Number(((_a = fractionalDeltaResult.rows[0]) === null || _a === void 0 ? void 0 : _a.fractional_delta) || 0));
    const frozenBalance = Number(wallet.frozen_balance);
    const availableBalance = roundAmount(balance - frozenBalance);
    const exchangeRate = await getExchangeRate();
    const assetRows = await pool.query(`SELECT asset_symbol, chain_id, token_address, token_decimals,
            balance, frozen_balance, status, updated_at
       FROM nbc_wallet_asset_balance
      WHERE wallet_id = $1`, [wallet.wallet_id]);
    const assets = await Promise.all(getWalletAssetConfigs().map(async (asset) => {
        var _a;
        const row = assetRows.rows.find((item) => String(item.asset_symbol).toUpperCase() === asset.symbol);
        const rawBalance = asset.symbol === 'NBC' ? balance : Number((row === null || row === void 0 ? void 0 : row.balance) || 0);
        const rawFrozen = asset.symbol === 'NBC' ? frozenBalance : Number((row === null || row === void 0 ? void 0 : row.frozen_balance) || 0);
        const available = roundAmount(rawBalance - rawFrozen);
        return {
            symbol: asset.symbol,
            displayName: asset.displayName,
            chainId: asset.chainId,
            tokenAddress: asset.tokenAddress,
            tokenDecimals: asset.tokenDecimals,
            exchangeRate: await getAssetExchangeRate(asset.symbol),
            balance: roundAmount(rawBalance),
            frozenBalance: rawFrozen,
            availableBalance: available,
            status: (_a = row === null || row === void 0 ? void 0 : row.status) !== null && _a !== void 0 ? _a : 1,
            updatedAt: (row === null || row === void 0 ? void 0 : row.updated_at) || null
        };
    }));
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
        assets,
        lastLoginAt: wallet.last_login_at,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
    };
}
//# sourceMappingURL=getWalletSummary.js.map