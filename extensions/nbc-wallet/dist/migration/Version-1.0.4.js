import { execute } from '@evershop/postgres-query-builder';
export default async function migrate(connection) {
    await execute(connection, `ALTER TABLE nbc_wallet
       ADD COLUMN IF NOT EXISTS "deposit_address" varchar(128) DEFAULT NULL`);
    await execute(connection, `ALTER TABLE nbc_wallet
       ADD COLUMN IF NOT EXISTS "address_index" INT DEFAULT NULL`);
    await execute(connection, `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_NBC_WALLET_DEPOSIT_ADDRESS_UNIQUE"
       ON "nbc_wallet" ("deposit_address")
       WHERE "deposit_address" IS NOT NULL`);
    await execute(connection, `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_NBC_WALLET_ADDRESS_INDEX_UNIQUE"
       ON "nbc_wallet" ("address_index")
       WHERE "address_index" IS NOT NULL`);
}
//# sourceMappingURL=Version-1.0.4.js.map