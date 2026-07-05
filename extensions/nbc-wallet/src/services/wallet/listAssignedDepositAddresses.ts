import { pool } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

export type AssignedDepositAddress = {
  walletId: number;
  walletAddress: string;
  depositAddress: string;
  addressIndex: number | null;
};

export async function listAssignedDepositAddresses(
  chainId?: number,
  tokenAddress?: string
) {
  if (chainId && tokenAddress) {
    const tableResult = await pool.query(
      `SELECT to_regclass('public.nbc_wallet_deposit_address') AS table_name`
    );

    if (tableResult.rows[0]?.table_name) {
      const tokenKey = tokenAddress.startsWith('native:')
        ? tokenAddress
        : normalizeWalletAddress(tokenAddress);
      const assignedResult = await pool.query(
        `SELECT da.wallet_id, w.wallet_address, da.deposit_address, da.address_index
           FROM nbc_wallet_deposit_address da
           INNER JOIN nbc_wallet w ON w.wallet_id = da.wallet_id
          WHERE da.chain_id = $1
            AND da.token_address = $2
            AND da.status = 1`,
        [chainId, tokenKey]
      );

      if (assignedResult.rows.length > 0) {
        const assigned = new Map<string, AssignedDepositAddress>();
        for (const row of assignedResult.rows) {
          const depositAddress = normalizeWalletAddress(row.deposit_address);
          assigned.set(depositAddress, {
            walletId: Number(row.wallet_id),
            walletAddress: row.wallet_address,
            depositAddress,
            addressIndex:
              row.address_index === null ? null : Number(row.address_index)
          });
        }
        return assigned;
      }
    }
  }

  const result = await pool.query(
    `SELECT wallet_id, wallet_address, deposit_address, address_index
       FROM nbc_wallet
      WHERE deposit_address IS NOT NULL`
  );

  const addresses = new Map<string, AssignedDepositAddress>();
  for (const row of result.rows) {
    const depositAddress = normalizeWalletAddress(row.deposit_address);
    addresses.set(depositAddress, {
      walletId: Number(row.wallet_id),
      walletAddress: row.wallet_address,
      depositAddress,
      addressIndex: row.address_index === null ? null : Number(row.address_index)
    });
  }

  return addresses;
}
