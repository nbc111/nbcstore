import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { requestWithdrawal } from '../../services/wallet/requestWithdrawal.js';
export default async function requestNbcWalletWithdrawal(request, response) {
    var _a;
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
        const amount = Number((_a = request.body) === null || _a === void 0 ? void 0 : _a.amount);
        if (!amount || amount <= 0) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'amount must be greater than 0'
                }
            });
            return;
        }
        const result = await requestWithdrawal({
            customerId: customer.customer_id,
            amount
        });
        response.status(OK).json({
            data: result
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
//# sourceMappingURL=%5BbodyParser%5Drequest.js.map