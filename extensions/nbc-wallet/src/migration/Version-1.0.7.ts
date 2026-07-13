import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `ALTER TABLE nbc_wallet_auth_nonce
       ADD COLUMN IF NOT EXISTS "domain" varchar(255) NOT NULL DEFAULT '',
       ADD COLUMN IF NOT EXISTS "chain_id" INT NOT NULL DEFAULT 0,
       ADD COLUMN IF NOT EXISTS "purpose" varchar(64) NOT NULL DEFAULT 'wallet_login'`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_NBC_WALLET_AUTH_NONCE_CONTEXT"
       ON "nbc_wallet_auth_nonce" ("wallet_address", "nonce", "domain", "chain_id", "purpose")`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_withdrawal
       ADD COLUMN IF NOT EXISTS "processed_by" TEXT DEFAULT NULL`
  );
}
