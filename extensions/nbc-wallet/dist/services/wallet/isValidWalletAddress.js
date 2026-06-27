import { ethers } from 'ethers';
export function isValidWalletAddress(walletAddress) {
    return ethers.isAddress(walletAddress);
}
