import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  TOO_MANY_REQUESTS
} from '@evershop/evershop/lib/util/httpStatus';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import {
  checkRateLimit,
  getRequestRateLimitKey
} from '../../services/security/rateLimit.js';
import { getOnchainNbcBalance } from '../../services/wallet/getOnchainNbcBalance.js';

export default async function getNbcWalletOnchainBalance(
  request: any,
  response: any
) {
  try {
    const walletAddress = String(
      request.query?.walletAddress || request.query?.address || ''
    ).trim();
    const rateLimit = checkRateLimit({
      scope: 'wallet_onchain_balance',
      keys: [getRequestRateLimitKey(request, walletAddress)],
      limit: Number(getConfig('nbcWallet.rateLimit.onchainBalance.limit', 30)),
      windowSeconds: Number(
        getConfig('nbcWallet.rateLimit.onchainBalance.windowSeconds', 60)
      )
    });

    if (!rateLimit.allowed) {
      response.status(TOO_MANY_REQUESTS).json({
        error: {
          status: TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.'
        }
      });
      return;
    }

    if (!walletAddress) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'walletAddress query parameter is required'
        }
      });
      return;
    }

    const balance = await getOnchainNbcBalance(
      walletAddress,
      request.query?.assetSymbol || request.query?.asset
    );

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
