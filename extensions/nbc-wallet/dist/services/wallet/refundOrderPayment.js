import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { addOrderActivityLog, updatePaymentStatus } from '@evershop/evershop/oms/services';
import { getOrderUsageByOrderId } from './getOrderUsageByOrderId.js';
const MONEY_EPSILON = 0.0001;
function parsePositiveNumber(value, field) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`${field} must be greater than 0`);
    }
    return number;
}
function roundMoney(value) {
    return Number(value.toFixed(4));
}
function calculateRefundNbcAmount(requestedFiatAmount, totalFiatAmount, totalNbcAmount) {
    if (requestedFiatAmount >= totalFiatAmount - MONEY_EPSILON) {
        return totalNbcAmount;
    }
    return Math.max(1, Math.ceil(requestedFiatAmount / totalFiatAmount * totalNbcAmount));
}
async function calculateRefundFiatAmountFromItems(connection, orderId, items) {
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }
    const itemIds = items.map((item)=>item.order_item_id ?? item.orderItemId).filter((value)=>value !== undefined && value !== null).map((value)=>Number(value));
    const itemUuids = items.map((item)=>item.uuid).filter((value)=>Boolean(value));
    if (itemIds.some((value)=>!Number.isInteger(value) || value <= 0)) {
        throw new Error('Refund item id is invalid');
    }
    if (itemIds.length === 0 && itemUuids.length === 0) {
        throw new Error('Refund items are missing item identifiers');
    }
    const result = await connection.query(`SELECT order_item_id, uuid, qty, line_total_with_discount_incl_tax
       FROM order_item
      WHERE order_item_order_id = $1
        AND (
          order_item_id = ANY($2::int[])
          OR uuid = ANY($3::uuid[])
        )`, [
        orderId,
        itemIds,
        itemUuids
    ]);
    const rowsById = new Map(result.rows.map((row)=>[
            Number(row.order_item_id),
            row
        ]));
    const rowsByUuid = new Map(result.rows.map((row)=>[
            String(row.uuid),
            row
        ]));
    const refundAmount = items.reduce((total, item)=>{
        const row = item.order_item_id || item.orderItemId ? rowsById.get(Number(item.order_item_id ?? item.orderItemId)) : rowsByUuid.get(String(item.uuid));
        if (!row) {
            throw new Error('Refund item does not belong to this order');
        }
        const qty = parsePositiveNumber(item.qty, 'Refund item quantity');
        if (!Number.isInteger(qty)) {
            throw new Error('Refund item quantity must be an integer');
        }
        const purchasedQty = Number(row.qty);
        if (qty > purchasedQty) {
            throw new Error('Refund item quantity exceeds purchased quantity');
        }
        const lineTotal = Number(row.line_total_with_discount_incl_tax);
        return total + lineTotal / purchasedQty * qty;
    }, 0);
    return roundMoney(refundAmount);
}
async function getCompletedRefundTotals(connection, orderId) {
    const result = await connection.query(`SELECT COALESCE(SUM(amount), 0) AS nbc_amount,
            COALESCE(SUM(cny_amount), 0) AS fiat_amount
       FROM nbc_wallet_transaction
      WHERE order_id = $1
        AND transaction_type = 'refund'
        AND status = 'completed'`, [
        orderId
    ]);
    return {
        nbcAmount: Number(result.rows[0]?.nbc_amount || 0),
        fiatAmount: Number(result.rows[0]?.fiat_amount || 0)
    };
}
export async function refundOrderPayment(orderUuid, performedBy = 'system', options = {}) {
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const orderResult = await connection.query(`SELECT * FROM "order"
        WHERE uuid::text = $1
           OR order_id::text = $1
        FOR UPDATE`, [
            String(orderUuid)
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
        const paidNbcAmount = Number(usage.nbc_amount);
        const paidFiatAmount = Number(usage.cny_amount || orderRow.grand_total);
        if (paidNbcAmount <= 0 || paidFiatAmount <= 0) {
            throw new Error('NBC usage amount is invalid for this order');
        }
        const refundedTotals = await getCompletedRefundTotals(connection, orderRow.order_id);
        if (orderRow.payment_status === 'nbc_refunded' || refundedTotals.nbcAmount >= paidNbcAmount) {
            if (orderRow.payment_status !== 'nbc_refunded') {
                await updatePaymentStatus(orderRow.order_id, 'nbc_refunded', connection);
            }
            await commit(connection);
            return {
                orderUuid,
                orderId: orderRow.order_id,
                refunded: true,
                alreadyRefunded: true,
                nbcAmount: 0,
                totalRefundedNbcAmount: refundedTotals.nbcAmount,
                paymentStatus: 'nbc_refunded'
            };
        }
        const walletResult = await connection.query(`SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE`, [
            usage.wallet_id
        ]);
        const walletRow = walletResult.rows[0];
        if (!walletRow) {
            throw new Error('NBC wallet not found');
        }
        const lineItemFiatAmount = await calculateRefundFiatAmountFromItems(connection, orderRow.order_id, options.items || []);
        const remainingNbcAmount = paidNbcAmount - refundedTotals.nbcAmount;
        const remainingFiatAmount = roundMoney(paidFiatAmount - refundedTotals.fiatAmount);
        const requestedFiatAmount = lineItemFiatAmount ?? (options.amount !== undefined && options.amount !== null && options.amount !== '' ? roundMoney(parsePositiveNumber(options.amount, 'Refund amount')) : remainingFiatAmount);
        if (requestedFiatAmount > remainingFiatAmount + MONEY_EPSILON) {
            throw new Error('Refund amount exceeds remaining refundable amount');
        }
        const calculatedRefundAmount = calculateRefundNbcAmount(requestedFiatAmount, paidFiatAmount, paidNbcAmount);
        const refundAmount = Math.min(calculatedRefundAmount, remainingNbcAmount);
        const totalRefundedNbcAmount = refundedTotals.nbcAmount + refundAmount;
        const paymentStatus = totalRefundedNbcAmount >= paidNbcAmount ? 'nbc_refunded' : 'nbc_partial_refunded';
        const balanceBefore = Number(walletRow.balance);
        const balanceAfter = balanceBefore + refundAmount;
        await connection.query(`UPDATE nbc_wallet
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_id = $2`, [
            balanceAfter,
            walletRow.wallet_id
        ]);
        await connection.query(`UPDATE nbc_wallet_asset_balance
          SET balance = balance + $1,
              updated_at = NOW()
        WHERE wallet_id = $2
          AND asset_symbol = 'NBC'`, [
            refundAmount,
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
            cny_amount: requestedFiatAmount,
            reference: orderRow.uuid,
            status: 'completed',
            metadata: {
                source: 'order_refund',
                performed_by: performedBy,
                refund_type: lineItemFiatAmount === null ? 'amount' : 'line_items',
                requested_amount: requestedFiatAmount,
                items: options.items || []
            }
        }).execute(connection);
        await updatePaymentStatus(orderRow.order_id, paymentStatus, connection);
        await addOrderActivityLog(orderRow.order_id, `NBC Wallet refund completed: ${refundAmount} NBC (${requestedFiatAmount} ${orderRow.currency})`, false, connection);
        await commit(connection);
        return {
            orderUuid,
            orderId: orderRow.order_id,
            refunded: true,
            nbcAmount: refundAmount,
            fiatAmount: requestedFiatAmount,
            balanceAfter,
            paymentStatus,
            totalRefundedNbcAmount
        };
    } catch (error) {
        await rollback(connection);
        throw error;
    }
}
