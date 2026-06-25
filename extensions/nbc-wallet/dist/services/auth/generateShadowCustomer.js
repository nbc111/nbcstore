import crypto from 'crypto';
export function generateShadowCustomerEmail(walletAddress) {
    return `wallet_${walletAddress}@nbc.local`;
}
export function generateShadowCustomerName(walletAddress) {
    return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}
export function generateShadowCustomerPassword() {
    return `nbc-${crypto.randomBytes(12).toString('hex')}`;
}
//# sourceMappingURL=generateShadowCustomer.js.map