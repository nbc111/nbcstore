import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { emit } from '@evershop/evershop/lib/event';
import {
  getAssetSymbolByTokenAddress,
  getWalletAssetConfig
} from './assets.js';
import { ensureWalletAssetBalance } from './walletAssetBalance.js';
import { enqueueWalletNotification } from './notificationQueue.js';

function normalizeDepositAmount(rawAmount: bigint, tokenDecimals: number): bigint {
  if (tokenDecimals <= 0) return rawAmount;
  const divisor = BigInt(10) ** BigInt(tokenDecimals);
  return rawAmount / divisor;
}

export async function settleOnchainDeposit(depositId: number) {
  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const depositResult = await connection.query(
      `SELECT *
         FROM nbc_onchain_deposit
        WHERE deposit_id = $1
        FOR UPDATE`,
      [depositId]
    );
    const deposit = depositResult.rows[0];

    if (!deposit) {
      throw new Error('NBC on-chain deposit not found');
    }

    if (deposit.status === 'completed') {
      await commit(connection);
      return {
        depositId,
        walletTxId: deposit.wallet_tx_id,
        status: 'completed',
        alreadySettled: true
      };
    }

    const walletResult = deposit.wallet_id
      ? await connection.query(
          `SELECT *
             FROM nbc_wallet
            WHERE wallet_id = $1
            FOR UPDATE`,
          [deposit.wallet_id]
        )
      : await connection.query(
          `SELECT *
             FROM nbc_wallet
            WHERE deposit_address = $1
               OR wallet_address = $1
            ORDER BY CASE WHEN deposit_address = $1 THEN 0 ELSE 1 END
            LIMIT 1
            FOR UPDATE`,
          [deposit.wallet_address]
        );
    const wallet = walletResult.rows[0];

    if (!wallet) {
      await connection.query(
        `UPDATE nbc_onchain_deposit
            SET status = 'unmatched',
                error_message = 'NBC wallet not found',
                updated_at = NOW()
          WHERE deposit_id = $1`,
        [depositId]
      );
      await commit(connection);
      return {
        depositId,
        status: 'unmatched',
        alreadySettled: false
      };
    }

    const assetSymbol =
      deposit.asset_symbol || getAssetSymbolByTokenAddress(deposit.token_address);
    const asset = getWalletAssetConfig(assetSymbol);
    const tokenDecimals = Number(deposit.token_decimals || asset.tokenDecimals);
    const rawOnchainAmount = BigInt(deposit.amount);
    const amount = normalizeDepositAmount(rawOnchainAmount, tokenDecimals);

    if (amount <= BigInt(0)) {
      await connection.query(
        `UPDATE nbc_onchain_deposit
            SET status = 'failed',
                error_message = 'Normalized amount is zero (check tokenDecimals config)',
                updated_at = NOW()
          WHERE deposit_id = $1`,
        [depositId]
      );
      await commit(connection);
      return { depositId, status: 'failed', alreadySettled: false };
    }

    const assetBalance = await ensureWalletAssetBalance(connection, wallet, asset);
    const balanceBefore = BigInt(assetBalance.balance);
    const balanceAfter = balanceBefore + amount;

    await connection.query(
      `UPDATE nbc_wallet_asset_balance
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_asset_id = $2`,
      [balanceAfter.toString(), assetBalance.wallet_asset_id]
    );

    if (asset.symbol === 'NBC') {
      await connection.query(
        `UPDATE nbc_wallet
            SET balance = $1,
                updated_at = NOW()
          WHERE wallet_id = $2`,
        [balanceAfter.toString(), wallet.wallet_id]
      );
    }

    const tx = await insert('nbc_wallet_transaction')
      .given({
        wallet_id: wallet.wallet_id,
        order_id: null,
        asset_symbol: asset.symbol,
        token_address: asset.tokenAddress,
        token_decimals: tokenDecimals,
        transaction_type: 'onchain_deposit',
        amount: amount.toString(),
        balance_before: balanceBefore.toString(),
        balance_after: balanceAfter.toString(),
        exchange_rate: null,
        cny_amount: null,
        reference: deposit.tx_hash,
        status: 'completed',
        metadata: {
          source: 'onchain_deposit',
          asset_symbol: asset.symbol,
          chain_id: deposit.chain_id,
          token_address: deposit.token_address,
          log_index: deposit.log_index,
          block_number: deposit.block_number
        }
      })
      .execute(connection);
    const walletTxId = tx.insertId || tx.wallet_tx_id;

    await connection.query(
      `UPDATE nbc_onchain_deposit
          SET wallet_id = $1,
              wallet_tx_id = $2,
              asset_symbol = $3,
              token_decimals = $4,
              status = 'completed',
              error_message = NULL,
              processed_at = NOW(),
              updated_at = NOW()
        WHERE deposit_id = $5`,
      [wallet.wallet_id, walletTxId, asset.symbol, tokenDecimals, depositId]
    );

    await commit(connection);

    const result = {
      depositId,
      walletId: wallet.wallet_id,
      customerId: wallet.customer_id,
      walletTxId,
      txHash: deposit.tx_hash,
      chainId: deposit.chain_id,
      tokenAddress: deposit.token_address,
      assetSymbol: asset.symbol,
      status: 'completed' as const,
      amount: amount.toString(),
      balanceAfter: balanceAfter.toString(),
      alreadySettled: false
    };

    await Promise.all([
      emit('nbc_wallet_deposit_completed', result).catch(() => {}),
      enqueueWalletNotification({
        walletId: wallet.wallet_id,
        customerId: wallet.customer_id,
        type: 'deposit',
        assetSymbol: asset.symbol,
        amount: amount.toString(),
        reference: deposit.tx_hash,
        payload: result
      }).catch(() => {})
    ]);

    return result;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
