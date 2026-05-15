import { INTERNAL_SERVER_ERROR, OK, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { listWalletTransactions } from '../../services/wallet/listWalletTransactions.js';
export default async function getNbcWalletTransactions(request, response) {
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
        const transactions = await listWalletTransactions(customer.customer_id, {
            page: request.query?.page,
            limit: request.query?.limit,
            transactionType: request.query?.transactionType
        });
        response.status(OK).json({
            data: transactions
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
