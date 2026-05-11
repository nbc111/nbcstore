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
import { getExchangeRate } from './getExchangeRate.js';
import { getOrderUsageByOrderId } from './getOrderUsageByOrderId.js';

export async function captureOrderPayment(
  orderUuid: string,
  customerId: number
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
        nbcAmount: String(existingUsage.nbc_amount),
        cnyAmount: String(existingUsage.cny_amount),
        exchangeRate: String(existingUsage.exchange_rate),
        balanceAfter: null,
        alreadyCaptured: true
      };
    }

    if (orderRow.payment_status === 'nbc_paid') {
      await commit(connection);
      return {
        orderUuid,
        orderId: orderRow.order_id,
        nbcAmount: null,
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

    const exchangeRate = await getExchangeRate('NBC_TO_CNY');
    const cnyAmount = Number(orderRow.grand_total);
    const nbcAmount = calculateNbcAmount(cnyAmount, exchangeRate);
    const availableBalance =
      Number(walletRow.balance) - Number(walletRow.frozen_balance);

    if (availableBalance < nbcAmount) {
      throw new Error('NBC balance is insufficient');
    }

    const balanceBefore = Number(walletRow.balance);
    const balanceAfter = balanceBefore - nbcAmount;

    await connection.query(
      `UPDATE nbc_wallet
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_id = $2`,
      [balanceAfter, walletRow.wallet_id]
    );

    await insert('nbc_wallet_transaction')
      .given({
        wallet_id: walletRow.wallet_id,
        order_id: orderRow.order_id,
        transaction_type: 'debit',
        amount: nbcAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        exchange_rate: exchangeRate,
        cny_amount: cnyAmount,
        reference: orderRow.uuid,
        status: 'completed',
        metadata: {
          source: 'order_capture'
        }
      })
      .execute(connection);

    await insert('nbc_order_usage')
      .given({
        order_id: orderRow.order_id,
        wallet_id: walletRow.wallet_id,
        nbc_amount: nbcAmount,
        exchange_rate: exchangeRate,
        cny_amount: cnyAmount
      })
      .execute(connection);

    await updatePaymentStatus(orderRow.order_id, 'nbc_paid', connection);
    await addOrderActivityLog(
      orderRow.order_id,
      `NBC Wallet payment captured: ${nbcAmount} NBC`,
      false,
      connection
    );

    await commit(connection);

    await emit('order_placed', { ...orderRow, payment_status: 'nbc_paid' });

    return {
      orderUuid,
      orderId: orderRow.order_id,
      nbcAmount,
      cnyAmount,
      exchangeRate,
      balanceAfter
    };
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
