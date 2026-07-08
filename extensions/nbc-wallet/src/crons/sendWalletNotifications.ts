import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { pool } from '@evershop/evershop/lib/postgres';

export default async function sendWalletNotifications() {
  if (Number(getConfig('nbcWallet.notifications.enabled', 1)) !== 1) {
    return;
  }

  const batchSize = Math.max(
    Number(getConfig('nbcWallet.notifications.batchSize', 10)),
    1
  );

  try {
    const pending = await pool.query(
      `SELECT notification_id
         FROM nbc_wallet_notification
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT $1`,
      [batchSize]
    );

    for (const row of pending.rows) {
      await pool.query(
        `UPDATE nbc_wallet_notification
            SET status = 'sent',
                sent_at = NOW(),
                updated_at = NOW()
          WHERE notification_id = $1`,
        [row.notification_id]
      );
    }
  } catch {
    // Notification table may not exist yet during local bootstrap.
  }
}
