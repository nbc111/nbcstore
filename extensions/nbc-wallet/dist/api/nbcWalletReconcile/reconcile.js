import { INTERNAL_SERVER_ERROR, OK } from '@evershop/evershop/lib/util/httpStatus';
import { reconcileWalletLedger } from '../../services/wallet/reconcileWalletLedger.js';
export default async function reconcileNbcWalletLedger(request, response) {
    var _a;
    try {
        const result = await reconcileWalletLedger(Number((_a = request.body) === null || _a === void 0 ? void 0 : _a.limit) || 100);
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