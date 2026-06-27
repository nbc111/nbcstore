import { ethers } from 'ethers';
import { normalizeWalletAddress } from '../wallet/normalizeWalletAddress.js';
export function verifyWalletSignature(walletAddress, message, signature) {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return normalizeWalletAddress(recoveredAddress) === normalizeWalletAddress(walletAddress);
}
