import { execute } from '@evershop/postgres-query-builder';
export default async function migrate(connection) {
    await execute(connection, `ALTER TABLE nbc_withdrawal
       ADD COLUMN IF NOT EXISTS "approved_at"   TIMESTAMP WITH TIME ZONE DEFAULT NULL,
       ADD COLUMN IF NOT EXISTS "approved_by"   TEXT DEFAULT NULL,
       ADD COLUMN IF NOT EXISTS "processing_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL`);
    await execute(connection, `CREATE INDEX IF NOT EXISTS "IDX_NBC_WITHDRAWAL_WALLET_ID"
       ON "nbc_withdrawal" ("wallet_id")`);
    await execute(connection, `CREATE TABLE IF NOT EXISTS "nbc_wallet_audit_log" (
      "log_id"      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid"        UUID NOT NULL DEFAULT gen_random_uuid(),
      "entity_type" varchar(32)  NOT NULL,
      "entity_id"   INT          NOT NULL,
      "action"      varchar(64)  NOT NULL,
      "performed_by" TEXT        DEFAULT NULL,
      "metadata"    jsonb        DEFAULT NULL,
      "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_AUDIT_LOG_UUID_UNIQUE" UNIQUE ("uuid")
    )`);
    await execute(connection, `CREATE INDEX IF NOT EXISTS "IDX_NBC_AUDIT_ENTITY"
       ON "nbc_wallet_audit_log" ("entity_type", "entity_id")`);
}
//# sourceMappingURL=Version-1.0.2.js.map