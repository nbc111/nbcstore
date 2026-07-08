import { insert } from '@evershop/postgres-query-builder';
import type { WalletAssetConfig } from './assets.js';

type WalletRow = {
  wallet_id: number;
  chain_id?: number | null;
  balance?: number | string;
  frozen_balance?: number | string;
};

export type WalletAssetBalanceRow = {
  wallet_asset_id: number;
  wallet_id: number;
  asset_symbol: string;
  chain_id: number;
  token_address: string;
  token_decimals: number;
  balance: string | number;
  frozen_balance: string | number;
  status: number;
  updated_at: string | Date | null;
};

export async function ensureWalletAssetBalance(
  connection: {
    query: (
      sql: string,
      params?: unknown[]
    ) => Promise<{ rows: Record<string, unknown>[] }>;
  },
  wallet: WalletRow,
  asset: WalletAssetConfig
): Promise<WalletAssetBalanceRow> {
  const existing = await connection.query(
    `SELECT wallet_asset_id, wallet_id, asset_symbol, chain_id, token_address,
            token_decimals, balance, frozen_balance, status, updated_at
       FROM nbc_wallet_asset_balance
      WHERE wallet_id = $1
        AND asset_symbol = $2
      FOR UPDATE`,
    [wallet.wallet_id, asset.symbol]
  );

  if (existing.rows[0]) {
    return existing.rows[0] as WalletAssetBalanceRow;
  }

  const initialBalance =
    asset.symbol === 'NBC' ? String(wallet.balance || 0) : '0';
  const initialFrozen =
    asset.symbol === 'NBC' ? String(wallet.frozen_balance || 0) : '0';

  const created = await insert('nbc_wallet_asset_balance')
    .given({
      wallet_id: wallet.wallet_id,
      asset_symbol: asset.symbol,
      chain_id: asset.chainId,
      token_address: asset.assetType === 'native' ? '' : asset.tokenAddress,
      token_decimals: asset.tokenDecimals,
      balance: initialBalance,
      frozen_balance: initialFrozen,
      status: 1
    })
    .execute(connection);

  const createdId = created.insertId || created.wallet_asset_id;
  const createdRow = await connection.query(
    `SELECT wallet_asset_id, wallet_id, asset_symbol, chain_id, token_address,
            token_decimals, balance, frozen_balance, status, updated_at
       FROM nbc_wallet_asset_balance
      WHERE wallet_asset_id = $1`,
    [createdId]
  );

  return createdRow.rows[0] as WalletAssetBalanceRow;
}
