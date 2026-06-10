import { FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from '@evershop/evershop/lib/util/httpStatus';
import { processOnchainDeposits } from '../../services/wallet/processOnchainDeposits.js';
export default async function processNbcOnchainDeposits(request, response) {
    var _a;
    try {
        const adminUser = (_a = request.getCurrentUser) === null || _a === void 0 ? void 0 : _a.call(request);
        if (!(adminUser === null || adminUser === void 0 ? void 0 : adminUser.uuid)) {
            response.status(FORBIDDEN).json({
                error: { status: FORBIDDEN, message: 'Admin login is required' }
            });
            return;
        }
        const result = await processOnchainDeposits();
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
//# sourceMappingURL=process.js.map