import { FORBIDDEN, INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK } from '@evershop/evershop/lib/util/httpStatus';
import { failWithdrawal } from '../../services/wallet/failWithdrawal.js';
export default async function markNbcWalletWithdrawalFailed(request, response) {
    var _a, _b, _c;
    try {
        const adminUser = (_a = request.getCurrentUser) === null || _a === void 0 ? void 0 : _a.call(request);
        if (!(adminUser === null || adminUser === void 0 ? void 0 : adminUser.uuid)) {
            response.status(FORBIDDEN).json({
                error: {
                    status: FORBIDDEN,
                    message: 'Admin login is required'
                }
            });
            return;
        }
        const withdrawalUuid = String(((_b = request.body) === null || _b === void 0 ? void 0 : _b.withdrawal_uuid) || '').trim();
        const reason = String(((_c = request.body) === null || _c === void 0 ? void 0 : _c.reason) || '').trim();
        if (!withdrawalUuid) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'withdrawal_uuid is required'
                }
            });
            return;
        }
        if (!reason) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'reason is required'
                }
            });
            return;
        }
        const result = await failWithdrawal(withdrawalUuid, reason, `admin:${adminUser.uuid}`);
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
//# sourceMappingURL=fail.js.map