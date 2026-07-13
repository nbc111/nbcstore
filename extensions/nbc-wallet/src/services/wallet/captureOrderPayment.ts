import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { emit } from '@evershop/evershop/lib/event';
import { addOrderActivityLog, updatePaymentStatus } from '@evershop/evershop/oms/services';
import { calculateNbcAmount } from './calculateNbcAmount.js';
import { getAssetExchangeRate } from './getExchangeRate.js';
import { getOrderUsageByOrderId } from './getOrderUsageByOrderId.js';
import { getWalletAssetConfig, normalizeAssetSymbol } from './assets.js';
import { ensureWalletAssetBalance } from './walletAssetBalance.js';

export async function captureOrderPayment(
  orderUuid: string,
  customerId: number,
  assetSymbolInput = 'NBC'
) {
  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const order = await connection.query(
      `SELECT * FROM "order" WHERE uuid = $1 FOR UPDATE`,
      [orderUuid]
    );
    const orderRow = order.rows[0];

    if (!orderRow) {
      throw new Error('Order not found');
    }

    if (Number(orderRow.customer_id) !== Number(customerId)) {
      throw new Error('Order does not belong to current customer');
    }

    if (orderRow.payment_method !== 'nbc_wallet') {
      throw new Error('Order payment method is not NBC Wallet');
    }

    const existingUsage = await getOrderUsageByOrderId(orderRow.order_id);
    if (existingUsage) {
      await commit(connection);
      return {
        orderUuid,
        orderId: orderRow.order_id,
        assetSymbol: existingUsage.asset_symbol || 'NBC',
        nbcAmount: String(existingUsage.nbc_amount),
        amount: String(existingUsage.nbc_amount),
        cnyAmount: String(existingUsage.cny_amount),
        exchangeRate: String(existingUsage.exchange_rate),
        balanceAfter:
          existingUsage.balance_after === null
            ? null
            : Number(existingUsage.balance_after),
        alreadyCaptured: true
      };
    }

    if (orderRow.payment_status === 'nbc_paid') {
      await commit(connection);
      return {
        orderUuid,
        orderId: orderRow.order_id,
        assetSymbol: null,
        nbcAmount: null,
        amount: null,
        cnyAmount: null,
        exchangeRate: null,
        balanceAfter: null,
        alreadyCaptured: true
      };
    }

    const walletResult = await connection.query(
      `SELECT * FROM nbc_wallet WHERE customer_id = $1 FOR UPDATE`,
      [customerId]
    );
    const walletRow = walletResult.rows[0];

    if (!walletRow) {
      throw new Error('NBC wallet not found');
    }

    const assetSymbol = normalizeAssetSymbol(assetSymbolInput);
    const asset = getWalletAssetConfig(assetSymbol);
    const exchangeRate = await getAssetExchangeRate(asset.symbol, orderRow.currency);
    const orderFiatAmount = Number(orderRow.grand_total);
    const paymentAmount = calculateNbcAmount(orderFiatAmount, exchangeRate);
    const assetBalance = await ensureWalletAssetBalance(
      connection,
      walletRow,
      asset
    );
    const availableBalance =
      Number(assetBalance.balance) - Number(assetBalance.frozen_balance);

    if (availableBalance < paymentAmount) {
      throw new Error(`${asset.symbol} balance is insufficient`);
    }

    const balanceBefore = Number(assetBalance.balance);
    const balanceAfter = balanceBefore - paymentAmount;

    await connection.query(
      `UPDATE nbc_wallet_asset_balance
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_asset_id = $2`,
      [balanceAfter, assetBalance.wallet_asset_id]
    );

    if (asset.symbol === 'NBC') {
      await connection.query(
        `UPDATE nbc_wallet
            SET balance = $1,
                updated_at = NOW()
          WHERE wallet_id = $2`,
        [balanceAfter, walletRow.wallet_id]
      );
    }

    const walletTx = await insert('nbc_wallet_transaction')
      .given({
        wallet_id: walletRow.wallet_id,
        order_id: orderRow.order_id,
        asset_symbol: asset.symbol,
        token_address: asset.tokenAddress,
        token_decimals: asset.tokenDecimals,
        transaction_type: 'debit',
        amount: paymentAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        exchange_rate: exchangeRate,
        cny_amount: orderFiatAmount,
        reference: orderRow.uuid,
        status: 'completed',
        metadata: {
          source: 'order_capture',
          asset_symbol: asset.symbol
        }
      })
      .execute(connection);

    await insert('nbc_order_usage')
      .given({
        order_id: orderRow.order_id,
        wallet_id: walletRow.wallet_id,
        nbc_amount: paymentAmount,
        asset_symbol: asset.symbol,
        token_address: asset.tokenAddress,
        token_decimals: asset.tokenDecimals,
        exchange_rate: exchangeRate,
        cny_amount: orderFiatAmount,
        wallet_tx_id: walletTx.insertId || walletTx.wallet_tx_id
      })
      .execute(connection);

    await updatePaymentStatus(orderRow.order_id, 'nbc_paid', connection);
    await addOrderActivityLog(
      orderRow.order_id,
      `NBC Wallet payment captured: ${paymentAmount} ${asset.symbol}`,
      false,
      connection
    );

    await commit(connection);

    await emit('order_placed', { ...orderRow, payment_status: 'nbc_paid' });

    return {
      orderUuid,
      orderId: orderRow.order_id,
      assetSymbol: asset.symbol,
      nbcAmount: paymentAmount,
      amount: paymentAmount,
      cnyAmount: orderFiatAmount,
      exchangeRate,
      balanceAfter
    };
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
