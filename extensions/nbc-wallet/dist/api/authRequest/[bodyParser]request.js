import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK } from '@evershop/evershop/lib/util/httpStatus';
import { isValidWalletAddress } from '../../services/wallet/isValidWalletAddress.js';
import { upsertWalletAuthNonce } from '../../services/wallet/upsertWalletAuthNonce.js';
export default async function requestWalletAuth(request, response) {
    try {
        const walletAddress = request.body?.walletAddress;
        if (!walletAddress) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'walletAddress is required'
                }
            });
            return;
        }
        if (!isValidWalletAddress(walletAddress)) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'walletAddress is invalid'
                }
            });
            return;
        }
        const nonceRow = await upsertWalletAuthNonce(walletAddress);
        response.status(OK).json({
            data: {
                walletAddress: nonceRow.wallet_address,
                nonce: nonceRow.nonce,
                message: nonceRow.message,
                expiresAt: nonceRow.expires_at
            }
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
