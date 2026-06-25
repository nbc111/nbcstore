import { ethers } from 'ethers';
export function isValidWalletAddress(walletAddress) {
    return ethers.isAddress(walletAddress);
}
//# sourceMappingURL=isValidWalletAddress.js.map