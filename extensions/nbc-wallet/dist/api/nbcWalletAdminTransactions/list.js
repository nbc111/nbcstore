import { FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from '@evershop/evershop/lib/util/httpStatus';
import { listAdminTransactions } from '../../services/wallet/listAdminTransactions.js';
export default async function listNbcWalletAdminTransactions(request, response) {
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
        const { walletId, customerId, walletAddress, transactionType, dateFrom, dateTo, limit, page } = request.query || {};
        const result = await listAdminTransactions({
            walletId: walletId ? Number(walletId) : undefined,
            customerId: customerId ? Number(customerId) : undefined,
            walletAddress: walletAddress ? String(walletAddress) : undefined,
            transactionType: transactionType ? String(transactionType) : undefined,
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
