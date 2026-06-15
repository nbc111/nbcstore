import {
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import { ensureWalletDepositAddress } from '../../services/wallet/ensureWalletDepositAddress.js';

export default async function getNbcWalletDepositAddress(
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

    const address = await ensureWalletDepositAddress(customer.customer_id);

    response.status(OK).json({
      data: address
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
