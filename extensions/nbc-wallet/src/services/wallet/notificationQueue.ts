import { pool } from '@evershop/evershop/lib/postgres';
import { sendEmail } from '@evershop/evershop/lib/mail/emailHelper';

type WalletNotificationInput = {
  walletId: number;
  customerId: number;
  type: 'deposit' | 'withdrawal_completed' | 'withdrawal_failed';
  assetSymbol: string;
  amount?: string | number;
  reference?: string | null;
  payload?: Record<string, unknown>;
};

function isUsableEmail(email?: string | null) {
  return Boolean(email && !String(email).endsWith('@nbc.local'));
}

function notificationTitle(type: string) {
  if (type === 'deposit') return '入金到账';
  if (type === 'withdrawal_completed') return '提现完成';
  if (type === 'withdrawal_failed') return '提现失败';
  return '钱包通知';
}

export async function enqueueWalletNotification(input: WalletNotificationInput) {
  const emailResult = await pool.query(
    `SELECT COALESCE(p.email, NULLIF(c.email, '')) AS email,
            p.deposit_notifications_enabled,
            p.withdrawal_notifications_enabled
       FROM nbc_wallet w
       INNER JOIN customer c ON c.customer_id = w.customer_id
       LEFT JOIN nbc_wallet_user_profile p ON p.wallet_id = w.wallet_id
      WHERE w.wallet_id = $1
        AND w.customer_id = $2`,
    [input.walletId, input.customerId]
  );
  const profile = emailResult.rows[0];
  const email = profile?.email;
  const enabled =
    input.type === 'deposit'
      ? Number(profile?.deposit_notifications_enabled ?? 1) === 1
      : Number(profile?.withdrawal_notifications_enabled ?? 1) === 1;

  await pool.query(
    `INSERT INTO nbc_wallet_notification_queue (
        wallet_id,
        customer_id,
        email,
        notification_type,
        asset_symbol,
        amount,
        reference,
        payload,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.walletId,
      input.customerId,
      isUsableEmail(email) ? email : null,
      input.type,
      input.assetSymbol,
      input.amount === undefined ? null : Number(input.amount),
      input.reference || null,
      input.payload || null,
      enabled && isUsableEmail(email) ? 'pending' : 'no_email'
    ]
  );
}

function buildBatchBody(items: any[]) {
  const rows = items
    .map((item) => {
      const amount =
        item.amount === null ? '' : `${Number(item.amount).toLocaleString()} ${item.asset_symbol}`;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${notificationTitle(item.notification_type)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${amount}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;word-break:break-all;">${item.reference || ''}</td>
      </tr>`;
    })
    .join('');

  return `<div>
    <p>您的 NBC 商城钱包有新的资金变动：</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">类型</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">金额</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Hash / Reference</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export async function flushWalletNotifications() {
  const batchResult = await pool.query(
    `SELECT customer_id, email, COUNT(*)::int AS total, MIN(created_at) AS oldest
       FROM nbc_wallet_notification_queue
      WHERE status = 'pending'
        AND email IS NOT NULL
      GROUP BY customer_id, email
     HAVING COUNT(*) >= 10 OR MIN(created_at) <= NOW() - INTERVAL '5 minutes'`
  );

  let sent = 0;
  for (const batch of batchResult.rows) {
    const lockResult = await pool.query(
      `SELECT *
         FROM nbc_wallet_notification_queue
        WHERE status = 'pending'
          AND customer_id = $1
          AND email = $2
        ORDER BY created_at ASC
        LIMIT 50`,
      [batch.customer_id, batch.email]
    );
    const items = lockResult.rows;
    if (items.length === 0) continue;

    const ids = items.map((item) => item.notification_id);
    const batchKey = `${batch.customer_id}:${Date.now()}`;
    try {
      await sendEmail('nbc_wallet_notifications', {
        to: batch.email,
        subject: `NBC 商城钱包通知（${items.length} 条）`,
        template: buildBatchBody(items),
        data: {}
      });
      await pool.query(
        `UPDATE nbc_wallet_notification_queue
            SET status = 'sent',
                batch_key = $1,
                sent_at = NOW(),
                updated_at = NOW()
          WHERE notification_id = ANY($2::int[])`,
        [batchKey, ids]
      );
      sent += items.length;
    } catch (error) {
      await pool.query(
        `UPDATE nbc_wallet_notification_queue
            SET status = 'failed',
                error_message = $1,
                updated_at = NOW()
          WHERE notification_id = ANY($2::int[])`,
        [error instanceof Error ? error.message : String(error), ids]
      );
    }
  }

  return { sent };
}
