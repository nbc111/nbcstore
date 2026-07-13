import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import { captureOrderPayment } from '../../services/wallet/captureOrderPayment.js';

export default async function captureNbcOrder(
  request: any,
  response: any
) {
  try {
    const orderUuid =
      request.params?.order_uuid ||
      request.body?.order_uuid ||
      request.body?.order_id;
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

    const result = await captureOrderPayment(
      orderUuid,
      customer.customer_id,
      request.body?.assetSymbol || request.body?.asset
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
