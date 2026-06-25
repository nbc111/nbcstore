import { pool } from '@evershop/evershop/lib/postgres';
export async function listWithdrawals(customerId, limit = 20) {
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const result = await pool.query(`SELECT withdrawal_id, uuid, wallet_id, customer_id, wallet_address,
            chain_id, token_address, amount, tx_hash, wallet_tx_id, status,
            requested_at, processed_at, failed_at, error_message, metadata,
            created_at, updated_at
       FROM nbc_withdrawal
      WHERE customer_id = $1
      ORDER BY created_at DESC, withdrawal_id DESC
      LIMIT $2`, [customerId, pageSize]);
    return result.rows.map((row) => ({
        withdrawalId: row.withdrawal_id,
        uuid: row.uuid,
        walletId: row.wallet_id,
        customerId: row.customer_id,
        walletAddress: row.wallet_address,
        chainId: row.chain_id,
        tokenAddress: row.token_address,
        amount: Number(row.amount),
        txHash: row.tx_hash,
        walletTxId: row.wallet_tx_id,
        status: row.status,
        requestedAt: row.requested_at,
        processedAt: row.processed_at,
        failedAt: row.failed_at,
        errorMessage: row.error_message,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}
//# sourceMappingURL=listWithdrawals.js.map