import { attachCurrentCustomerFromSession } from '../../services/auth/attachCurrentCustomerFromSession.js';
export default async (request, response, next) => {
    try {
        await attachCurrentCustomerFromSession(request);
    }
    catch (error) {
        // Handler returns UNAUTHORIZED when customer is absent.
    }
    next();
};
//# sourceMappingURL=%5Bcontext%5DnbcWalletCustomerContext%5Bauth%5D.js.map