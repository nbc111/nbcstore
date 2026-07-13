import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import { attachCurrentCustomerFromSession } from '../../services/auth/attachCurrentCustomerFromSession.js';
import { establishCustomerSession } from '../../services/auth/establishCustomerSession.js';
import { isShadowCustomerEmail } from '../../services/auth/isShadowCustomerEmail.js';
import { bindWalletCustomer } from '../../services/wallet/bindWalletCustomer.js';
import { getWalletUserProfile } from '../../services/wallet/walletUserProfile.js';

function normalizeProfile(row: any) {
  if (!row) return null;
  return {
    walletId: row.wallet_id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    requiresCustomerEmail: isShadowCustomerEmail(row.customer_email),
    email: row.email,
    emailVerified: Boolean(row.email_verified_at),
    emailVerifiedAt: row.email_verified_at,
    depositNotificationsEnabled:
      Number(row.deposit_notifications_enabled ?? 1) === 1,
    withdrawalNotificationsEnabled:
      Number(row.withdrawal_notifications_enabled ?? 1) === 1
  };
}

function getStatusForError(message: string) {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes('login is required')) {
    return UNAUTHORIZED;
  }
  if (
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('already') ||
    normalizedMessage.includes('linked')
  ) {
    return INVALID_PAYLOAD;
  }
  return INTERNAL_SERVER_ERROR;
}

export default async function nbcWalletBindCustomer(
  request: any,
  response: any
) {
  try {
    await attachCurrentCustomerFromSession(request);
    const currentCustomer = request.getCurrentCustomer();

    if (!currentCustomer) {
      response.status(UNAUTHORIZED).json({
        error: {
          status: UNAUTHORIZED,
          message: 'Customer login is required'
        }
      });
      return;
    }

    const result = await bindWalletCustomer(currentCustomer.customer_id, {
      email: request.body?.email,
      password: request.body?.password,
      fullName: request.body?.fullName
    });

    await establishCustomerSession(request, result.customer);

    const profile = await getWalletUserProfile(result.customer.customer_id);
    response.status(OK).json({
      data: {
        mode: result.mode,
        customer: {
          customerId: result.customer.customer_id,
          uuid: result.customer.uuid,
          email: result.customer.email,
          fullName: result.customer.full_name
        },
        profile: normalizeProfile(profile)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = getStatusForError(message);
    response.status(status).json({
      error: {
        status,
        message
      }
    });
  }
}
