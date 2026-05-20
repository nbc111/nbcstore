import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import { getOnchainNbcBalance } from '../../services/wallet/getOnchainNbcBalance.js';

export default async function getNbcWalletOnchainBalance(
  request: any,
  response: any
) {
  try {
    const walletAddress = String(
      request.query?.walletAddress || request.query?.address || ''
    ).trim();

    if (!walletAddress) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'walletAddress query parameter is required'
        }
      });
      return;
    }

    const balance = await getOnchainNbcBalance(walletAddress);

    response.status(OK).json({
      data: balance
    });
  } catch (error) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Request failed'
      }
    });
  }
}
