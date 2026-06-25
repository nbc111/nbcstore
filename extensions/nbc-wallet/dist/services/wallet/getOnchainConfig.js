import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getChainRpcConfig } from './getChainRpcConfig.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';
export function getOnchainConfig() {
    var _a;
    const chain = getChainRpcConfig();
    const treasuryAddress = String(process.env.NBC_WALLET_TREASURY_ADDRESS ||
        getConfig('nbcWallet.onchain.treasuryAddress', ''));
    const depositMode = String(process.env.NBC_WALLET_DEPOSIT_MODE ||
        getConfig('nbcWallet.onchain.deposit.mode', getConfig('nbcWallet.onchain.depositMode', 'treasury'))).toLowerCase();
    return {
        enabled: Number((_a = process.env.NBC_WALLET_ONCHAIN_ENABLED) !== null && _a !== void 0 ? _a : getConfig('nbcWallet.onchain.enabled', 1)) === 1,
        rpcUrl: chain.rpcUrl,
        chainId: chain.chainId,
        assetType: chain.assetType,
        tokenAddress: chain.tokenAddress,
        assetKey: chain.assetType === 'native' ? 'native:NBC' : chain.tokenAddress,
        treasuryAddress: treasuryAddress
            ? normalizeWalletAddress(treasuryAddress)
            : '',
        depositMode: depositMode === 'hd' ? 'hd' : 'treasury',
        hdPathPrefix: String(process.env.NBC_WALLET_HD_PATH_PREFIX ||
            getConfig('nbcWallet.onchain.hdPathPrefix', getConfig('nbcWallet.onchain.deposit.derivationPath', "m/44'/60'/0'/0"))).replace(/\/+$/, ''),
        depositXpub: String(process.env.NBC_WALLET_DEPOSIT_XPUB ||
            getConfig('nbcWallet.onchain.deposit.xpub', '')).trim(),
        depositMnemonic: String(process.env.NBC_WALLET_DEPOSIT_MNEMONIC ||
            getConfig('nbcWallet.onchain.deposit.mnemonic', '')).trim(),
        depositDerivationPath: String(process.env.NBC_WALLET_DEPOSIT_DERIVATION_PATH ||
            getConfig('nbcWallet.onchain.deposit.derivationPath', "m/44'/60'/0'/0")).replace(/\/+$/, ''),
        startBlock: Math.max(Number(process.env.NBC_WALLET_ONCHAIN_START_BLOCK ||
            getConfig('nbcWallet.onchain.startBlock', 0)), 0),
        confirmations: Math.max(Number(process.env.NBC_WALLET_ONCHAIN_CONFIRMATIONS ||
            getConfig('nbcWallet.onchain.confirmations', 12)), 0),
        blockBatchSize: Math.max(Number(process.env.NBC_WALLET_ONCHAIN_BLOCK_BATCH_SIZE ||
            getConfig('nbcWallet.onchain.blockBatchSize', 500)), 1),
        maxBatchesPerRun: Math.max(Number(process.env.NBC_WALLET_ONCHAIN_MAX_BATCHES_PER_RUN ||
            getConfig('nbcWallet.onchain.maxBatchesPerRun', 20)), 1),
        nativeScanConcurrency: Math.max(Number(process.env.NBC_WALLET_ONCHAIN_NATIVE_SCAN_CONCURRENCY ||
            getConfig('nbcWallet.onchain.nativeScanConcurrency', 25)), 1),
        pollSchedule: String(process.env.NBC_WALLET_ONCHAIN_POLL_SCHEDULE ||
            getConfig('nbcWallet.onchain.pollSchedule', '*/5 * * * *')),
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
    if (config.depositMode === 'hd' &&
        !config.depositXpub &&
        !config.depositMnemonic) {
        throw new Error('nbcWallet.onchain.deposit.xpub or NBC_WALLET_DEPOSIT_MNEMONIC is required for HD deposits');
    }
    if (config.depositMode === 'hd' && !config.depositDerivationPath) {
        throw new Error('nbcWallet.onchain.deposit.derivationPath is required');
    }
}
//# sourceMappingURL=getOnchainConfig.js.map