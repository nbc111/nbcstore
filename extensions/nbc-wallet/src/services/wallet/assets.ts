import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getChainRpcConfig } from './getChainRpcConfig.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

export type WalletAssetConfig = {
  symbol: string;
  displayName: string;
  chainId: number;
  assetType: 'native' | 'erc20';
  tokenAddress: string;
  tokenDecimals: number;
};

export function normalizeAssetSymbol(symbol?: string | null): string {
  const normalized = String(symbol || 'NBC').trim().toUpperCase();
  return normalized || 'NBC';
}

function buildNativeAsset(): WalletAssetConfig {
  const chain = getChainRpcConfig();
  return {
    symbol: 'NBC',
    displayName: String(chain.nativeSymbol || 'NBC'),
    chainId: chain.chainId,
    assetType: chain.assetType,
    tokenAddress: chain.assetType === 'native' ? '' : chain.tokenAddress,
    tokenDecimals: chain.tokenDecimals
  };
}

function buildConfiguredAssets(): WalletAssetConfig[] {
  const chain = getChainRpcConfig();
  const assetsConfig = getConfig('nbcWallet.assets', {}) as Record<
    string,
    {
      displayName?: string;
      chainId?: number;
      tokenAddress?: string;
      tokenDecimals?: number;
    }
  >;
  const assets: WalletAssetConfig[] = [buildNativeAsset()];

  for (const [symbol, config] of Object.entries(assetsConfig)) {
    const normalizedSymbol = normalizeAssetSymbol(symbol);
    if (normalizedSymbol === 'NBC') {
      continue;
    }

    const tokenAddress = String(config?.tokenAddress || '');
    assets.push({
      symbol: normalizedSymbol,
      displayName: String(config?.displayName || normalizedSymbol),
      chainId: Number(config?.chainId || chain.chainId),
      assetType: tokenAddress ? 'erc20' : 'native',
      tokenAddress: tokenAddress ? normalizeWalletAddress(tokenAddress) : '',
      tokenDecimals: Math.max(Number(config?.tokenDecimals ?? 18), 0)
    });
  }

  return assets;
}

export function getWalletAssetConfigs(): WalletAssetConfig[] {
  return buildConfiguredAssets();
}

export function getWalletAssetConfig(assetSymbol = 'NBC'): WalletAssetConfig {
  const symbol = normalizeAssetSymbol(assetSymbol);
  const asset = getWalletAssetConfigs().find((item) => item.symbol === symbol);
  if (!asset) {
    throw new Error(`Unknown wallet asset: ${symbol}`);
  }
  return asset;
}

export function getAssetSymbolByTokenAddress(
  tokenAddress?: string | null
): string {
  const normalized = tokenAddress ? normalizeWalletAddress(tokenAddress) : '';
  if (!normalized) {
    return 'NBC';
  }

  const asset = getWalletAssetConfigs().find(
    (item) =>
      item.assetType === 'erc20' &&
      item.tokenAddress &&
      normalizeWalletAddress(item.tokenAddress) === normalized
  );

  return asset?.symbol || 'NBC';
}
