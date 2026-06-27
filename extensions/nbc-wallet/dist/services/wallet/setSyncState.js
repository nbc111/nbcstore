import { pool } from '@evershop/evershop/lib/postgres';
export async function setSyncState(key, value) {
    await pool.query(`INSERT INTO nbc_sync_state (state_key, state_value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET state_value = EXCLUDED.state_value, updated_at = NOW()`, [
        key,
        value
    ]);
}
