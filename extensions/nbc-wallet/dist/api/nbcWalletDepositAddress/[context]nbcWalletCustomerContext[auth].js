import { attachCurrentCustomerFromSession } from '../../services/auth/attachCurrentCustomerFromSession.js';
export default (async (request, response, next)=>{
    try {
        await attachCurrentCustomerFromSession(request);
    } catch (error) {
    // Handler returns UNAUTHORIZED when customer is absent.
    }
    next();
});
