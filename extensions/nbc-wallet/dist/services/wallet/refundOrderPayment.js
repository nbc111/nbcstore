import { commit, insert, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { addOrderActivityLog, updatePaymentStatus } from '@evershop/evershop/oms/services';
import { getOrderUsageByOrderId } from './getOrderUsageByOrderId.js';
import { getWalletAssetConfig, normalizeAssetSymbol } from './assets.js';
import { ensureWalletAssetBalance } from './walletAssetBalance.js';
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
function calculateRefundAssetAmount(requestedFiatAmount, totalFiatAmount, totalAssetAmount) {
    if (requestedFiatAmount >= totalFiatAmount - MONEY_EPSILON) {
        return totalAssetAmount;
    }
    return Math.max(1, Math.ceil((requestedFiatAmount / totalFiatAmount) * totalAssetAmount));
}
async function calculateRefundFiatAmountFromItems(connection, orderId, items) {
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }
    const itemIds = items
        .map((item) => { var _a; return (_a = item.order_item_id) !== null && _a !== void 0 ? _a : item.orderItemId; })
        .filter((value) => value !== undefined && value !== null)
        .map((value) => Number(value));
    const itemUuids = items
        .map((item) => item.uuid)
        .filter((value) => Boolean(value));
    if (itemIds.some((value) => !Number.isInteger(value) || value <= 0)) {
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
        )`, [orderId, itemIds, itemUuids]);
    const rowsById = new Map(result.rows.map((row) => [
        Number(row.order_item_id),
        row
    ]));
    const rowsByUuid = new Map(result.rows.map((row) => [String(row.uuid), row]));
    const refundAmount = items.reduce((total, item) => {
        var _a;
        const row = item.order_item_id || item.orderItemId
            ? rowsById.get(Number((_a = item.order_item_id) !== null && _a !== void 0 ? _a : item.orderItemId))
            : rowsByUuid.get(String(item.uuid));
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
        return total + (lineTotal / purchasedQty) * qty;
    }, 0);
    return roundMoney(refundAmount);
}
async function getCompletedRefundTotals(connection, orderId) {
    var _a, _b;
    const result = await connection.query(`SELECT COALESCE(SUM(amount), 0) AS nbc_amount,
            COALESCE(SUM(cny_amount), 0) AS fiat_amount
       FROM nbc_wallet_transaction
      WHERE order_id = $1
        AND transaction_type = 'refund'
        AND status = 'completed'`, [orderId]);
    return {
        nbcAmount: Number(((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.nbc_amount) || 0),
        fiatAmount: Number(((_b = result.rows[0]) === null || _b === void 0 ? void 0 : _b.fiat_amount) || 0)
    };
}
export async function refundOrderPayment(orderUuid, performedBy = 'system', options = {}) {
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const orderResult = await connection.query(`SELECT * FROM "order"
        WHERE uuid::text = $1
           OR order_id::text = $1
        FOR UPDATE`, [String(orderUuid)]);
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
        const assetSymbol = normalizeAssetSymbol(usage.asset_symbol);
        const asset = getWalletAssetConfig(assetSymbol);
        const paidAssetAmount = Number(usage.nbc_amount);
        const paidFiatAmount = Number(usage.cny_amount || orderRow.grand_total);
        if (paidAssetAmount <= 0 || paidFiatAmount <= 0) {
            throw new Error('Wallet payment amount is invalid for this order');
        }
        const refundedTotals = await getCompletedRefundTotals(connection, orderRow.order_id);
        if (orderRow.payment_status === 'nbc_refunded' ||
            refundedTotals.nbcAmount >= paidAssetAmount) {
            if (orderRow.payment_status !== 'nbc_refunded') {
                await updatePaymentStatus(orderRow.order_id, 'nbc_refunded', connection);
            }
            await commit(connection);
            return {
                orderUuid,
                orderId: orderRow.order_id,
                refunded: true,
                alreadyRefunded: true,
                assetSymbol: asset.symbol,
                nbcAmount: 0,
                amount: 0,
                totalRefundedNbcAmount: refundedTotals.nbcAmount,
                totalRefundedAmount: refundedTotals.nbcAmount,
                paymentStatus: 'nbc_refunded'
            };
        }
        const walletResult = await connection.query(`SELECT * FROM nbc_wallet WHERE wallet_id = $1 FOR UPDATE`, [usage.wallet_id]);
        const walletRow = walletResult.rows[0];
        if (!walletRow) {
            throw new Error('NBC wallet not found');
        }
        const assetBalance = await ensureWalletAssetBalance(connection, walletRow, asset);
        const lineItemFiatAmount = await calculateRefundFiatAmountFromItems(connection, orderRow.order_id, options.items || []);
        const remainingAssetAmount = paidAssetAmount - refundedTotals.nbcAmount;
        const remainingFiatAmount = roundMoney(paidFiatAmount - refundedTotals.fiatAmount);
        const requestedFiatAmount = lineItemFiatAmount !== null && lineItemFiatAmount !== void 0 ? lineItemFiatAmount : (options.amount !== undefined && options.amount !== null && options.amount !== ''
            ? roundMoney(parsePositiveNumber(options.amount, 'Refund amount'))
            : remainingFiatAmount);
        if (requestedFiatAmount > remainingFiatAmount + MONEY_EPSILON) {
            throw new Error('Refund amount exceeds remaining refundable amount');
        }
        const calculatedRefundAmount = calculateRefundAssetAmount(requestedFiatAmount, paidFiatAmount, paidAssetAmount);
        const refundAmount = Math.min(calculatedRefundAmount, remainingAssetAmount);
        const totalRefundedNbcAmount = refundedTotals.nbcAmount + refundAmount;
        const paymentStatus = totalRefundedNbcAmount >= paidAssetAmount ? 'nbc_refunded' : 'nbc_partial_refunded';
        const balanceBefore = Number(assetBalance.balance);
        const balanceAfter = balanceBefore + refundAmount;
        await connection.query(`UPDATE nbc_wallet_asset_balance
          SET balance = $1,
              updated_at = NOW()
        WHERE wallet_asset_id = $2`, [balanceAfter, assetBalance.wallet_asset_id]);
        if (asset.symbol === 'NBC') {
            await connection.query(`UPDATE nbc_wallet
            SET balance = $1,
                updated_at = NOW()
          WHERE wallet_id = $2`, [balanceAfter, walletRow.wallet_id]);
        }
        await insert('nbc_wallet_transaction')
            .given({
            wallet_id: walletRow.wallet_id,
            order_id: orderRow.order_id,
            asset_symbol: asset.symbol,
            token_address: asset.tokenAddress,
            token_decimals: asset.tokenDecimals,
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
                asset_symbol: asset.symbol,
                refund_type: lineItemFiatAmount === null ? 'amount' : 'line_items',
                requested_amount: requestedFiatAmount,
                items: options.items || []
            }
        })
            .execute(connection);
        await updatePaymentStatus(orderRow.order_id, paymentStatus, connection);
        await addOrderActivityLog(orderRow.order_id, `NBC Wallet refund completed: ${refundAmount} ${asset.symbol} (${requestedFiatAmount} ${orderRow.currency})`, false, connection);
        await commit(connection);
        return {
            orderUuid,
            orderId: orderRow.order_id,
            refunded: true,
            assetSymbol: asset.symbol,
            nbcAmount: refundAmount,
            amount: refundAmount,
            fiatAmount: requestedFiatAmount,
            balanceAfter,
            paymentStatus,
            totalRefundedNbcAmount,
            totalRefundedAmount: totalRefundedNbcAmount
        };
    }
    catch (error) {
        await rollback(connection);
        throw error;
    }
}
//# sourceMappingURL=refundOrderPayment.js.map