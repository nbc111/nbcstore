import { select } from '@evershop/postgres-query-builder';
import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';

export async function attachCurrentCustomerFromSession(request: any) {
  if (request.getCurrentCustomer?.()) {
    return request.getCurrentCustomer();
  }

  const cookieName = getConfig('system.session.cookieName', 'sid');
  const sessionID =
    request?.signedCookies?.[cookieName] || request?.cookies?.[cookieName];

  request.locals = request.locals || {};
  request.locals.sessionID = sessionID;

  if (!sessionID) {
    return null;
  }

  const storage = new (sessionStorage(session))({ pool });
  const customerSessionData = await new Promise<any>((resolve, reject) => {
    storage.get(sessionID, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data || null);
    });
  });

  if (!customerSessionData?.customerID) {
    return null;
  }

  const currentCustomer = await select()
    .from('customer')
    .where('customer_id', '=', customerSessionData.customerID)
    .and('status', '=', 1)
    .load(pool);

  if (!currentCustomer) {
    return null;
  }

  delete currentCustomer.password;
  request.locals.customer = currentCustomer;
  return currentCustomer;
}
