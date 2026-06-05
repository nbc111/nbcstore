import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { emit } from '@evershop/evershop/lib/event';
import { getChainRpcConfig } from './getChainRpcConfig.js';

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

    const walletResult = await connection.query(
      `SELECT *
         FROM nbc_wallet
        WHERE wallet_address = $1
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

    const { tokenDecimals } = getChainRpcConfig();
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

    const balanceBefore = BigInt(wallet.balance);
    const balanceAfter = balanceBefore + amount;

    await connection.query(
      `UPDATE nbc_wallet
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_id = $2`,
      [balanceAfter.toString(), wallet.wallet_id]
    );

    const tx = await insert('nbc_wallet_transaction')
      .given({
        wallet_id: wallet.wallet_id,
        order_id: null,
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
              status = 'completed',
              error_message = NULL,
              processed_at = NOW(),
              updated_at = NOW()
        WHERE deposit_id = $3`,
      [wallet.wallet_id, walletTxId, depositId]
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
      status: 'completed' as const,
      amount: amount.toString(),
      balanceAfter: balanceAfter.toString(),
      alreadySettled: false
    };

    await emit('nbc_wallet_deposit_completed', result).catch(() => {});

    return result;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
