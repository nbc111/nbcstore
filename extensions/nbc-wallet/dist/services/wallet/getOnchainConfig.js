import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getChainRpcConfig } from './getChainRpcConfig.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export function getOnchainConfig() {
    const chain = getChainRpcConfig();
    const treasuryAddress = String(getConfig('nbcWallet.onchain.treasuryAddress', ''));
    const configuredAssetType = String(getConfig('nbcWallet.onchain.assetType', '')).toLowerCase();
    const configuredDepositMode = String(getConfig('nbcWallet.onchain.depositMode', '')).toLowerCase();
    const assetType = configuredAssetType === 'native' || configuredAssetType === 'erc20' ? configuredAssetType : chain.tokenAddress ? 'erc20' : 'native';
    const depositMode = configuredDepositMode === 'hd' ? 'hd' : 'treasury';
    return {
        enabled: Number(getConfig('nbcWallet.onchain.enabled', 1)) === 1,
        rpcUrl: chain.rpcUrl,
        chainId: chain.chainId,
        tokenAddress: chain.tokenAddress,
        assetType,
        depositMode,
        hdPathPrefix: String(getConfig('nbcWallet.onchain.hdPathPrefix', "m/44'/60'/0'/0")),
        treasuryAddress: treasuryAddress ? normalizeWalletAddress(treasuryAddress) : '',
        startBlock: Math.max(Number(getConfig('nbcWallet.onchain.startBlock', 0)), 0),
        confirmations: Math.max(Number(getConfig('nbcWallet.onchain.confirmations', 12)), 0),
        blockBatchSize: Math.max(Number(getConfig('nbcWallet.onchain.blockBatchSize', 500)), 1),
        pollSchedule: String(getConfig('nbcWallet.onchain.pollSchedule', '*/5 * * * *')),
        reconcileSchedule: String(getConfig('nbcWallet.reconcile.schedule', '*/10 * * * *'))
    };
}
export function assertOnchainConfig(config = getOnchainConfig()) {
    if (!config.enabled) {
        throw new Error('NBC on-chain listener is disabled');
    }
    if (!config.rpcUrl) {
        throw new Error('nbcWallet.onchain.rpcUrl is required');
    }
    if (!config.chainId) {
        throw new Error('nbcWallet.onchain.chainId is required');
    }
    if (config.assetType === 'erc20' && !config.tokenAddress) {
        throw new Error('nbcWallet.onchain.tokenAddress is required for erc20 mode');
    }
    if (config.depositMode === 'treasury' && !config.treasuryAddress) {
        throw new Error('nbcWallet.onchain.treasuryAddress is required');
    }
}
