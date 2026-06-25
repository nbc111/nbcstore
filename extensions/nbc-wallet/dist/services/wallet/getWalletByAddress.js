import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export async function getWalletByAddress(walletAddress) {
    return await select()
        .from('nbc_wallet')
        .where('wallet_address', '=', normalizeWalletAddress(walletAddress))
        .load(pool);
}
//# sourceMappingURL=getWalletByAddress.js.map