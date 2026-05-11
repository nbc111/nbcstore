import { pool } from '@evershop/evershop/lib/postgres';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function listWalletTransactions(
  customerId: number,
  options: { page?: number; limit?: number; transactionType?: string } = {}
) {
  const page = Math.max(Number(options.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(options.limit) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const offset = (page - 1) * limit;
  const params: Array<number | string> = [customerId];
  const filters = ['w.customer_id = $1'];

  if (options.transactionType) {
    params.push(options.transactionType);
    filters.push(`t.transaction_type = $${params.length}`);
  }

  const whereClause = filters.join(' AND ');
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM nbc_wallet_transaction t
       INNER JOIN nbc_wallet w ON w.wallet_id = t.wallet_id
      WHERE ${whereClause}`,
    params
  );

  params.push(limit, offset);
  const rowsResult = await pool.query(
    `SELECT t.wallet_tx_id, t.uuid, t.wallet_id, t.order_id,
            o.uuid AS order_uuid, o.order_number,
            t.transaction_type, t.amount, t.balance_before, t.balance_after,
            t.exchange_rate, t.cny_amount, t.reference, t.status, t.metadata,
            t.created_at
       FROM nbc_wallet_transaction t
       INNER JOIN nbc_wallet w ON w.wallet_id = t.wallet_id
       LEFT JOIN "order" o ON o.order_id = t.order_id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC, t.wallet_tx_id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    items: rowsResult.rows.map((row) => ({
      walletTxId: row.wallet_tx_id,
      uuid: row.uuid,
      walletId: row.wallet_id,
      orderId: row.order_id,
      orderUuid: row.order_uuid,
      orderNumber: row.order_number,
      transactionType: row.transaction_type,
      amount: Number(row.amount),
      balanceBefore: Number(row.balance_before),
      balanceAfter: Number(row.balance_after),
      exchangeRate:
        row.exchange_rate === null ? null : Number(row.exchange_rate),
      cnyAmount: row.cny_amount === null ? null : Number(row.cny_amount),
      reference: row.reference,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.created_at
    })),
    currentPage: page,
    pageSize: limit,
    total: Number(countResult.rows[0]?.total || 0)
  };
}
