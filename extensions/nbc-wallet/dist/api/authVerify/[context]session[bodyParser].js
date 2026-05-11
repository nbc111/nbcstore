import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import { pool } from '@evershop/evershop/lib/postgres';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
const frontStoreSessionMiddleware = session({
    store: new (sessionStorage(session))({
        pool
    }),
    secret: getConfig('system.session.cookieSecret', 'keyboard cat'),
    cookie: {
        maxAge: getConfig('system.session.maxAge', 24 * 60 * 60 * 1000)
    },
    resave: getConfig('system.session.resave', false),
    saveUninitialized: getConfig('system.session.saveUninitialized', true),
    name: getConfig('system.session.cookieName', 'sid')
});
export default (request, response, next) => {
    frontStoreSessionMiddleware(request, response, next);
};
//# sourceMappingURL=%5Bcontext%5Dsession%5BbodyParser%5D.js.map