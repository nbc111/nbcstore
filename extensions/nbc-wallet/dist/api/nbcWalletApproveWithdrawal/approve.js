import { FORBIDDEN, INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK } from '@evershop/evershop/lib/util/httpStatus';
import { approveWithdrawal } from '../../services/wallet/approveWithdrawal.js';
export default async function approveNbcWalletWithdrawal(request, response) {
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
        const withdrawalUuid = String(request.body?.withdrawal_uuid || '').trim();
        if (!withdrawalUuid) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'withdrawal_uuid is required'
                }
            });
            return;
        }
        const result = await approveWithdrawal(withdrawalUuid, `admin:${adminUser.uuid}`);
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
