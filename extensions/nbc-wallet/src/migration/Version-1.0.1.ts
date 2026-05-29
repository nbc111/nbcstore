import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `CREATE TABLE "nbc_withdrawal" (
      "withdrawal_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_id" INT NOT NULL,
      "customer_id" INT NOT NULL,
      "wallet_address" varchar(128) NOT NULL,
      "chain_id" INT NOT NULL,
      "token_address" varchar(128) NOT NULL,
      "amount" numeric(36,0) NOT NULL,
      "tx_hash" varchar(128) DEFAULT NULL,
      "wallet_tx_id" INT DEFAULT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'requested',
      "requested_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "processed_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "failed_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "error_message" text DEFAULT NULL,
      "metadata" jsonb DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WITHDRAWAL_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FK_NBC_WITHDRAWAL_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_WITHDRAWAL_CUSTOMER" FOREIGN KEY ("customer_id")
        REFERENCES "customer" ("customer_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_WITHDRAWAL_TX" FOREIGN KEY ("wallet_tx_id")
        REFERENCES "nbc_wallet_transaction" ("wallet_tx_id") ON DELETE SET NULL,
      CONSTRAINT "CHK_NBC_WITHDRAWAL_AMOUNT" CHECK ("amount" > 0)
    )`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_NBC_WITHDRAWAL_CUSTOMER_ID" ON "nbc_withdrawal" ("customer_id")`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_NBC_WITHDRAWAL_STATUS" ON "nbc_withdrawal" ("status")`
  );
}
