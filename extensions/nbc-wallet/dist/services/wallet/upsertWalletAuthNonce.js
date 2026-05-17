import { pool } from '@evershop/evershop/lib/postgres';
import { buildWalletAuthMessage } from '../auth/buildWalletAuthMessage.js';
import { generateAuthNonce } from '../auth/generateAuthNonce.js';
import { getAuthConfig } from '../auth/getAuthConfig.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export async function upsertWalletAuthNonce(walletAddress) {
    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const { nonceTtlSeconds, messagePrefix } = getAuthConfig();
    const nonce = generateAuthNonce();
    const message = buildWalletAuthMessage(messagePrefix, nonce);
    const result = await pool.query(`INSERT INTO nbc_wallet_auth_nonce
      (wallet_address, nonce, message, expires_at, used_at, updated_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval, NULL, NOW())
     ON CONFLICT (wallet_address)
     DO UPDATE SET
       nonce = EXCLUDED.nonce,
       message = EXCLUDED.message,
       expires_at = EXCLUDED.expires_at,
       used_at = NULL,
       updated_at = NOW()
     RETURNING wallet_address, nonce, message, expires_at`, [
        normalizedAddress,
        nonce,
        message,
        nonceTtlSeconds.toString()
    ]);
    return result.rows[0];
}
