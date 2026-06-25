import { GraphQLJSON } from 'graphql-type-json';
import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getChainRpcConfig, isChainRpcConfigured } from '../../../services/wallet/getChainRpcConfig.js';
import { getExchangeRate } from '../../../services/wallet/getExchangeRate.js';
import { getOnchainConfig } from '../../../services/wallet/getOnchainConfig.js';
import { getWalletSummary } from '../../../services/wallet/getWalletSummary.js';
import { listWithdrawals } from '../../../services/wallet/listWithdrawals.js';
import { listWalletTransactions } from '../../../services/wallet/listWalletTransactions.js';
async function loadOrderUsage(orderId) {
    const result = await pool.query(`SELECT u.nbc_amount,
            u.exchange_rate,
            u.cny_amount,
            u.wallet_id,
            u.wallet_tx_id,
            w.customer_id,
            t.wallet_tx_id AS transaction_wallet_tx_id,
            t.uuid AS transaction_uuid,
            t.transaction_type,
            t.amount AS transaction_amount,
            t.balance_before,
            t.balance_after,
            t.reference,
            t.status AS transaction_status,
            t.metadata AS transaction_metadata,
            t.created_at AS transaction_created_at,
            o.uuid AS order_uuid,
            o.order_number
       FROM nbc_order_usage u
       INNER JOIN nbc_wallet w ON w.wallet_id = u.wallet_id
       LEFT JOIN nbc_wallet_transaction t
         ON t.wallet_tx_id = u.wallet_tx_id
         OR (
           u.wallet_tx_id IS NULL
           AND t.order_id = u.order_id
           AND t.wallet_id = u.wallet_id
           AND t.transaction_type = 'debit'
         )
       LEFT JOIN "order" o ON o.order_id = u.order_id
      WHERE u.order_id = $1
      ORDER BY t.wallet_tx_id DESC NULLS LAST
      LIMIT 1`, [
        orderId
    ]);
    return result.rows[0] || null;
}
export default {
    JSON: GraphQLJSON,
    Query: {
        nbcWalletPublicConfig: async ()=>{
            const chain = getChainRpcConfig();
            const onchain = getOnchainConfig();
            return {
                exchangeRate: await getExchangeRate(),
                shopCurrency: String(getConfig('shop.currency', 'USD')).toUpperCase(),
                displayName: String(getConfig('nbcWallet.displayName', 'NBC Wallet')),
                chainId: chain.chainId > 0 ? chain.chainId : null,
                rpcUrl: chain.rpcUrl || null,
                chainName: chain.chainName,
                nativeSymbol: chain.nativeSymbol,
                assetType: chain.assetType,
                tokenAddress: chain.tokenAddress || null,
                tokenDecimals: chain.tokenDecimals,
                blockExplorerUrl: chain.blockExplorerUrl || null,
                chainBalanceEnabled: isChainRpcConfigured(chain),
                treasuryAddress: onchain.treasuryAddress || null,
                depositMode: onchain.depositMode,
                onchainEnabled: onchain.enabled,
                onchainEnabledRaw: onchain.enabled ? 1 : 0
            };
        },
        nbcWallet: async (_, args, { customer })=>{
            if (!customer) {
                return null;
            }
            return getWalletSummary(customer.customer_id);
        },
        nbcWalletTransactions: async (_, args, { customer })=>{
            if (!customer) {
                return {
                    items: [],
                    currentPage: args.page || 1,
                    pageSize: args.limit || 20,
                    total: 0
                };
            }
            return listWalletTransactions(customer.customer_id, args);
        },
        nbcWalletWithdrawals: async (_, args, { customer })=>{
            if (!customer) {
                return [];
            }
            return listWithdrawals(customer.customer_id, args.limit);
        }
    },
    Customer: {
        nbcWallet: ({ customerId })=>getWalletSummary(customerId),
        nbcWalletTransactions: ({ customerId }, args)=>listWalletTransactions(customerId, args),
        nbcWalletWithdrawals: ({ customerId }, args)=>listWithdrawals(customerId, args.limit)
    },
    Order: {
        nbcUsage: async ({ orderId }, args, { customer })=>{
            const usage = await loadOrderUsage(orderId);
            if (!usage) {
                return null;
            }
            if (customer && Number(customer.customer_id) !== Number(usage.customer_id)) {
                return null;
            }
            return {
                walletTxId: usage.transaction_wallet_tx_id ? Number(usage.transaction_wallet_tx_id) : null,
                transactionUuid: usage.transaction_uuid || null,
                nbcAmount: Number(usage.nbc_amount),
                exchangeRate: Number(usage.exchange_rate),
                cnyAmount: Number(usage.cny_amount),
                balanceBefore: usage.balance_before === null ? null : Number(usage.balance_before),
                balanceAfter: usage.balance_after === null ? null : Number(usage.balance_after),
                transactionStatus: usage.transaction_status || null,
                paidAt: usage.transaction_created_at || null,
                transaction: usage.transaction_uuid ? {
                    walletTxId: Number(usage.transaction_wallet_tx_id),
                    uuid: usage.transaction_uuid,
                    walletId: Number(usage.wallet_id),
                    orderId,
                    orderUuid: usage.order_uuid || null,
                    orderNumber: usage.order_number || null,
                    transactionType: usage.transaction_type,
                    amount: Number(usage.transaction_amount),
                    balanceBefore: Number(usage.balance_before),
                    balanceAfter: Number(usage.balance_after),
                    exchangeRate: Number(usage.exchange_rate),
                    cnyAmount: Number(usage.cny_amount),
                    reference: usage.reference || null,
                    status: usage.transaction_status,
                    metadata: usage.transaction_metadata,
                    createdAt: usage.transaction_created_at
                } : null,
                wallet: ()=>getWalletSummary(usage.customer_id)
            };
        }
    },
    NbcOrderUsage: {
        transaction: (usage)=>usage.transaction || null,
        wallet: (usage)=>{
            if (typeof usage.wallet === 'function') {
                return usage.wallet();
            }
            return usage.wallet || null;
        }
    }
};
