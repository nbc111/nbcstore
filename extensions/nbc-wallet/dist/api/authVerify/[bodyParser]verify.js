import { INTERNAL_SERVER_ERROR, INVALID_PAYLOAD, OK, UNAUTHORIZED } from '@evershop/evershop/lib/util/httpStatus';
import { establishCustomerSession } from '../../services/auth/establishCustomerSession.js';
import { verifyWalletSignature } from '../../services/auth/verifyWalletSignature.js';
import { getWalletCustomerByAddress } from '../../services/wallet/getWalletCustomerByAddress.js';
import { isValidWalletAddress } from '../../services/wallet/isValidWalletAddress.js';
import { upsertWalletCustomer } from '../../services/wallet/upsertWalletCustomer.js';
import { useWalletAuthNonce } from '../../services/wallet/useWalletAuthNonce.js';
export default async function verifyWalletAuth(request, response) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const walletAddress = (_a = request.body) === null || _a === void 0 ? void 0 : _a.walletAddress;
        const signature = (_b = request.body) === null || _b === void 0 ? void 0 : _b.signature;
        const nonce = (_c = request.body) === null || _c === void 0 ? void 0 : _c.nonce;
        if (!walletAddress || !signature || !nonce) {
            response.status(INVALID_PAYLOAD).json({
                error: {
                    status: INVALID_PAYLOAD,
                    message: 'walletAddress, signature and nonce are required'
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
        const nonceRow = await useWalletAuthNonce(walletAddress, nonce);
        if (!nonceRow) {
            response.status(UNAUTHORIZED).json({
                error: {
                    status: UNAUTHORIZED,
                    message: 'Nonce is invalid or expired'
                }
            });
            return;
        }
        const isValidSignature = verifyWalletSignature(walletAddress, nonceRow.message, signature);
        if (!isValidSignature) {
            response.status(UNAUTHORIZED).json({
                error: {
                    status: UNAUTHORIZED,
                    message: 'Signature verification failed'
                }
            });
            return;
        }
        let customer = await getWalletCustomerByAddress(walletAddress);
        if (!customer) {
            customer = await upsertWalletCustomer(walletAddress);
        }
        if (Number(customer.status) !== 1 && Number(customer.customer_status) !== 1) {
            response.status(UNAUTHORIZED).json({
                error: {
                    status: UNAUTHORIZED,
                    message: 'Customer account is inactive'
                }
            });
            return;
        }
        await establishCustomerSession(request, {
            customer_id: customer.customer_id,
            group_id: customer.group_id,
            uuid: (_d = customer.customer_uuid) !== null && _d !== void 0 ? _d : customer.uuid,
            email: customer.email,
            full_name: customer.full_name,
            status: (_e = customer.customer_status) !== null && _e !== void 0 ? _e : customer.status,
            created_at: (_f = customer.customer_created_at) !== null && _f !== void 0 ? _f : customer.created_at,
            updated_at: (_g = customer.customer_updated_at) !== null && _g !== void 0 ? _g : customer.updated_at
        });
        response.status(OK).json({
            data: {
                sid: request.sessionID,
                customer: {
                    customerId: customer.customer_id,
                    uuid: (_h = customer.customer_uuid) !== null && _h !== void 0 ? _h : customer.uuid,
                    email: customer.email,
                    fullName: customer.full_name
                },
                wallet: {
                    address: nonceRow.wallet_address
                }
            }
        });
    }
    catch (error) {
        response.status(INTERNAL_SERVER_ERROR).json({
            error: {
                status: INTERNAL_SERVER_ERROR,
                message: error.message
            }
        });
    }
}
//# sourceMappingURL=%5BbodyParser%5Dverify.js.map