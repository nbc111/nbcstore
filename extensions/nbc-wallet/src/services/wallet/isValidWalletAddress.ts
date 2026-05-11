import { ethers } from 'ethers';

export function isValidWalletAddress(walletAddress: string): boolean {
  return ethers.isAddress(walletAddress);
}
