import { pool } from '@evershop/evershop/lib/postgres';
/**
 * Append an immutable record to `nbc_wallet_audit_log`.
 * Failures are swallowed — audit logging must never break the happy path.
 */
export async function writeAuditLog(input) {
    try {
        await pool.query(`INSERT INTO nbc_wallet_audit_log
         (entity_type, entity_id, action, performed_by, metadata)
       VALUES ($1, $2, $3, $4, $5)`, [
            input.entityType,
            input.entityId,
            input.action,
            input.performedBy || null,
            input.metadata ? JSON.stringify(input.metadata) : null
        ]);
    }
    catch (_err) {
        // Intentionally silent
    }
}
//# sourceMappingURL=writeAuditLog.js.map