import { pool } from '@evershop/evershop/lib/postgres';
export async function getRefundTransactionByOrderId(orderId) {
    const result = await pool.query(`SELECT *
       FROM nbc_wallet_transaction
      WHERE order_id = $1
        AND transaction_type = 'refund'
        AND status = 'completed'
      ORDER BY wallet_tx_id DESC
      LIMIT 1`, [
        orderId
    ]);
    return result.rows[0] || null;
}
