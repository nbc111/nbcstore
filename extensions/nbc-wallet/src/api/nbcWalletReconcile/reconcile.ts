import {
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import { reconcileWalletLedger } from '../../services/wallet/reconcileWalletLedger.js';

export default async function reconcileNbcWalletLedger(
  request: any,
  response: any
) {
  try {
    const adminUser = request.getCurrentUser?.();
    if (!adminUser?.uuid) {
      response.status(FORBIDDEN).json({
        error: { status: FORBIDDEN, message: 'Admin login is required' }
      });
      return;
    }

    const result = await reconcileWalletLedger(Number(request.body?.limit) || 100);

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
