import { pool } from '@evershop/evershop/lib/postgres';

export async function getSyncState<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  const result = await pool.query(
    `SELECT state_value FROM nbc_sync_state WHERE state_key = $1`,
    [key]
  );

  return result.rows[0]?.state_value || defaultValue;
}
