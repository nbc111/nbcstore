import { getConnection } from '@evershop/evershop/lib/postgres';
import { WalletAssetConfig } from './assets.js';

export async function ensureWalletAssetBalance(
  connection: any,
  wallet: any,
  asset: WalletAssetConfig
) {
  await connection.query(
    `INSERT INTO nbc_wallet_asset_balance (
        wallet_id,
        customer_id,
        asset_symbol,
        chain_id,
        token_address,
        token_decimals,
        balance,
        frozen_balance,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 1)
      ON CONFLICT ("wallet_id", "asset_symbol") DO NOTHING`,
    [
      wallet.wallet_id,
      wallet.customer_id,
      asset.symbol,
      asset.chainId,
      asset.tokenAddress,
      asset.tokenDecimals
    ]
  );

  const result = await connection.query(
    `SELECT *
       FROM nbc_wallet_asset_balance
      WHERE wallet_id = $1
        AND asset_symbol = $2
      FOR UPDATE`,
    [wallet.wallet_id, asset.symbol]
  );
  return result.rows[0];
}

export async function getWalletAssetBalances(walletId: number) {
  const connection = await getConnection();
  const result = await connection.query(
    `SELECT *
       FROM nbc_wallet_asset_balance
      WHERE wallet_id = $1
      ORDER BY CASE asset_symbol WHEN 'NBC' THEN 0 WHEN 'USDT' THEN 1 ELSE 9 END,
               asset_symbol ASC`,
    [walletId]
  );
  return result.rows;
}
