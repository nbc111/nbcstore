import { pool } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export async function getWalletCustomerByAddress(walletAddress) {
    var _a;
    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const result = await pool.query(`SELECT w.*, c.customer_id, c.uuid AS customer_uuid, c.group_id, c.email, c.full_name,
            c.status AS customer_status, c.created_at AS customer_created_at, c.updated_at AS customer_updated_at
       FROM nbc_wallet w
       INNER JOIN customer c ON c.customer_id = w.customer_id
      WHERE w.wallet_address = $1
      LIMIT 1`, [normalizedAddress]);
    return (_a = result.rows[0]) !== null && _a !== void 0 ? _a : null;
}
//# sourceMappingURL=getWalletCustomerByAddress.js.map