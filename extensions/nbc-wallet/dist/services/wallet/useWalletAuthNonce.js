import { pool } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export async function useWalletAuthNonce(walletAddress, nonce) {
    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const result = await pool.query(`UPDATE nbc_wallet_auth_nonce
        SET used_at = NOW(),
            updated_at = NOW()
      WHERE wallet_address = $1
        AND nonce = $2
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING *`, [
        normalizedAddress,
        nonce
    ]);
    return result.rows[0] ?? null;
}
