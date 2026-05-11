import {
  INTERNAL_SERVER_ERROR,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import { processOnchainDeposits } from '../../services/wallet/processOnchainDeposits.js';

export default async function processNbcOnchainDeposits(
  request: any,
  response: any
) {
  try {
    const result = await processOnchainDeposits();

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
