import { HDNodeWallet } from 'ethers';
import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { commit, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getOnchainConfig } from './getOnchainConfig.js';
import { getWalletByCustomerId } from './getWalletByCustomerId.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

type AssignedDepositAddress = {
  mode: 'hd' | 'treasury';
  walletId: number;
  customerId: number;
  depositAddress: string;
  addressIndex: number | null;
  chainId: number;
  tokenAddress: string;
};

function getHdMasterMnemonic() {
  return (
    process.env.NBC_WALLET_HD_MASTER_MNEMONIC ||
    String(getConfig('nbcWallet.onchain.hdMasterMnemonic', ''))
  ).trim();
}

function buildTokenAddressKey(tokenAddress: string, assetType: 'native' | 'erc20') {
  if (assetType === 'native') {
    return 'native:NBC';
  }
  return normalizeWalletAddress(tokenAddress);
}

function deriveAddressFromIndex(mnemonic: string, pathPrefix: string, index: number) {
  const path = `${pathPrefix}/${index}`;
  return normalizeWalletAddress(HDNodeWallet.fromPhrase(mnemonic, undefined, path).address);
}

async function loadExisting(walletId: number) {
  const result = await pool.query(
    `SELECT *
       FROM nbc_wallet_deposit_address
      WHERE wallet_id = $1
      LIMIT 1`,
    [walletId]
  );
  return result.rows[0] || null;
}

async function nextAddressIndex(
  connection: any,
  chainId: number,
  tokenAddress: string
): Promise<number> {
  await connection.query('LOCK TABLE nbc_wallet_deposit_address IN EXCLUSIVE MODE');
  const result = await connection.query(
    `SELECT COALESCE(MAX(address_index), -1) AS max_index
       FROM nbc_wallet_deposit_address
      WHERE chain_id = $1
        AND token_address = $2`,
    [chainId, tokenAddress]
  );
  return Number(result.rows[0]?.max_index || -1) + 1;
}

export async function assignDepositAddress(customerId: number): Promise<AssignedDepositAddress> {
  const onchain = getOnchainConfig();
  const wallet = await getWalletByCustomerId(customerId);
  if (!wallet) {
    throw new Error('NBC wallet not found');
  }

  const walletId = Number(wallet.wallet_id);
  const tokenAddress = buildTokenAddressKey(onchain.tokenAddress, onchain.assetType);

  if (onchain.depositMode !== 'hd') {
    if (!onchain.treasuryAddress) {
      throw new Error('nbcWallet.onchain.treasuryAddress is required');
    }
    return {
      mode: 'treasury',
      walletId,
      customerId,
      depositAddress: onchain.treasuryAddress,
      addressIndex: null,
      chainId: onchain.chainId,
      tokenAddress
    };
  }

  const mnemonic = getHdMasterMnemonic();
  if (!mnemonic) {
    if (!onchain.treasuryAddress) {
      throw new Error(
        'nbcWallet.onchain.hdMasterMnemonic is required for hd deposit mode'
      );
    }
    return {
      mode: 'treasury',
      walletId,
      customerId,
      depositAddress: onchain.treasuryAddress,
      addressIndex: null,
      chainId: onchain.chainId,
      tokenAddress
    };
  }

  const existing = await loadExisting(walletId);
  if (existing) {
    return {
      mode: 'hd',
      walletId,
      customerId,
      depositAddress: existing.deposit_address,
      addressIndex: Number(existing.address_index),
      chainId: Number(existing.chain_id),
      tokenAddress: existing.token_address
    };
  }

  const connection = await getConnection();
  try {
    await startTransaction(connection);
    const newIndex = await nextAddressIndex(connection, onchain.chainId, tokenAddress);
    const depositAddress = deriveAddressFromIndex(
      mnemonic,
      onchain.hdPathPrefix,
      newIndex
    );

    await connection.query(
      `INSERT INTO nbc_wallet_deposit_address (
        wallet_id,
        customer_id,
        deposit_address,
        address_index,
        chain_id,
        token_address,
        mode,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'hd', 1)`,
      [walletId, customerId, depositAddress, newIndex, onchain.chainId, tokenAddress]
    );

    await commit(connection);
    return {
      mode: 'hd',
      walletId,
      customerId,
      depositAddress,
      addressIndex: newIndex,
      chainId: onchain.chainId,
      tokenAddress
    };
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}

export async function listDepositAddressBindings(chainId: number, tokenAddress: string) {
  const result = await pool.query(
    `SELECT da.deposit_address,
            da.wallet_id,
            da.customer_id,
            da.address_index,
            da.chain_id,
            da.token_address,
            w.wallet_address
       FROM nbc_wallet_deposit_address da
       INNER JOIN nbc_wallet w ON w.wallet_id = da.wallet_id
      WHERE da.chain_id = $1
        AND da.token_address = $2
        AND da.status = 1`,
    [chainId, tokenAddress]
  );

  return result.rows.map((row) => ({
    depositAddress: normalizeWalletAddress(row.deposit_address),
    walletAddress: normalizeWalletAddress(row.wallet_address),
    walletId: Number(row.wallet_id),
    customerId: Number(row.customer_id),
    addressIndex: Number(row.address_index)
  }));
}
