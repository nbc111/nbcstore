import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { addOrderActivityLog, updatePaymentStatus } from '@evershop/evershop/oms/services';
import { getOrderUsageByOrderId } from './getOrderUsageByOrderId.js';
import { getRefundTransactionByOrderId } from './getRefundTransactionByOrderId.js';
export async function refundOrderPayment(orderUuid, performedBy = 'system') {
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const orderResult = await connection.query(`SELECT * FROM "order" WHERE uuid = $1 FOR UPDATE`, [
            orderUuid
        ]);
        const orderRow = orderResult.rows[0];
        if (!orderRow) {
            throw new Error('Order not found');
        }
        if (orderRow.payment_method !== 'nbc_wallet') {
            throw new Error('Order payment method is not NBC Wallet');
        }
        const usage = await getOrderUsageByOrderId(orderRow.order_id);
        if (!usage) {
            throw new Error('NBC usage not found for this order');
        }
        if (orderRow.payment_status === 'nbc_refunded') {
            await commit(connection);
            return {
                orderUuid,
                orderId: orderRow.order_id,
                refunded: true,
                alreadyRefunded: true
            };
        }
        const existingRefund = await getRefundTransactionByOrderId(orderRow.order_id);
        if (existingRefund) {
            await updatePaymentStatus(orderRow.order_id, 'nbc_refunded', connection);
            await commit(connection);
            return {
                orderUuid,
                orderId: orderRow.order_id,
                refunded: true,
                alreadyRefunded: true,
                nbcAmount: Number(existingRefund.amount),
                balanceAfter: Number(existingRefund.balance_after)
            };
        }
        const walletResult = await connection.query(`SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE`, [
            usage.wallet_id
        ]);
        const walletRow = walletResult.rows[0];
        if (!walletRow) {
            throw new Error('NBC wallet not found');
        }
        const balanceBefore = Number(walletRow.balance);
        const refundAmount = Number(usage.nbc_amount);
        const balanceAfter = balanceBefore + refundAmount;
        await connection.query(`UPDATE nbc_wallet
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_id = $2`, [
            balanceAfter,
            walletRow.wallet_id
        ]);
        await insert('nbc_wallet_transaction').given({
            wallet_id: walletRow.wallet_id,
            order_id: orderRow.order_id,
            transaction_type: 'refund',
            amount: refundAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            exchange_rate: usage.exchange_rate,
            cny_amount: usage.cny_amount,
            reference: orderRow.uuid,
            status: 'completed',
            metadata: {
                source: 'order_refund',
                performed_by: performedBy
            }
        }).execute(connection);
        await updatePaymentStatus(orderRow.order_id, 'nbc_refunded', connection);
        await addOrderActivityLog(orderRow.order_id, `NBC Wallet refund completed: ${refundAmount} NBC`, false, connection);
        await commit(connection);
        return {
            orderUuid,
            orderId: orderRow.order_id,
            refunded: true,
            nbcAmount: refundAmount,
            balanceAfter
        };
    } catch (error) {
        await rollback(connection);
        throw error;
    }
}
