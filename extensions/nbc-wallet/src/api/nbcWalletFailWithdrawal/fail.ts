import {
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import { failWithdrawal } from '../../services/wallet/failWithdrawal.js';

export default async function markNbcWalletWithdrawalFailed(
  request: any,
  response: any
) {
  try {
    const adminUser = request.getCurrentUser?.();
    if (!adminUser?.uuid) {
      response.status(FORBIDDEN).json({
        error: {
          status: FORBIDDEN,
          message: 'Admin login is required'
        }
      });
      return;
    }

    const withdrawalUuid = String(request.body?.withdrawal_uuid || '').trim();
    const reason = String(request.body?.reason || '').trim();

    if (!withdrawalUuid) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'withdrawal_uuid is required'
        }
      });
      return;
    }

    if (!reason) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'reason is required'
        }
      });
      return;
    }

    const result = await failWithdrawal(
      withdrawalUuid,
      reason,
      `admin:${adminUser.uuid}`
    );

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
