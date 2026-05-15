import { pool } from '@evershop/evershop/lib/postgres';
import { settleOnchainDeposit } from './settleOnchainDeposit.js';
export async function reconcileWalletLedger(limit = 100) {
    const result = await pool.query(`SELECT deposit_id
       FROM nbc_onchain_deposit
      WHERE status IN ('pending', 'failed', 'unmatched')
      ORDER BY created_at ASC, deposit_id ASC
      LIMIT $1`, [
        Math.max(Number(limit) || 100, 1)
    ]);
    let completed = 0;
    let unmatched = 0;
    let failed = 0;
    for (const row of result.rows){
        try {
            const settlement = await settleOnchainDeposit(Number(row.deposit_id));
            if (settlement.status === 'completed') {
                completed += 1;
            } else if (settlement.status === 'unmatched') {
                unmatched += 1;
            }
        } catch (error) {
            failed += 1;
            await pool.query(`UPDATE nbc_onchain_deposit
            SET status = 'failed',
                error_message = $1,
                updated_at = NOW()
          WHERE deposit_id = $2`, [
                error instanceof Error ? error.message : String(error),
                row.deposit_id
            ]);
        }
    }
    return {
        scanned: result.rows.length,
        completed,
        unmatched,
        failed
    };
}
