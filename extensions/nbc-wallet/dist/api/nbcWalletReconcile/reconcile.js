import { FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from '@evershop/evershop/lib/util/httpStatus';
import { reconcileWalletLedger } from '../../services/wallet/reconcileWalletLedger.js';
export default async function reconcileNbcWalletLedger(request, response) {
    var _a, _b;
    try {
        const adminUser = (_a = request.getCurrentUser) === null || _a === void 0 ? void 0 : _a.call(request);
        if (!(adminUser === null || adminUser === void 0 ? void 0 : adminUser.uuid)) {
            response.status(FORBIDDEN).json({
                error: { status: FORBIDDEN, message: 'Admin login is required' }
            });
            return;
        }
        const result = await reconcileWalletLedger(Number((_b = request.body) === null || _b === void 0 ? void 0 : _b.limit) || 100);
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
//# sourceMappingURL=reconcile.js.map