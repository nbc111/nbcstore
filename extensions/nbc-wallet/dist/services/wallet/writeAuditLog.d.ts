type AuditLogInput = {
    entityType: 'withdrawal' | 'deposit' | 'wallet' | 'adjustment';
    entityId: number;
    action: string;
    performedBy?: string;
    metadata?: Record<string, unknown>;
};
/**
 * Append an immutable record to `nbc_wallet_audit_log`.
 * Failures are swallowed — audit logging must never break the happy path.
 */
export declare function writeAuditLog(input: AuditLogInput): Promise<void>;
export {};
