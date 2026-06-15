import { pool } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

export type AssignedDepositAddress = {
  walletId: number;
  walletAddress: string;
  depositAddress: string;
  addressIndex: number | null;
};

export async function listAssignedDepositAddresses() {
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
