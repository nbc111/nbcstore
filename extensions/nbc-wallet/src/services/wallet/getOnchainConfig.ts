import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getChainRpcConfig } from './getChainRpcConfig.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

export type NbcOnchainConfig = {
  enabled: boolean;
  rpcUrl: string;
  chainId: number;
  tokenAddress: string;
  treasuryAddress: string;
  startBlock: number;
  confirmations: number;
  blockBatchSize: number;
  pollSchedule: string;
  reconcileSchedule: string;
};

export function getOnchainConfig(): NbcOnchainConfig {
  const chain = getChainRpcConfig();
  const treasuryAddress = String(
    getConfig('nbcWallet.onchain.treasuryAddress', '')
  );

  return {
    enabled: Number(getConfig('nbcWallet.onchain.enabled', 0)) === 1,
    rpcUrl: chain.rpcUrl,
    chainId: chain.chainId,
    tokenAddress: chain.tokenAddress,
    treasuryAddress: treasuryAddress
      ? normalizeWalletAddress(treasuryAddress)
      : '',
    startBlock: Math.max(Number(getConfig('nbcWallet.onchain.startBlock', 0)), 0),
    confirmations: Math.max(
      Number(getConfig('nbcWallet.onchain.confirmations', 12)),
      0
    ),
    blockBatchSize: Math.max(
      Number(getConfig('nbcWallet.onchain.blockBatchSize', 500)),
      1
    ),
    pollSchedule: String(getConfig('nbcWallet.onchain.pollSchedule', '*/5 * * * *')),
    reconcileSchedule: String(
      getConfig('nbcWallet.reconcile.schedule', '*/10 * * * *')
    )
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
  if (!config.tokenAddress) {
    throw new Error('nbcWallet.onchain.tokenAddress is required');
  }
  if (!config.treasuryAddress) {
    throw new Error('nbcWallet.onchain.treasuryAddress is required');
  }
}
