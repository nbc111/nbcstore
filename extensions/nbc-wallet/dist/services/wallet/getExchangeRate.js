import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { fetchNbcMarketBuyPrice } from './fetchNbcMarketBuyPrice.js';
import { getNbcToFiatRateKey } from './getNbcToFiatRateKey.js';
async function getConfiguredExchangeRate(rateKey) {
    var _a;
    const result = await pool.query(`SELECT rate_value FROM nbc_exchange_rate WHERE rate_key = $1 LIMIT 1`, [rateKey]);
    if (((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.rate_value) !== undefined) {
        return Number(result.rows[0].rate_value);
    }
    const legacyCny = Number(getConfig('nbcWallet.exchangeRate.NBC_TO_CNY', 0));
    return Number(getConfig(`nbcWallet.exchangeRate.${rateKey}`, legacyCny || 0.01));
}
export async function getExchangeRate(rateKey) {
    const key = rateKey || getNbcToFiatRateKey();
    try {
        const marketPrice = await fetchNbcMarketBuyPrice();
        if (marketPrice !== null) {
            return marketPrice;
        }
    }
    catch (error) {
        console.warn('[nbc-wallet] Failed to fetch NBC market price, using configured rate:', error instanceof Error ? error.message : error);
    }
    return getConfiguredExchangeRate(key);
}
//# sourceMappingURL=getExchangeRate.js.map