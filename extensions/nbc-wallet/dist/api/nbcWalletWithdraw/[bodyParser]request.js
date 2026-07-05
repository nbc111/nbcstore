import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK, TOO_MANY_REQUESTS, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { checkRateLimit, getRequestRateLimitKey } from '../../services/security/rateLimit.js';
import { requestWithdrawal } from '../../services/wallet/requestWithdrawal.js';
export default async function requestNbcWalletWithdrawal(request, response) {
    var _a, _b, _c, _d, _e;
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
        const rateLimit = checkRateLimit({
            scope: 'wallet_withdrawal_request',
            keys: [
                getRequestRateLimitKey(request, customer.customer_id, ((_b = request.body) === null || _b === void 0 ? void 0 : _b.assetSymbol) || ((_c = request.body) === null || _c === void 0 ? void 0 : _c.asset))
            ],
            limit: Number(getConfig('nbcWallet.rateLimit.withdraw.limit', 5)),
            windowSeconds: Number(getConfig('nbcWallet.rateLimit.withdraw.windowSeconds', 300))
        });
        if (!rateLimit.allowed) {
            response.status(TOO_MANY_REQUESTS).json({
                error: {
                    status: TOO_MANY_REQUESTS,
                    message: 'Too many requests. Please try again later.'
                }
            });
            return;
        }
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
            amount,
            assetSymbol: ((_d = request.body) === null || _d === void 0 ? void 0 : _d.assetSymbol) || ((_e = request.body) === null || _e === void 0 ? void 0 : _e.asset)
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