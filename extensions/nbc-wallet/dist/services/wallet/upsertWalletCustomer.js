import { commit, insert, rollback, select, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { hashPassword } from '@evershop/evershop/lib/util/passwordHelper';
import { generateShadowCustomerEmail, generateShadowCustomerName, generateShadowCustomerPassword } from '../auth/generateShadowCustomer.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export async function upsertWalletCustomer(walletAddress) {
    const normalizedAddress = normalizeWalletAddress(walletAddress);
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const existingWallet = await select()
            .from('nbc_wallet')
            .where('wallet_address', '=', normalizedAddress)
            .load(connection);
        if (existingWallet) {
            const existingCustomer = await select()
                .from('customer')
                .where('customer_id', '=', existingWallet.customer_id)
                .load(connection);
            if (!existingCustomer) {
                throw new Error('Wallet binding is invalid');
            }
            await connection.query(`UPDATE nbc_wallet
            SET last_login_at = NOW(),
                updated_at = NOW()
          WHERE wallet_id = $1`, [existingWallet.wallet_id]);
            await commit(connection);
            return existingCustomer;
        }
        const customerEmail = generateShadowCustomerEmail(normalizedAddress);
        const existingCustomerByEmail = await select()
            .from('customer')
            .where('email', '=', customerEmail)
            .load(connection);
        if (existingCustomerByEmail) {
            throw new Error('Shadow customer email conflict');
        }
        const customer = await insert('customer')
            .given({
            email: customerEmail,
            full_name: generateShadowCustomerName(normalizedAddress),
            password: hashPassword(generateShadowCustomerPassword()),
            status: 1,
            group_id: 1
        })
            .execute(connection);
        await insert('nbc_wallet')
            .given({
            customer_id: customer.insertId,
            wallet_address: normalizedAddress,
            balance: 0,
            frozen_balance: 0,
            status: 1,
            last_login_at: new Date()
        })
            .execute(connection);
        const createdCustomer = await select()
            .from('customer')
            .where('customer_id', '=', customer.insertId)
            .load(connection);
        await commit(connection);
        return createdCustomer;
    }
    catch (error) {
        await rollback(connection);
        throw error;
    }
}
//# sourceMappingURL=upsertWalletCustomer.js.map