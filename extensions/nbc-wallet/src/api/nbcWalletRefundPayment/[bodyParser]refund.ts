import {
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import { refundOrderPayment } from '../../services/wallet/refundOrderPayment.js';

export default async function refundNbcOrder(
  request: any,
  response: any
) {
  try {
    const orderUuid =
      request.params?.order_uuid ||
      request.body?.order_uuid ||
      request.body?.order_id;
    const adminUser = request.getCurrentUser?.();

    if (!orderUuid) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'order_uuid is required'
        }
      });
      return;
    }

    if (!adminUser?.uuid) {
      response.status(FORBIDDEN).json({
        error: {
          status: FORBIDDEN,
          message: 'Admin login is required'
        }
      });
      return;
    }

    const result = await refundOrderPayment(
      orderUuid,
      `admin:${adminUser.uuid}`
    );

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
