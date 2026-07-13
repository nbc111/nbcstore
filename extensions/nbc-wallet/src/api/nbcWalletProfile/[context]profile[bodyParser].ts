import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import { attachCurrentCustomerFromSession } from '../../services/auth/attachCurrentCustomerFromSession.js';
import { isShadowCustomerEmail } from '../../services/auth/isShadowCustomerEmail.js';
import {
  getWalletUserProfile,
  updateWalletUserProfile
} from '../../services/wallet/walletUserProfile.js';

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

export default async function nbcWalletProfile(request: any, response: any) {
  try {
    await attachCurrentCustomerFromSession(request);
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

    if (request.method === 'GET') {
      const profile = await getWalletUserProfile(customer.customer_id);
      response.status(OK).json({ data: { profile: normalizeProfile(profile) } });
      return;
    }

    const profile = await updateWalletUserProfile(customer.customer_id, {
      email: request.body?.email,
      depositNotificationsEnabled:
        request.body?.depositNotificationsEnabled,
      withdrawalNotificationsEnabled:
        request.body?.withdrawalNotificationsEnabled
    });

    response.status(OK).json({ data: { profile: normalizeProfile(profile) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message.includes('Email is invalid')
      ? INVALID_PAYLOAD
      : INTERNAL_SERVER_ERROR;
    response.status(status).json({
      error: {
        status,
        message
      }
    });
  }
}
