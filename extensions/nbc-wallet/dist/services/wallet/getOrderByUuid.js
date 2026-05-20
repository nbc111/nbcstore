import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
export async function getOrderByUuid(orderUuid) {
    return await select()
        .from('order')
        .where('uuid', '=', orderUuid)
        .load(pool);
}
//# sourceMappingURL=getOrderByUuid.js.map