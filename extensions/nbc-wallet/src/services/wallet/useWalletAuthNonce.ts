import { pool } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

type WalletAuthNonceContext = {
  domain: string;
  chainId: number;
  purpose?: string;
};

export async function getWalletAuthNonce(
  walletAddress: string,
  nonce: string,
  context: WalletAuthNonceContext
) {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  const result = await pool.query(
    `SELECT *
       FROM nbc_wallet_auth_nonce
      WHERE wallet_address = $1
        AND nonce = $2
        AND domain = $3
        AND chain_id = $4
        AND purpose = $5
        AND used_at IS NULL
        AND expires_at > NOW()`,
    [
      normalizedAddress,
      nonce,
      context.domain.trim().toLowerCase(),
      Number(context.chainId),
      context.purpose || 'wallet_login'
    ]
  );

  return result.rows[0] ?? null;
}

export async function markWalletAuthNonceUsed(
  walletAddress: string,
  nonce: string,
  context: WalletAuthNonceContext
) {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  const result = await pool.query(
    `UPDATE nbc_wallet_auth_nonce
        SET used_at = NOW(),
            updated_at = NOW()
      WHERE wallet_address = $1
        AND nonce = $2
        AND domain = $3
        AND chain_id = $4
        AND purpose = $5
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING *`,
    [
      normalizedAddress,
      nonce,
      context.domain.trim().toLowerCase(),
      Number(context.chainId),
      context.purpose || 'wallet_login'
    ]
  );

  return result.rows[0] ?? null;
}

export const useWalletAuthNonce = markWalletAuthNonceUsed;
