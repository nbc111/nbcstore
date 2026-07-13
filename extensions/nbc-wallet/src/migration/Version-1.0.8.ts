import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `ALTER TABLE nbc_order_usage
       ADD COLUMN IF NOT EXISTS "asset_symbol" varchar(16) NOT NULL DEFAULT 'NBC'`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_order_usage
       ADD COLUMN IF NOT EXISTS "token_address" varchar(128) NOT NULL DEFAULT 'native:NBC'`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_order_usage
       ADD COLUMN IF NOT EXISTS "token_decimals" INT NOT NULL DEFAULT 18`
  );
}
