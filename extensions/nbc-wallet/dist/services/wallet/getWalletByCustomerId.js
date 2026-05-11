import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
export async function getWalletByCustomerId(customerId) {
    return await select()
        .from('nbc_wallet')
        .where('customer_id', '=', customerId)
        .load(pool);
}
//# sourceMappingURL=getWalletByCustomerId.js.map