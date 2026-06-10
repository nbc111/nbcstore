import { pool } from '@evershop/evershop/lib/postgres';
const VALID_TYPES = [
    'debit', 'onchain_deposit', 'withdrawal', 'refund',
    'admin_credit', 'admin_debit'
];
export async function listAdminTransactions(input = {}) {
    var _a;
    const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 100);
    const page = Math.max(Number(input.page) || 1, 1);
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
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
        pool.query(`SELECT
          t.wallet_tx_id, t.uuid, t.wallet_id, t.order_id,
          o.uuid AS order_uuid, o.order_number,
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
        LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
        pool.query(`SELECT COUNT(*) AS total
         FROM nbc_wallet_transaction t
         JOIN nbc_wallet w ON w.wallet_id = t.wallet_id
       ${where}`, params)
    ]);
    const total = Number(((_a = countResult.rows[0]) === null || _a === void 0 ? void 0 : _a.total) || 0);
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
//# sourceMappingURL=listAdminTransactions.js.map