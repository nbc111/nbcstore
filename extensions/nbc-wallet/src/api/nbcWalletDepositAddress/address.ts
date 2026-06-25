import {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import { ensureWalletDepositAddress } from '../../services/wallet/ensureWalletDepositAddress.js';

function mapDepositAddressError(error: unknown): {
  status: number;
  message: string;
} {
  const message =
    error instanceof Error ? String(error.message || '') : String(error || '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('hdmastermnemonic is required') ||
    normalized.includes('treasuryaddress is required')
  ) {
    return {
      status: INVALID_PAYLOAD,
      message: 'On-chain deposit is not configured yet. Please contact support.'
    };
  }

  if (normalized.includes('wallet not found')) {
    return {
      status: INVALID_PAYLOAD,
      message: 'Wallet account is not ready. Please try reconnecting your wallet.'
    };
  }

  return {
    status: INTERNAL_SERVER_ERROR,
    message: 'Failed to get deposit address'
  };
}

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
          message: 'Please connect wallet and sign in first.'
        }
      });
      return;
    }

    const address = await ensureWalletDepositAddress(customer.customer_id);

    response.status(OK).json({
      data: address
    });
  } catch (error) {
    const mapped = mapDepositAddressError(error);
    response.status(mapped.status).json({
      error: {
        status: mapped.status,
        message: mapped.message
      }
    });
  }
}
