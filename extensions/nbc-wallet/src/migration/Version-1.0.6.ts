import { execute } from '@evershop/postgres-query-builder';

export default async function migrate(connection) {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "nbc_wallet_user_profile" (
      "profile_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_id" INT NOT NULL,
      "customer_id" INT NOT NULL,
      "email" varchar(255) DEFAULT NULL,
      "email_verified_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "deposit_notifications_enabled" smallint NOT NULL DEFAULT 1,
      "withdrawal_notifications_enabled" smallint NOT NULL DEFAULT 1,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_USER_PROFILE_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "NBC_WALLET_USER_PROFILE_WALLET_UNIQUE" UNIQUE ("wallet_id"),
      CONSTRAINT "FK_NBC_WALLET_USER_PROFILE_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_WALLET_USER_PROFILE_CUSTOMER" FOREIGN KEY ("customer_id")
        REFERENCES "customer" ("customer_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_NBC_WALLET_USER_PROFILE_CUSTOMER"
      ON "nbc_wallet_user_profile" ("customer_id")`
  );

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "nbc_wallet_notification_queue" (
      "notification_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "wallet_id" INT NOT NULL,
      "customer_id" INT NOT NULL,
      "email" varchar(255) DEFAULT NULL,
      "notification_type" varchar(32) NOT NULL,
      "asset_symbol" varchar(16) NOT NULL DEFAULT 'NBC',
      "amount" numeric(36,8) DEFAULT NULL,
      "reference" varchar(128) DEFAULT NULL,
      "payload" jsonb DEFAULT NULL,
      "status" varchar(24) NOT NULL DEFAULT 'pending',
      "batch_key" varchar(128) DEFAULT NULL,
      "sent_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "error_message" text DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NBC_WALLET_NOTIFICATION_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FK_NBC_WALLET_NOTIFICATION_WALLET" FOREIGN KEY ("wallet_id")
        REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE,
      CONSTRAINT "FK_NBC_WALLET_NOTIFICATION_CUSTOMER" FOREIGN KEY ("customer_id")
        REFERENCES "customer" ("customer_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_NBC_WALLET_NOTIFICATION_PENDING"
      ON "nbc_wallet_notification_queue" ("status", "customer_id", "created_at")`
  );
}
