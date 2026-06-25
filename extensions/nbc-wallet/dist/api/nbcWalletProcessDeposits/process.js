import { FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from '@evershop/evershop/lib/util/httpStatus';
import { processOnchainDeposits } from '../../services/wallet/processOnchainDeposits.js';
export default async function processNbcOnchainDeposits(request, response) {
    try {
        const adminUser = request.getCurrentUser?.();
        if (!adminUser?.uuid) {
            response.status(FORBIDDEN).json({
                error: {
                    status: FORBIDDEN,
                    message: 'Admin login is required'
                }
            });
            return;
        }
        const result = await processOnchainDeposits();
        response.status(OK).json({
            data: result
        });
    } catch (error) {
        response.status(INTERNAL_SERVER_ERROR).json({
            error: {
                status: INTERNAL_SERVER_ERROR,
                message: error.message
            }
        });
    }
}
