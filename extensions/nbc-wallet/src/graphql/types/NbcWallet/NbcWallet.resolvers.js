import { GraphQLJSON } from 'graphql-type-json';
import { pool } from '@evershop/evershop/lib/postgres';
import { getWalletSummary } from '../../../services/wallet/getWalletSummary.js';
import { listWalletTransactions } from '../../../services/wallet/listWalletTransactions.js';

async function loadOrderUsage(orderId) {
  const result = await pool.query(
    `SELECT u.nbc_amount, u.exchange_rate, u.cny_amount, u.wallet_id, w.customer_id
       FROM nbc_order_usage u
       INNER JOIN nbc_wallet w ON w.wallet_id = u.wallet_id
      WHERE u.order_id = $1`,
    [orderId]
  );
  return result.rows[0] || null;
}

export default {
  JSON: GraphQLJSON,
  Query: {
    nbcWallet: async (_, args, { customer }) => {
      if (!customer) {
        return null;
      }
      return getWalletSummary(customer.customer_id);
    },
    nbcWalletTransactions: async (_, args, { customer }) => {
      if (!customer) {
        return {
          items: [],
          currentPage: args.page || 1,
          pageSize: args.limit || 20,
          total: 0
        };
      }
      return listWalletTransactions(customer.customer_id, args);
    }
  },
  Customer: {
    nbcWallet: ({ customerId }) => getWalletSummary(customerId),
    nbcWalletTransactions: ({ customerId }, args) =>
      listWalletTransactions(customerId, args)
  },
  Order: {
    nbcUsage: async ({ orderId }, args, { customer }) => {
      const usage = await loadOrderUsage(orderId);
      if (!usage) {
        return null;
      }
      if (customer && Number(customer.customer_id) !== Number(usage.customer_id)) {
        return null;
      }

      return {
        nbcAmount: Number(usage.nbc_amount),
        exchangeRate: Number(usage.exchange_rate),
        cnyAmount: Number(usage.cny_amount),
        wallet: () => getWalletSummary(usage.customer_id)
      };
    }
  },
  NbcOrderUsage: {
    wallet: (usage) => {
      if (typeof usage.wallet === 'function') {
        return usage.wallet();
      }
      return usage.wallet || null;
    }
  }
};
