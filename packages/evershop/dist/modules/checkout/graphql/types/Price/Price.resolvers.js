import { formatCurrency } from '../../../../../lib/util/formatCurrency.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
export default {
    Price: {
        value: (rawPrice)=>parseFloat(rawPrice),
        currency: async (_, { currency })=>{
            const curr = currency || getConfig('shop.currency', 'USD');
            return curr;
        },
        text: async (rawPrice, { currency })=>{
            const price = parseFloat(rawPrice);
            const curr = currency || getConfig('shop.currency', 'USD');
            return formatCurrency(price, curr);
        }
    }
};
