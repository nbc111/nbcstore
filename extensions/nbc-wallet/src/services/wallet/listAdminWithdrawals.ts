import { pool } from '@evershop/evershop/lib/postgres';

type ListAdminWithdrawalsInput = {
  status?: string;
  walletAddress?: string;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
};

const VALID_STATUSES = ['requested', 'approved', 'processing', 'completed', 'failed'];

export async function listAdminWithdrawals(input: ListAdminWithdrawalsInput = {}) {
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 100);
  const page = Math.max(Number(input.page) || 1, 1);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let idx = 1;

  if (input.status && VALID_STATUSES.includes(input.status)) {
    conditions.push(`w.status = $${idx++}`);
    params.push(input.status);
  }

  if (input.walletAddress) {
    conditions.push(`w.wallet_address = $${idx++}`);
    params.push(input.walletAddress.toLowerCase());
  }

  if (input.customerId) {
    conditions.push(`w.customer_id = $${idx++}`);
    params.push(Number(input.customerId));
  }

  if (input.dateFrom) {
    conditions.push(`w.created_at >= $${idx++}`);
    params.push(input.dateFrom);
  }

  if (input.dateTo) {
    conditions.push(`w.created_at <= $${idx++}`);
    params.push(input.dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT
          w.withdrawal_id, w.uuid, w.wallet_id, w.customer_id,
          w.wallet_address, w.chain_id, w.token_address,
          w.token_decimals, w.asset_symbol,
          w.amount, w.tx_hash, w.wallet_tx_id, w.status,
          w.requested_at, w.approved_at, w.approved_by,
          w.processing_at, w.processed_at, w.failed_at,
          w.error_message, w.metadata, w.created_at, w.updated_at,
          c.email AS customer_email
         FROM nbc_withdrawal w
    LEFT JOIN customer c ON c.customer_id = w.customer_id
       ${where}
      ORDER BY w.created_at DESC, w.withdrawal_id DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) AS total FROM nbc_withdrawal w ${where}`,
      params
    )
  ]);

  const total = Number(countResult.rows[0]?.total || 0);

  return {
    items: rowsResult.rows.map((row) => ({
      withdrawalId: row.withdrawal_id,
      uuid: row.uuid,
      walletId: row.wallet_id,
      customerId: row.customer_id,
      customerEmail: row.customer_email,
      walletAddress: row.wallet_address,
      chainId: row.chain_id,
      tokenAddress: row.token_address,
      tokenDecimals: Number(row.token_decimals || 18),
      assetSymbol: row.asset_symbol || 'NBC',
      amount: Number(row.amount),
      txHash: row.tx_hash,
      walletTxId: row.wallet_tx_id,
      status: row.status,
      requestedAt: row.requested_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      processingAt: row.processing_at,
      processedAt: row.processed_at,
      failedAt: row.failed_at,
      errorMessage: row.error_message,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}
