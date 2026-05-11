import { ethers } from 'ethers';
import { normalizeWalletAddress } from '../wallet/normalizeWalletAddress.js';

export function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): boolean {
  const recoveredAddress = ethers.verifyMessage(message, signature);
  return normalizeWalletAddress(recoveredAddress) === normalizeWalletAddress(walletAddress);
}
