import { getConfig } from '@evershop/evershop/lib/util/getConfig';
export function getAuthConfig() {
    return {
        nonceTtlSeconds: Number(getConfig('nbcWallet.auth.nonceTtlSeconds', 600)),
        messagePrefix: String(getConfig('nbcWallet.auth.messagePrefix', 'Sign this message to authenticate with NBC Store.'))
    };
}
