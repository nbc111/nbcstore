import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { captureOrderPayment } from '../../services/wallet/captureOrderPayment.js';
export default async function captureNbcOrder(request, response) {
    var _a, _b, _c;
    try {
        const orderUuid = ((_a = request.params) === null || _a === void 0 ? void 0 : _a.order_uuid) ||
            ((_b = request.body) === null || _b === void 0 ? void 0 : _b.order_uuid) ||
            ((_c = request.body) === null || _c === void 0 ? void 0 : _c.order_id);
        const customer = request.getCurrentCustomer();
        if (!orderUuid) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'order_uuid is required'
                }
            });
            return;
        }
        if (!customer) {
            response.status(UNAUTHORIZED).json({
                error: {
                    status: UNAUTHORIZED,
                    message: 'Customer login is required'
                }
            });
            return;
        }
        const result = await captureOrderPayment(orderUuid, customer.customer_id);
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
//# sourceMappingURL=%5BbodyParser%5Dcapture.js.map