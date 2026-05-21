import { attachCurrentCustomerFromSession } from '../../services/auth/attachCurrentCustomerFromSession.js';

export default async (request: any, response: any, next: any) => {
  try {
    await attachCurrentCustomerFromSession(request);
  } catch (error) {
    // Keep route behavior consistent: handler returns UNAUTHORIZED when customer is absent.
  }
  next();
};
