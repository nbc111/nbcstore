import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

export type ChainRpcConfig = {
  rpcUrl: string;
  chainId: number;
  assetType: 'native' | 'erc20';
  tokenAddress: string;
  tokenDecimals: number;
  chainName: string;
  nativeSymbol: string;
  blockExplorerUrl: string;
};

export function getChainRpcConfig(): ChainRpcConfig {
  const tokenAddress = String(
    process.env.NBC_WALLET_TOKEN_ADDRESS ||
      getConfig('nbcWallet.onchain.tokenAddress', '')
  );
  const configuredAssetType = String(
    process.env.NBC_WALLET_ONCHAIN_ASSET_TYPE ||
      getConfig('nbcWallet.onchain.assetType', '')
  ).toLowerCase();
  const blockExplorerUrl = String(
    process.env.NBC_WALLET_BLOCK_EXPLORER_URL ||
      getConfig('nbcWallet.onchain.blockExplorerUrl', '')
  );
  const assetType =
    configuredAssetType === 'erc20' || configuredAssetType === 'native'
      ? configuredAssetType
      : tokenAddress
        ? 'erc20'
        : 'native';

  return {
    rpcUrl: String(
      process.env.NBC_WALLET_RPC_URL ||
        getConfig('nbcWallet.onchain.rpcUrl', '')
    ),
    chainId: Number(
      process.env.NBC_WALLET_CHAIN_ID ||
        getConfig('nbcWallet.onchain.chainId', 0)
    ),
    assetType,
    tokenAddress: tokenAddress ? normalizeWalletAddress(tokenAddress) : '',
    tokenDecimals: Math.max(
      Number(
        process.env.NBC_WALLET_TOKEN_DECIMALS ||
          getConfig('nbcWallet.onchain.tokenDecimals', 18)
      ),
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
