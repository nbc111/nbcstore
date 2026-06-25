import { INTERNAL_SERVER_ERROR, OK, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { listWalletTransactions } from '../../services/wallet/listWalletTransactions.js';
export default async function getNbcWalletTransactions(request, response) {
    var _a, _b, _c;
    try {
        const customer = request.getCurrentCustomer();
        if (!customer) {
            response.status(UNAUTHORIZED).json({
                error: {
                    status: UNAUTHORIZED,
                    message: 'Customer login is required'
                }
            });
            return;
        }
        const transactions = await listWalletTransactions(customer.customer_id, {
            page: (_a = request.query) === null || _a === void 0 ? void 0 : _a.page,
            limit: (_b = request.query) === null || _b === void 0 ? void 0 : _b.limit,
            transactionType: (_c = request.query) === null || _c === void 0 ? void 0 : _c.transactionType
        });
        response.status(OK).json({
            data: transactions
        });
    }
    catch (error) {
        response.status(INTERNAL_SERVER_ERROR).json({
            error: {
                status: INTERNAL_SERVER_ERROR,
                message: error.message
            }
        });
    }
}
//# sourceMappingURL=transactions.js.map