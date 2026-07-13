import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "nbc_wallet_asset_balance" (
      "wallet_asset_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_id" INT NOT NULL,
      "customer_id" INT NOT NULL,
      "asset_symbol" varchar(16) NOT NULL,
      "chain_id" INT NOT NULL,
      "token_address" varchar(128) NOT NULL,
      "token_decimals" INT NOT NULL DEFAULT 18,
      "balance" numeric(36,0) NOT NULL DEFAULT 0,
      "frozen_balance" numeric(36,0) NOT NULL DEFAULT 0,
      "status" smallint NOT NULL DEFAULT 1,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_ASSET_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_WALLET_ASSET_WALLET_SYMBOL_UNIQUE" UNIQUE ("wallet_id", "asset_symbol"),
      CONSTRAINT "FK_NBC_WALLET_ASSET_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_WALLET_ASSET_CUSTOMER" FOREIGN KEY ("customer_id")
        REFERENCES "customer" ("customer_id") ON DELETE CASCADE,
      CONSTRAINT "CHK_NBC_WALLET_ASSET_BALANCE" CHECK ("balance" >= 0),
      CONSTRAINT "CHK_NBC_WALLET_ASSET_FROZEN_BALANCE" CHECK ("frozen_balance" >= 0)
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_NBC_WALLET_ASSET_CUSTOMER"
      ON "nbc_wallet_asset_balance" ("customer_id", "asset_symbol")`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_wallet_transaction
       ADD COLUMN IF NOT EXISTS "asset_symbol" varchar(16) NOT NULL DEFAULT 'NBC'`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_wallet_transaction
       ADD COLUMN IF NOT EXISTS "token_address" varchar(128) NOT NULL DEFAULT 'native:NBC'`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_wallet_transaction
       ADD COLUMN IF NOT EXISTS "token_decimals" INT NOT NULL DEFAULT 18`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_withdrawal
       ADD COLUMN IF NOT EXISTS "asset_symbol" varchar(16) NOT NULL DEFAULT 'NBC'`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_withdrawal
       ADD COLUMN IF NOT EXISTS "token_decimals" INT NOT NULL DEFAULT 18`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_onchain_deposit
       ADD COLUMN IF NOT EXISTS "asset_symbol" varchar(16) NOT NULL DEFAULT 'NBC'`
  );

  await execute(
    connection,
    `ALTER TABLE nbc_onchain_deposit
       ADD COLUMN IF NOT EXISTS "token_decimals" INT NOT NULL DEFAULT 18`
  );

  await execute(
    connection,
    `INSERT INTO nbc_wallet_asset_balance (
        wallet_id,
        customer_id,
        asset_symbol,
        chain_id,
        token_address,
        token_decimals,
        balance,
        frozen_balance,
        status
      )
      SELECT
        wallet_id,
        customer_id,
        'NBC',
        COALESCE(chain_id, 0),
        'native:NBC',
        18,
        balance,
        frozen_balance,
        status
      FROM nbc_wallet
      ON CONFLICT ("wallet_id", "asset_symbol") DO NOTHING`
  );
}
