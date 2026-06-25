import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "nbc_wallet_deposit_address" (
      "deposit_address_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_id" INT NOT NULL,
      "customer_id" INT NOT NULL,
      "deposit_address" varchar(128) NOT NULL,
      "address_index" INT NOT NULL,
      "chain_id" INT NOT NULL,
      "token_address" varchar(128) NOT NULL,
      "mode" varchar(16) NOT NULL DEFAULT 'hd',
      "status" smallint NOT NULL DEFAULT 1,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_DEPOSIT_ADDRESS_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_WALLET_DEPOSIT_ADDRESS_WALLET_UNIQUE" UNIQUE ("wallet_id"),
      CONSTRAINT "NBC_WALLET_DEPOSIT_ADDRESS_VALUE_UNIQUE" UNIQUE ("deposit_address"),
      CONSTRAINT "NBC_WALLET_DEPOSIT_ADDRESS_INDEX_UNIQUE" UNIQUE ("chain_id", "token_address", "address_index"),
      CONSTRAINT "FK_NBC_WALLET_DEPOSIT_ADDRESS_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_WALLET_DEPOSIT_ADDRESS_CUSTOMER" FOREIGN KEY ("customer_id")
        REFERENCES "customer" ("customer_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_NBC_WALLET_DEPOSIT_ADDRESS_CUSTOMER_ID"
      ON "nbc_wallet_deposit_address" ("customer_id")`
  );
}
