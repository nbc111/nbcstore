import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';

export async function getExchangeRate(rateKey = 'NBC_TO_CNY'): Promise<number> {
  const result = await pool.query(
    `SELECT rate_value FROM nbc_exchange_rate WHERE rate_key = $1 LIMIT 1`,
    [rateKey]
  );

  if (result.rows[0]?.rate_value !== undefined) {
    return Number(result.rows[0].rate_value);
  }

  return Number(getConfig('nbcWallet.exchangeRate.NBC_TO_CNY', 0.01));
}
