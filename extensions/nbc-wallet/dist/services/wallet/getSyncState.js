import { pool } from '@evershop/evershop/lib/postgres';
export async function getSyncState(key, defaultValue) {
    var _a;
    const result = await pool.query(`SELECT state_value FROM nbc_sync_state WHERE state_key = $1`, [key]);
    return ((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.state_value) || defaultValue;
}
//# sourceMappingURL=getSyncState.js.map