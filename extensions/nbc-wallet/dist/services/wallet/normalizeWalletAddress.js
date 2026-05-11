import { ethers } from 'ethers';
export function normalizeWalletAddress(walletAddress) {
    return ethers.getAddress(walletAddress).toLowerCase();
}
//# sourceMappingURL=normalizeWalletAddress.js.map