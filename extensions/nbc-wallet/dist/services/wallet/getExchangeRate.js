import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
export async function getExchangeRate(rateKey = 'NBC_TO_CNY') {
    var _a;
    const result = await pool.query(`SELECT rate_value FROM nbc_exchange_rate WHERE rate_key = $1 LIMIT 1`, [rateKey]);
    if (((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.rate_value) !== undefined) {
        return Number(result.rows[0].rate_value);
    }
    return Number(getConfig('nbcWallet.exchangeRate.NBC_TO_CNY', 0.01));
}
//# sourceMappingURL=getExchangeRate.js.map