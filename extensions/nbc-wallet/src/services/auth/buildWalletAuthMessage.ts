type BuildWalletAuthMessageInput = {
  messagePrefix: string;
  domain: string;
  chainId: number;
  walletAddress: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
  purpose?: string;
};

export function buildWalletAuthMessage(input: BuildWalletAuthMessageInput): string {
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
