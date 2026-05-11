import crypto from 'crypto';

export function generateShadowCustomerEmail(walletAddress: string): string {
  return `wallet_${walletAddress}@nbc.local`;
}

export function generateShadowCustomerName(walletAddress: string): string {
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export function generateShadowCustomerPassword(): string {
  return `nbc-${crypto.randomBytes(12).toString('hex')}`;
}
