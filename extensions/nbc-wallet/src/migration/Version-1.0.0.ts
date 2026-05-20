import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `CREATE TABLE "nbc_wallet" (
      "wallet_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "customer_id" INT NOT NULL,
      "wallet_address" varchar(128) NOT NULL,
      "chain_id" INT DEFAULT NULL,
      "balance" numeric(36,0) NOT NULL DEFAULT 0,
      "frozen_balance" numeric(36,0) NOT NULL DEFAULT 0,
      "status" smallint NOT NULL DEFAULT 1,
      "last_login_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_WALLET_CUSTOMER_ID_UNIQUE" UNIQUE ("customer_id"),
      CONSTRAINT "NBC_WALLET_ADDRESS_UNIQUE" UNIQUE ("wallet_address"),
      CONSTRAINT "FK_NBC_WALLET_CUSTOMER" FOREIGN KEY ("customer_id")
        REFERENCES "customer" ("customer_id") ON DELETE CASCADE,
      CONSTRAINT "CHK_NBC_WALLET_BALANCE" CHECK ("balance" >= 0),
      CONSTRAINT "CHK_NBC_WALLET_FROZEN_BALANCE" CHECK ("frozen_balance" >= 0)
    )`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_NBC_WALLET_CUSTOMER_ID" ON "nbc_wallet" ("customer_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "nbc_wallet_transaction" (
      "wallet_tx_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_id" INT NOT NULL,
      "order_id" INT DEFAULT NULL,
      "transaction_type" varchar(32) NOT NULL,
      "amount" numeric(36,0) NOT NULL,
      "balance_before" numeric(36,0) NOT NULL,
      "balance_after" numeric(36,0) NOT NULL,
      "exchange_rate" numeric(20,8) DEFAULT NULL,
      "cny_amount" decimal(12,4) DEFAULT NULL,
      "reference" varchar(128) DEFAULT NULL,
      "status" varchar(32) NOT NULL,
      "metadata" jsonb DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_TX_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FK_NBC_WALLET_TX_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_WALLET_TX_ORDER" FOREIGN KEY ("order_id")
        REFERENCES "order" ("order_id") ON DELETE SET NULL
    )`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_NBC_WALLET_TX_WALLET_ID" ON "nbc_wallet_transaction" ("wallet_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "IDX_NBC_WALLET_TX_ORDER_ID" ON "nbc_wallet_transaction" ("order_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "nbc_order_usage" (
      "usage_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "order_id" INT NOT NULL,
      "wallet_id" INT NOT NULL,
      "nbc_amount" numeric(36,0) NOT NULL,
      "exchange_rate" numeric(20,8) NOT NULL,
      "cny_amount" decimal(12,4) NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_ORDER_USAGE_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_ORDER_USAGE_ORDER_UNIQUE" UNIQUE ("order_id"),
      CONSTRAINT "FK_NBC_ORDER_USAGE_ORDER" FOREIGN KEY ("order_id")
        REFERENCES "order" ("order_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_ORDER_USAGE_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE TABLE "nbc_exchange_rate" (
      "rate_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "rate_key" varchar(64) NOT NULL,
      "rate_value" numeric(20,8) NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_EXCHANGE_RATE_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_EXCHANGE_RATE_KEY_UNIQUE" UNIQUE ("rate_key")
    )`
  );

  await execute(
    connection,
    `INSERT INTO "nbc_exchange_rate" ("rate_key", "rate_value")
      VALUES ('NBC_TO_USD', 0.01)`
  );

  await execute(
    connection,
    `CREATE TABLE "nbc_wallet_auth_nonce" (
      "nonce_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_address" varchar(128) NOT NULL,
      "nonce" varchar(128) NOT NULL,
      "message" text NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "used_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_AUTH_NONCE_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_WALLET_AUTH_NONCE_WALLET_UNIQUE" UNIQUE ("wallet_address")
    )`
  );

  await execute(
    connection,
    `CREATE TABLE "nbc_onchain_deposit" (
      "deposit_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_id" INT DEFAULT NULL,
      "wallet_address" varchar(128) NOT NULL,
      "chain_id" INT NOT NULL,
      "token_address" varchar(128) NOT NULL,
      "tx_hash" varchar(128) NOT NULL,
      "log_index" INT NOT NULL,
      "block_number" INT NOT NULL,
      "amount" numeric(36,0) NOT NULL,
      "wallet_tx_id" INT DEFAULT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'pending',
      "error_message" text DEFAULT NULL,
      "metadata" jsonb DEFAULT NULL,
      "processed_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_ONCHAIN_DEPOSIT_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_ONCHAIN_DEPOSIT_EVENT_UNIQUE" UNIQUE ("chain_id", "tx_hash", "log_index"),
      CONSTRAINT "FK_NBC_ONCHAIN_DEPOSIT_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE SET NULL,
      CONSTRAINT "FK_NBC_ONCHAIN_DEPOSIT_TX" FOREIGN KEY ("wallet_tx_id")
        REFERENCES "nbc_wallet_transaction" ("wallet_tx_id") ON DELETE SET NULL
    )`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_NBC_ONCHAIN_DEPOSIT_STATUS" ON "nbc_onchain_deposit" ("status")`
  );
  await execute(
    connection,
    `CREATE INDEX "IDX_NBC_ONCHAIN_DEPOSIT_WALLET" ON "nbc_onchain_deposit" ("wallet_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "nbc_sync_state" (
      "state_key" varchar(128) PRIMARY KEY,
      "state_value" jsonb NOT NULL,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  );
}
