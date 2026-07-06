import { FORBIDDEN, INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK } from '@evershop/evershop/lib/util/httpStatus';
import { refundOrderPayment } from '../../services/wallet/refundOrderPayment.js';
export default async function refundNbcOrder(request, response) {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const orderUuid = ((_a = request.params) === null || _a === void 0 ? void 0 : _a.order_uuid) ||
            ((_b = request.body) === null || _b === void 0 ? void 0 : _b.order_uuid) ||
            ((_c = request.body) === null || _c === void 0 ? void 0 : _c.order_id);
        const adminUser = (_d = request.getCurrentUser) === null || _d === void 0 ? void 0 : _d.call(request);
        if (!orderUuid) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'order_uuid is required'
                }
            });
            return;
        }
        if (!(adminUser === null || adminUser === void 0 ? void 0 : adminUser.uuid)) {
            response.status(FORBIDDEN).json({
                error: {
                    status: FORBIDDEN,
                    message: 'Admin login is required'
                }
            });
            return;
        }
        const result = await refundOrderPayment(orderUuid, `admin:${adminUser.uuid}`, {
            amount: (_e = request.body) === null || _e === void 0 ? void 0 : _e.amount,
            items: ((_f = request.body) === null || _f === void 0 ? void 0 : _f.items) || ((_g = request.body) === null || _g === void 0 ? void 0 : _g.line_items)
        });
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
//# sourceMappingURL=%5BbodyParser%5Drefund.js.map