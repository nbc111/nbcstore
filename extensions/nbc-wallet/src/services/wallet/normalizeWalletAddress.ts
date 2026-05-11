import { ethers } from 'ethers';

export function normalizeWalletAddress(walletAddress: string): string {
  return ethers.getAddress(walletAddress).toLowerCase();
}
