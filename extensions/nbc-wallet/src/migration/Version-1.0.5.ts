import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `ALTER TABLE nbc_wallet_auth_nonce
       ADD COLUMN IF NOT EXISTS "domain" varchar(255) NOT NULL DEFAULT 'localhost',
       ADD COLUMN IF NOT EXISTS "chain_id" INT NOT NULL DEFAULT 1281,
       ADD COLUMN IF NOT EXISTS "purpose" varchar(64) NOT NULL DEFAULT 'wallet_login'`
  );
}
