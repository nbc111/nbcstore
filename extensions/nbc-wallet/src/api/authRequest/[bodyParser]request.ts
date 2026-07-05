import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  TOO_MANY_REQUESTS
} from '@evershop/evershop/lib/util/httpStatus';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getOnchainConfig } from '../../services/wallet/getOnchainConfig.js';
import { getRequestDomain } from '../../services/security/getRequestDomain.js';
import {
  checkRateLimit,
  getRequestRateLimitKey
} from '../../services/security/rateLimit.js';
import { isValidWalletAddress } from '../../services/wallet/isValidWalletAddress.js';
import { upsertWalletAuthNonce } from '../../services/wallet/upsertWalletAuthNonce.js';

export default async function requestWalletAuth(
  request: any,
  response: any
) {
  try {
    const walletAddress = request.body?.walletAddress;
    const rateLimit = checkRateLimit({
      scope: 'wallet_auth_request',
      keys: [getRequestRateLimitKey(request, walletAddress)],
      limit: Number(getConfig('nbcWallet.rateLimit.authRequest.limit', 10)),
      windowSeconds: Number(
        getConfig('nbcWallet.rateLimit.authRequest.windowSeconds', 60)
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
          message: 'walletAddress is required'
        }
      });
      return;
    }

    if (!isValidWalletAddress(walletAddress)) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'walletAddress is invalid'
        }
      });
      return;
    }

    const nonceRow = await upsertWalletAuthNonce(walletAddress, {
      domain: getRequestDomain(request),
      chainId: getOnchainConfig().chainId,
      purpose: 'wallet_login'
    });

    response.status(OK).json({
      data: {
        walletAddress: nonceRow.wallet_address,
        nonce: nonceRow.nonce,
        message: nonceRow.message,
        expiresAt: nonceRow.expires_at
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
