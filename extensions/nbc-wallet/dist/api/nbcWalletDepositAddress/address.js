import { INVALID_PAYLOAD, INTERNAL_SERVER_ERROR, OK, TOO_MANY_REQUESTS, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { checkRateLimit, getRequestRateLimitKey } from '../../services/security/rateLimit.js';
import { ensureWalletDepositAddress } from '../../services/wallet/ensureWalletDepositAddress.js';
function mapDepositAddressError(error) {
    const message = error instanceof Error ? String(error.message || '') : String(error || '');
    const normalized = message.toLowerCase();
    if (normalized.includes('hdmastermnemonic is required') || normalized.includes('treasuryaddress is required')) {
        return {
            status: INVALID_PAYLOAD,
            message: 'On-chain deposit is not configured yet. Please contact support.'
        };
    }
    if (normalized.includes('wallet not found')) {
        return {
            status: INVALID_PAYLOAD,
            message: 'Wallet account is not ready. Please try reconnecting your wallet.'
        };
    }
    return {
        status: INTERNAL_SERVER_ERROR,
        message: 'Failed to get deposit address'
    };
}
export default async function getNbcWalletDepositAddress(request, response) {
    try {
        const customer = request.getCurrentCustomer();
        if (!customer) {
            response.status(UNAUTHORIZED).json({
                error: {
                    status: UNAUTHORIZED,
                    message: 'Please connect wallet and sign in first.'
                }
            });
            return;
        }
        const assetSymbol = request.query?.assetSymbol || request.query?.asset || request.body?.assetSymbol || request.body?.asset;
        const rateLimit = checkRateLimit({
            scope: 'wallet_deposit_address',
            keys: [
                getRequestRateLimitKey(request, customer.customer_id, assetSymbol)
            ],
            limit: Number(getConfig('nbcWallet.rateLimit.depositAddress.limit', 20)),
            windowSeconds: Number(getConfig('nbcWallet.rateLimit.depositAddress.windowSeconds', 60))
        });
        if (!rateLimit.allowed) {
            response.status(TOO_MANY_REQUESTS).json({
                error: {
                    status: TOO_MANY_REQUESTS,
                    message: 'Too many requests. Please try again later.'
                }
            });
            return;
        }
        const address = await ensureWalletDepositAddress(customer.customer_id, assetSymbol);
        response.status(OK).json({
            data: address
        });
    } catch (error) {
        const mapped = mapDepositAddressError(error);
        response.status(mapped.status).json({
            error: {
                status: mapped.status,
                message: mapped.message
            }
        });
    }
}
