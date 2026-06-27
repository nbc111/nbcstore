import { FORBIDDEN, INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK } from '@evershop/evershop/lib/util/httpStatus';
import { adjustWalletBalance } from '../../services/wallet/adjustWalletBalance.js';
export default async function adjustNbcWalletBalance(request, response) {
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
        const { walletId, customerId, walletAddress, type, amount, reason, reference } = request.body || {};
        if (!walletId && !customerId && !walletAddress) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'walletId, customerId or walletAddress is required'
                }
            });
            return;
        }
        const result = await adjustWalletBalance({
            walletId: walletId ? Number(walletId) : undefined,
            customerId: customerId ? Number(customerId) : undefined,
            walletAddress,
            type,
            amount: Number(amount),
            reason,
            reference,
            performedBy: adminUser?.uuid ? `admin:${adminUser.uuid}` : 'admin'
        });
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
