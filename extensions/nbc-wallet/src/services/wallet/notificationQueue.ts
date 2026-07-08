import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { insert } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';

type WalletNotificationInput = {
  walletId: number;
  customerId: number;
  type: string;
  assetSymbol: string;
  amount: number | string;
  reference?: string | null;
  payload?: Record<string, unknown> | null;
};

export async function enqueueWalletNotification(
  input: WalletNotificationInput
) {
  if (Number(getConfig('nbcWallet.notifications.enabled', 1)) !== 1) {
    return null;
  }

  try {
    const result = await insert('nbc_wallet_notification')
      .given({
        wallet_id: input.walletId,
        customer_id: input.customerId,
        notification_type: input.type,
        asset_symbol: input.assetSymbol,
        amount: String(input.amount),
        reference: input.reference || null,
        payload: input.payload || null,
        status: 'pending'
      })
      .execute(pool);
    return result.insertId || result.notification_id || null;
  } catch {
    return null;
  }
}
