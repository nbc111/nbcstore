import { FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from '@evershop/evershop/lib/util/httpStatus';
import { listAdminWithdrawals } from '../../services/wallet/listAdminWithdrawals.js';
export default async function listNbcWalletAdminWithdrawals(request, response) {
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
        const { status, walletAddress, customerId, dateFrom, dateTo, limit, page } = request.query || {};
        const result = await listAdminWithdrawals({
            status: status ? String(status) : undefined,
            walletAddress: walletAddress ? String(walletAddress) : undefined,
            customerId: customerId ? Number(customerId) : undefined,
            dateFrom: dateFrom ? String(dateFrom) : undefined,
            dateTo: dateTo ? String(dateTo) : undefined,
            limit: limit ? Number(limit) : 20,
            page: page ? Number(page) : 1
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
