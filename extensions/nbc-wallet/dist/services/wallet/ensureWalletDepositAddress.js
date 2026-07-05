import { commit, rollback, startTransaction } from '@evershop/postgres-query-builder';
import { getConnection } from '@evershop/evershop/lib/postgres';
import { deriveDepositAddress } from './deriveDepositAddress.js';
import { getOnchainConfig } from './getOnchainConfig.js';
export async function ensureWalletDepositAddress(customerId, assetSymbol = 'NBC') {
    const config = getOnchainConfig(assetSymbol);
    if (config.depositMode !== 'hd') {
        return {
            mode: config.depositMode,
            depositAddress: config.treasuryAddress || null,
            addressIndex: null,
            chainId: config.chainId,
            tokenAddress: config.tokenAddress
        };
    }
    const connection = await getConnection();
    try {
        await startTransaction(connection);
        const walletResult = await connection.query(`SELECT *
         FROM nbc_wallet
        WHERE customer_id = $1
        FOR UPDATE`, [customerId]);
        const wallet = walletResult.rows[0];
        if (!wallet) {
            throw new Error('NBC wallet not found');
        }
        if (wallet.deposit_address) {
            await commit(connection);
            return {
                mode: config.depositMode,
                walletId: wallet.wallet_id,
                customerId: wallet.customer_id,
                depositAddress: wallet.deposit_address,
                addressIndex: wallet.address_index === null ? null : Number(wallet.address_index),
                chainId: config.chainId,
                tokenAddress: config.tokenAddress
            };
        }
        await connection.query('LOCK TABLE nbc_wallet IN EXCLUSIVE MODE');
        const indexResult = await connection.query(`SELECT COALESCE(MAX(address_index), -1) + 1 AS next_index
         FROM nbc_wallet`);
        const addressIndex = Number(indexResult.rows[0].next_index);
        const depositAddress = deriveDepositAddress(addressIndex);
        await connection.query(`UPDATE nbc_wallet
          SET deposit_address = $1,
              address_index = $2,
              updated_at = NOW()
        WHERE wallet_id = $3`, [depositAddress, addressIndex, wallet.wallet_id]);
        await commit(connection);
        return {
            mode: config.depositMode,
            walletId: wallet.wallet_id,
            customerId: wallet.customer_id,
            depositAddress,
            addressIndex,
            chainId: config.chainId,
            tokenAddress: config.tokenAddress
        };
    }
    catch (error) {
        await rollback(connection);
        throw error;
    }
}
//# sourceMappingURL=ensureWalletDepositAddress.js.map