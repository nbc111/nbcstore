import {
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import { listWithdrawals } from '../../services/wallet/listWithdrawals.js';

export default async function getNbcWalletWithdrawals(
  request: any,
  response: any
) {
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

    const limit = Number(request.query?.limit || 20);
    const items = await listWithdrawals(customer.customer_id, limit);

    response.status(OK).json({
      data: {
        items
      }
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
