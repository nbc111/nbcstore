import { pool } from '@evershop/evershop/lib/postgres';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function getWalletUserProfile(customerId: number) {
  const result = await pool.query(
    `SELECT w.wallet_id,
            w.customer_id,
            c.email AS customer_email,
            p.email,
            p.email_verified_at,
            p.deposit_notifications_enabled,
            p.withdrawal_notifications_enabled
       FROM nbc_wallet w
       INNER JOIN customer c ON c.customer_id = w.customer_id
       LEFT JOIN nbc_wallet_user_profile p ON p.wallet_id = w.wallet_id
      WHERE w.customer_id = $1`,
    [customerId]
  );
  return result.rows[0] || null;
}

export async function updateWalletUserProfile(
  customerId: number,
  input: {
    email?: string;
    depositNotificationsEnabled?: boolean;
    withdrawalNotificationsEnabled?: boolean;
  }
) {
  const current = await getWalletUserProfile(customerId);
  if (!current) {
    throw new Error('NBC wallet not found');
  }

  const email =
    input.email === undefined ? current.email : String(input.email || '').trim();
  if (email && !isEmail(email)) {
    throw new Error('Email is invalid');
  }

  const depositEnabled =
    input.depositNotificationsEnabled === undefined
      ? Number(current.deposit_notifications_enabled ?? 1)
      : input.depositNotificationsEnabled
        ? 1
        : 0;
  const withdrawalEnabled =
    input.withdrawalNotificationsEnabled === undefined
      ? Number(current.withdrawal_notifications_enabled ?? 1)
      : input.withdrawalNotificationsEnabled
        ? 1
        : 0;

  await pool.query(
    `INSERT INTO nbc_wallet_user_profile (
        wallet_id,
        customer_id,
        email,
        email_verified_at,
        deposit_notifications_enabled,
        withdrawal_notifications_enabled
      )
      VALUES ($1, $2, $3, NULL, $4, $5)
      ON CONFLICT ("wallet_id")
      DO UPDATE SET
        email = EXCLUDED.email,
        email_verified_at = CASE
          WHEN nbc_wallet_user_profile.email IS DISTINCT FROM EXCLUDED.email
          THEN NULL
          ELSE nbc_wallet_user_profile.email_verified_at
        END,
        deposit_notifications_enabled = EXCLUDED.deposit_notifications_enabled,
        withdrawal_notifications_enabled = EXCLUDED.withdrawal_notifications_enabled,
        updated_at = NOW()`,
    [
      current.wallet_id,
      current.customer_id,
      email || null,
      depositEnabled,
      withdrawalEnabled
    ]
  );

  return getWalletUserProfile(customerId);
}
