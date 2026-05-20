import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

export type ChainRpcConfig = {
  rpcUrl: string;
  chainId: number;
  tokenAddress: string;
  tokenDecimals: number;
  chainName: string;
  nativeSymbol: string;
  blockExplorerUrl: string;
};

export function getChainRpcConfig(): ChainRpcConfig {
  const tokenAddress = String(getConfig('nbcWallet.onchain.tokenAddress', ''));
  const blockExplorerUrl = String(
    getConfig('nbcWallet.onchain.blockExplorerUrl', '')
  );

  return {
    rpcUrl: String(getConfig('nbcWallet.onchain.rpcUrl', '')),
    chainId: Number(getConfig('nbcWallet.onchain.chainId', 0)),
    tokenAddress: tokenAddress ? normalizeWalletAddress(tokenAddress) : '',
    tokenDecimals: Math.max(
      Number(getConfig('nbcWallet.onchain.tokenDecimals', 18)),
      0
    ),
    chainName: String(getConfig('nbcWallet.onchain.chainName', 'NBC Chain')),
    nativeSymbol: String(getConfig('nbcWallet.onchain.nativeSymbol', 'NBC')),
    blockExplorerUrl: blockExplorerUrl || ''
  };
}

export function isChainRpcConfigured(config = getChainRpcConfig()): boolean {
  return Boolean(config.rpcUrl && config.chainId > 0);
}
