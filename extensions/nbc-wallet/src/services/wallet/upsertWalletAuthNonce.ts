import { pool } from '@evershop/evershop/lib/postgres';
import { buildWalletAuthMessage } from '../auth/buildWalletAuthMessage.js';
import { generateAuthNonce } from '../auth/generateAuthNonce.js';
import { getAuthConfig } from '../auth/getAuthConfig.js';
import { getOnchainConfig } from './getOnchainConfig.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

type WalletAuthNonceContext = {
  domain: string;
  chainId?: number;
  purpose?: string;
};

export async function upsertWalletAuthNonce(
  walletAddress: string,
  context: WalletAuthNonceContext
) {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  const { nonceTtlSeconds, messagePrefix } = getAuthConfig();
  const nonce = generateAuthNonce();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + nonceTtlSeconds * 1000);
  const chainId = Number(context.chainId || getOnchainConfig().chainId);
  const purpose = context.purpose || 'wallet_login';
  const domain = context.domain.trim().toLowerCase();
  const message = buildWalletAuthMessage({
    messagePrefix,
    domain,
    chainId,
    walletAddress: normalizedAddress,
    nonce,
    issuedAt,
    expiresAt,
    purpose
  });

  const result = await pool.query(
    `INSERT INTO nbc_wallet_auth_nonce
      (wallet_address, nonce, message, domain, chain_id, purpose, expires_at, used_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NOW())
     ON CONFLICT (wallet_address)
     DO UPDATE SET
       nonce = EXCLUDED.nonce,
       message = EXCLUDED.message,
       domain = EXCLUDED.domain,
       chain_id = EXCLUDED.chain_id,
       purpose = EXCLUDED.purpose,
       expires_at = EXCLUDED.expires_at,
       used_at = NULL,
       updated_at = NOW()
     RETURNING wallet_address, nonce, message, domain, chain_id, purpose, expires_at`,
    [normalizedAddress, nonce, message, domain, chainId, purpose, expiresAt]
  );

  return result.rows[0];
}
