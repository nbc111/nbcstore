import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';

export async function getOrderByUuid(orderUuid: string) {
  return await select()
    .from('order')
    .where('uuid', '=', orderUuid)
    .load(pool);
}
