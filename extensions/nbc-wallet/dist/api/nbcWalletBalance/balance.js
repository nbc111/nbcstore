import { INTERNAL_SERVER_ERROR, OK, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { getWalletSummary } from '../../services/wallet/getWalletSummary.js';
export default async function getNbcWalletBalance(request, response) {
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
        const wallet = await getWalletSummary(customer.customer_id);
        response.status(OK).json({
            data: {
                wallet
            }
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
//# sourceMappingURL=balance.js.map