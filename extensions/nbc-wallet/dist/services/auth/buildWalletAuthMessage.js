export function buildWalletAuthMessage(input) {
    return [
        input.messagePrefix,
        '',
        `Domain: ${input.domain}`,
        `Chain ID: ${input.chainId}`,
        `Wallet: ${input.walletAddress}`,
        `Nonce: ${input.nonce}`,
        `Issued At: ${input.issuedAt.toISOString()}`,
        `Expires At: ${input.expiresAt.toISOString()}`,
        `Purpose: ${input.purpose || 'wallet_login'}`
    ].join('\n');
}
