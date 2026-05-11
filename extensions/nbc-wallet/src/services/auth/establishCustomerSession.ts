import { buildCurrentCustomer } from './buildCurrentCustomer.js';

export async function establishCustomerSession(
  request: any,
  customer: any
): Promise<void> {
  request.locals = request.locals || {};
  request.locals.customer = buildCurrentCustomer(customer);
  request.session.customerID = customer.customer_id;

  await new Promise<void>((resolve, reject) => {
    request.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
