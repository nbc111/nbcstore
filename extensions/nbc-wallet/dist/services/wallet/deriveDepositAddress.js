import { HDNodeWallet } from 'ethers';
import { getOnchainConfig } from './getOnchainConfig.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export function deriveDepositAddress(index) {
    if (!Number.isInteger(index) || index < 0) {
        throw new Error('Deposit address index must be a non-negative integer');
    }
    const config = getOnchainConfig();
    const childPath = `${config.depositDerivationPath}/${index}`;
    if (config.depositXpub) {
        return normalizeWalletAddress(HDNodeWallet.fromExtendedKey(config.depositXpub).deriveChild(index).address);
    }
    if (config.depositMnemonic) {
        return normalizeWalletAddress(HDNodeWallet.fromPhrase(config.depositMnemonic, undefined, childPath).address);
    }
    throw new Error('NBC deposit xpub or mnemonic is required');
}
