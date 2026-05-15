import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
export async function getOrderUsageByOrderId(orderId) {
    return await select().from('nbc_order_usage').where('order_id', '=', orderId).load(pool);
}
