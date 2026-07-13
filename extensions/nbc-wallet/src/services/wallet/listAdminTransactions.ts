import { pool } from '@evershop/evershop/lib/postgres';

const VALID_TYPES = [
  'debit', 'onchain_deposit', 'withdrawal', 'refund',
  'admin_credit', 'admin_debit'
];
const VALID_ASSET_SYMBOLS = ['NBC', 'USDT'];

type ListAdminTransactionsInput = {
  walletId?: number;
  customerId?: number;
  walletAddress?: string;
  transactionType?: string;
  assetSymbol?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
};

export async function listAdminTransactions(input: ListAdminTransactionsInput = {}) {
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 100);
  const page = Math.max(Number(input.page) || 1, 1);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let idx = 1;

  if (input.walletId) {
    conditions.push(`t.wallet_id = $${idx++}`);
    params.push(Number(input.walletId));
  }

  if (input.customerId) {
    conditions.push(`w.customer_id = $${idx++}`);
    params.push(Number(input.customerId));
  }

  if (input.walletAddress) {
    conditions.push(`w.wallet_address = $${idx++}`);
    params.push(String(input.walletAddress).toLowerCase());
  }

  if (input.transactionType && VALID_TYPES.includes(input.transactionType)) {
    conditions.push(`t.transaction_type = $${idx++}`);
    params.push(input.transactionType);
  }

  if (input.assetSymbol) {
    const assetSymbol = String(input.assetSymbol).trim().toUpperCase();
    if (VALID_ASSET_SYMBOLS.includes(assetSymbol)) {
      conditions.push(`COALESCE(t.asset_symbol, 'NBC') = $${idx++}`);
      params.push(assetSymbol);
    }
  }

  if (input.dateFrom) {
    conditions.push(`t.created_at >= $${idx++}`);
    params.push(input.dateFrom);
  }

  if (input.dateTo) {
    conditions.push(`t.created_at <= $${idx++}`);
    params.push(input.dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT
          t.wallet_tx_id, t.uuid, t.wallet_id, t.order_id,
          o.uuid AS order_uuid, o.order_number,
          t.asset_symbol, t.token_address, t.token_decimals,
          t.transaction_type, t.amount,
          t.balance_before, t.balance_after,
          t.exchange_rate, t.cny_amount,
          t.reference, t.status, t.metadata, t.created_at,
          w.wallet_address, w.customer_id,
          c.email AS customer_email
         FROM nbc_wallet_transaction t
         JOIN nbc_wallet w ON w.wallet_id = t.wallet_id
    LEFT JOIN "order" o ON o.order_id = t.order_id
    LEFT JOIN customer c ON c.customer_id = w.customer_id
       ${where}
      ORDER BY t.created_at DESC, t.wallet_tx_id DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) AS total
         FROM nbc_wallet_transaction t
         JOIN nbc_wallet w ON w.wallet_id = t.wallet_id
       ${where}`,
      params
    )
  ]);

  const total = Number(countResult.rows[0]?.total || 0);

  return {
    items: rowsResult.rows.map((row) => ({
      walletTxId: row.wallet_tx_id,
      uuid: row.uuid,
      walletId: row.wallet_id,
      walletAddress: row.wallet_address,
      customerId: row.customer_id,
      customerEmail: row.customer_email,
      orderId: row.order_id,
      orderUuid: row.order_uuid,
      orderNumber: row.order_number,
      assetSymbol: row.asset_symbol || 'NBC',
      tokenAddress: row.token_address || 'native:NBC',
      tokenDecimals: Number(row.token_decimals || 18),
      transactionType: row.transaction_type,
      amount: Number(row.amount),
      balanceBefore: Number(row.balance_before),
      balanceAfter: Number(row.balance_after),
      exchangeRate: row.exchange_rate === null ? null : Number(row.exchange_rate),
      cnyAmount: row.cny_amount === null ? null : Number(row.cny_amount),
      reference: row.reference,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.created_at
    })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
  };
}
