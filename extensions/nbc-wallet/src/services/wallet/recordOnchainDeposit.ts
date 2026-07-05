import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

type RecordOnchainDepositInput = {
  walletAddress: string;
  walletId?: number | null;
  chainId: number;
  tokenAddress: string;
  assetSymbol?: string;
  tokenDecimals?: number;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  amount: number | string | bigint;
  metadata?: Record<string, unknown>;
};

function normalizeAmount(amount: number | string | bigint) {
  const normalized = BigInt(amount);
  if (normalized <= BigInt(0)) {
    throw new Error('Deposit amount must be positive');
  }
  return normalized.toString();
}

function normalizeAssetAddress(tokenAddress: string) {
  return tokenAddress.startsWith('native:')
    ? tokenAddress
    : normalizeWalletAddress(tokenAddress);
}

export async function recordOnchainDeposit(input: RecordOnchainDepositInput) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const tokenAddress = normalizeAssetAddress(input.tokenAddress);
  const amount = normalizeAmount(input.amount);
  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const existing = await connection.query(
      `SELECT *
         FROM nbc_onchain_deposit
        WHERE chain_id = $1
          AND tx_hash = $2
          AND log_index = $3
        FOR UPDATE`,
      [input.chainId, input.txHash, input.logIndex]
    );

    if (existing.rows[0]) {
      await commit(connection);
      return {
        depositId: existing.rows[0].deposit_id,
        status: existing.rows[0].status,
        alreadyRecorded: true
      };
    }

    const walletResult = input.walletId
      ? await connection.query(
          `SELECT *
             FROM nbc_wallet
            WHERE wallet_id = $1
            FOR UPDATE`,
          [input.walletId]
        )
      : await connection.query(
          `SELECT *
             FROM nbc_wallet
            WHERE deposit_address = $1
               OR wallet_address = $1
            ORDER BY CASE WHEN deposit_address = $1 THEN 0 ELSE 1 END
            LIMIT 1
            FOR UPDATE`,
          [walletAddress]
        );
    const wallet = walletResult.rows[0];

    const deposit = await insert('nbc_onchain_deposit')
      .given({
        wallet_id: wallet?.wallet_id || null,
        wallet_address: walletAddress,
        chain_id: input.chainId,
        token_address: tokenAddress,
        asset_symbol: input.assetSymbol || 'NBC',
        token_decimals: Number(input.tokenDecimals ?? 18),
        tx_hash: input.txHash,
        log_index: input.logIndex,
        block_number: input.blockNumber,
        amount,
        status: wallet ? 'pending' : 'unmatched',
        metadata: input.metadata || null
      })
      .execute(connection);

    await commit(connection);

    return {
      depositId: deposit.insertId || deposit.deposit_id,
      walletId: wallet?.wallet_id || null,
      status: wallet ? 'pending' : 'unmatched',
      alreadyRecorded: false
    };
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
