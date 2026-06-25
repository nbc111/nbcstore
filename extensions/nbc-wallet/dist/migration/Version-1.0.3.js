import { execute } from '@evershop/postgres-query-builder';
export default async function migrate(connection) {
    await execute(connection, `ALTER TABLE nbc_order_usage
       ADD COLUMN IF NOT EXISTS "wallet_tx_id" INT DEFAULT NULL`);
    await execute(connection, `UPDATE nbc_order_usage u
        SET wallet_tx_id = t.wallet_tx_id
       FROM nbc_wallet_transaction t
      WHERE u.wallet_tx_id IS NULL
        AND t.order_id = u.order_id
        AND t.wallet_id = u.wallet_id
        AND t.transaction_type = 'debit'
        AND t.status = 'completed'`);
    await execute(connection, `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
           FROM pg_constraint
          WHERE conname = 'FK_NBC_ORDER_USAGE_WALLET_TX'
       ) THEN
         ALTER TABLE nbc_order_usage
           ADD CONSTRAINT "FK_NBC_ORDER_USAGE_WALLET_TX"
           FOREIGN KEY ("wallet_tx_id")
           REFERENCES "nbc_wallet_transaction" ("wallet_tx_id")
           ON DELETE SET NULL;
       END IF;
     END $$`);
    await execute(connection, `CREATE INDEX IF NOT EXISTS "IDX_NBC_ORDER_USAGE_WALLET_TX_ID"
       ON "nbc_order_usage" ("wallet_tx_id")`);
}
