import { pool } from '@evershop/evershop/lib/postgres';

export async function getOrderUsageByOrderId(orderId: number) {
  const result = await pool.query(
    `SELECT u.*,
            t.wallet_tx_id AS transaction_wallet_tx_id,
            t.balance_before,
            t.balance_after,
            t.status AS transaction_status
       FROM nbc_order_usage u
       LEFT JOIN nbc_wallet_transaction t
         ON t.wallet_tx_id = u.wallet_tx_id
         OR (
           u.wallet_tx_id IS NULL
           AND t.order_id = u.order_id
           AND t.wallet_id = u.wallet_id
           AND t.transaction_type = 'debit'
         )
      WHERE u.order_id = $1
      ORDER BY t.wallet_tx_id DESC NULLS LAST
      LIMIT 1`,
    [orderId]
  );

  return result.rows[0] || null;
}
