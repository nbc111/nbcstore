import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import { establishCustomerSession } from '../../services/auth/establishCustomerSession.js';
import { verifyWalletSignature } from '../../services/auth/verifyWalletSignature.js';
import { getWalletCustomerByAddress } from '../../services/wallet/getWalletCustomerByAddress.js';
import { isValidWalletAddress } from '../../services/wallet/isValidWalletAddress.js';
import { upsertWalletCustomer } from '../../services/wallet/upsertWalletCustomer.js';
import { useWalletAuthNonce } from '../../services/wallet/useWalletAuthNonce.js';

export default async function verifyWalletAuth(
  request: any,
  response: any
) {
  try {
    const walletAddress = request.body?.walletAddress;
    const signature = request.body?.signature;
    const nonce = request.body?.nonce;

    if (!walletAddress || !signature || !nonce) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'walletAddress, signature and nonce are required'
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

    const nonceRow = await useWalletAuthNonce(walletAddress, nonce);

    if (!nonceRow) {
      response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'Nonce is invalid or expired'
        }
      });
      return;
    }

    const isValidSignature = verifyWalletSignature(
      walletAddress,
      nonceRow.message,
      signature
    );

    if (!isValidSignature) {
      response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'Signature verification failed'
        }
      });
      return;
    }

    let customer = await getWalletCustomerByAddress(walletAddress);
    if (!customer) {
      customer = await upsertWalletCustomer(walletAddress);
    }

    if (Number(customer.status) !== 1 && Number(customer.customer_status) !== 1) {
      response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'Customer account is inactive'
        }
      });
      return;
    }

    await establishCustomerSession(request, {
      customer_id: customer.customer_id,
      group_id: customer.group_id,
      uuid: customer.customer_uuid ?? customer.uuid,
      email: customer.email,
      full_name: customer.full_name,
      status: customer.customer_status ?? customer.status,
      created_at: customer.customer_created_at ?? customer.created_at,
      updated_at: customer.customer_updated_at ?? customer.updated_at
    });

    response.status(OK).json({
      data: {
        sid: request.sessionID,
        customer: {
          customerId: customer.customer_id,
          uuid: customer.customer_uuid ?? customer.uuid,
          email: customer.email,
          fullName: customer.full_name
        },
        wallet: {
          address: nonceRow.wallet_address
        }
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
