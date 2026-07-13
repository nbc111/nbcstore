import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { comparePassword } from '@evershop/evershop/lib/util/passwordHelper';
import { isShadowCustomerEmail } from '../auth/isShadowCustomerEmail.js';

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadCustomerById(connection: any, customerId: number) {
  const result = await connection.query(
    `SELECT *
       FROM customer
      WHERE customer_id = $1`,
    [customerId]
  );
  return result.rows[0] || null;
}

async function loadCustomerByEmail(connection: any, email: string) {
  const result = await connection.query(
    `SELECT *
       FROM customer
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

async function loadWalletByCustomerId(connection: any, customerId: number) {
  const result = await connection.query(
    `SELECT *
       FROM nbc_wallet
      WHERE customer_id = $1`,
    [customerId]
  );
  return result.rows[0] || null;
}

export async function bindWalletCustomer(
  currentCustomerId: number,
  input: {
    email: string;
    password?: string;
    fullName?: string;
  }
) {
  const email = normalizeEmail(input.email);
  if (!email || !isEmail(email)) {
    throw new Error('Email is invalid');
  }

  const connection = await getConnection();

  try {
    await startTransaction(connection);

    const currentCustomer = await loadCustomerById(
      connection,
      currentCustomerId
    );
    if (!currentCustomer) {
      throw new Error('Customer login is required');
    }

    const wallet = await loadWalletByCustomerId(connection, currentCustomerId);
    if (!wallet) {
      throw new Error('NBC wallet not found');
    }

    const existingCustomer = await loadCustomerByEmail(connection, email);
    const fullName = String(input.fullName || '').trim();

    if (
      existingCustomer &&
      Number(existingCustomer.customer_id) !== Number(currentCustomerId)
    ) {
      if (!isShadowCustomerEmail(currentCustomer.email)) {
        throw new Error('This wallet is already linked to a customer account');
      }

      if (!input.password) {
        throw new Error('Password is required to bind an existing account');
      }

      const passwordMatches = comparePassword(
        input.password,
        existingCustomer.password || ''
      );
      if (!passwordMatches || Number(existingCustomer.status) !== 1) {
        throw new Error('Invalid email or password');
      }

      const targetWallet = await loadWalletByCustomerId(
        connection,
        existingCustomer.customer_id
      );
      if (targetWallet) {
        throw new Error('Existing account already has an NBC wallet');
      }

      await connection.query(
        `UPDATE nbc_wallet
            SET customer_id = $1,
                updated_at = NOW()
          WHERE wallet_id = $2`,
        [existingCustomer.customer_id, wallet.wallet_id]
      );
      await connection.query(
        `UPDATE nbc_wallet_asset_balance
            SET customer_id = $1,
                updated_at = NOW()
          WHERE wallet_id = $2`,
        [existingCustomer.customer_id, wallet.wallet_id]
      );
      await connection.query(
        `UPDATE nbc_wallet_deposit_address
            SET customer_id = $1,
                updated_at = NOW()
          WHERE wallet_id = $2`,
        [existingCustomer.customer_id, wallet.wallet_id]
      );
      await connection.query(
        `UPDATE nbc_withdrawal
            SET customer_id = $1,
                updated_at = NOW()
          WHERE wallet_id = $2`,
        [existingCustomer.customer_id, wallet.wallet_id]
      );
      await connection.query(
        `UPDATE nbc_wallet_user_profile
            SET customer_id = $1,
                email = COALESCE(email, $2),
                updated_at = NOW()
          WHERE wallet_id = $3`,
        [existingCustomer.customer_id, existingCustomer.email, wallet.wallet_id]
      );
      await connection.query(
        `UPDATE nbc_wallet_notification_queue
            SET customer_id = $1,
                email = COALESCE(email, $2),
                updated_at = NOW()
          WHERE wallet_id = $3`,
        [existingCustomer.customer_id, existingCustomer.email, wallet.wallet_id]
      );

      const targetCustomer = await loadCustomerById(
        connection,
        existingCustomer.customer_id
      );
      await commit(connection);
      delete targetCustomer.password;
      return {
        customer: targetCustomer,
        mode: 'bound_existing'
      };
    }

    const customerUpdates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    if (
      !existingCustomer ||
      Number(existingCustomer.customer_id) === Number(currentCustomerId)
    ) {
      values.push(email);
      customerUpdates.push(`email = $${values.length}`);
    }
    if (fullName) {
      values.push(fullName);
      customerUpdates.push(`full_name = $${values.length}`);
    }
    values.push(currentCustomerId);
    await connection.query(
      `UPDATE customer
          SET ${customerUpdates.join(', ')}
        WHERE customer_id = $${values.length}`,
      values
    );

    await connection.query(
      `INSERT INTO nbc_wallet_user_profile (
          wallet_id,
          customer_id,
          email,
          email_verified_at,
          deposit_notifications_enabled,
          withdrawal_notifications_enabled
        )
        VALUES ($1, $2, $3, NULL, 1, 1)
        ON CONFLICT ("wallet_id")
        DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          email = EXCLUDED.email,
          email_verified_at = CASE
            WHEN nbc_wallet_user_profile.email IS DISTINCT FROM EXCLUDED.email
            THEN NULL
            ELSE nbc_wallet_user_profile.email_verified_at
          END,
          updated_at = NOW()`,
      [wallet.wallet_id, currentCustomerId, email]
    );

    const updatedCustomer = await loadCustomerById(connection, currentCustomerId);
    await commit(connection);
    delete updatedCustomer.password;
    return {
      customer: updatedCustomer,
      mode: isShadowCustomerEmail(currentCustomer.email)
        ? 'upgraded_shadow'
        : 'updated_customer'
    };
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
