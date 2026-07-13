import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

export type WalletAssetSymbol = 'NBC' | 'USDT';

export type WalletAssetConfig = {
  symbol: WalletAssetSymbol;
  chainId: number;
  assetType: 'native' | 'erc20';
  tokenAddress: string;
  tokenDecimals: number;
  displayName: string;
};

function numberFromConfig(envName: string, configPath: string, fallback: number) {
  return Number(process.env[envName] || getConfig(configPath, fallback));
}

function stringFromConfig(envName: string, configPath: string, fallback = '') {
  return String(process.env[envName] || getConfig(configPath, fallback)).trim();
}

function normalizeTokenAddress(assetType: 'native' | 'erc20', tokenAddress: string) {
  return assetType === 'native'
    ? 'native:NBC'
    : normalizeWalletAddress(tokenAddress);
}

export function normalizeAssetSymbol(asset?: string | null): WalletAssetSymbol {
  const symbol = String(asset || 'NBC').trim().toUpperCase();
  if (symbol === 'USDT') return 'USDT';
  return 'NBC';
}

export function getWalletAssetConfig(asset?: string | null): WalletAssetConfig {
  const symbol = normalizeAssetSymbol(asset);
  const chainId = numberFromConfig(
    'NBC_WALLET_CHAIN_ID',
    'nbcWallet.onchain.chainId',
    0
  );

  if (symbol === 'USDT') {
    const tokenAddress = stringFromConfig(
      'NBC_WALLET_USDT_TOKEN_ADDRESS',
      'nbcWallet.assets.USDT.tokenAddress',
      '0x4E4D07268eFFB4d3507a69F64b5780Eb16551f85'
    );
    return {
      symbol,
      chainId,
      assetType: 'erc20',
      tokenAddress: normalizeTokenAddress('erc20', tokenAddress),
      tokenDecimals: Math.max(
        numberFromConfig(
          'NBC_WALLET_USDT_TOKEN_DECIMALS',
          'nbcWallet.assets.USDT.tokenDecimals',
          6
        ),
        0
      ),
      displayName: 'USDT'
    };
  }

  const configuredTokenAddress = stringFromConfig(
    'NBC_WALLET_TOKEN_ADDRESS',
    'nbcWallet.onchain.tokenAddress',
    ''
  );
  const configuredAssetType = stringFromConfig(
    'NBC_WALLET_ONCHAIN_ASSET_TYPE',
    'nbcWallet.onchain.assetType',
    ''
  ).toLowerCase();
  const assetType =
    configuredAssetType === 'erc20' || configuredAssetType === 'native'
      ? configuredAssetType
      : configuredTokenAddress
        ? 'erc20'
        : 'native';

  return {
    symbol,
    chainId,
    assetType,
    tokenAddress: normalizeTokenAddress(assetType, configuredTokenAddress),
    tokenDecimals: Math.max(
      numberFromConfig(
        'NBC_WALLET_TOKEN_DECIMALS',
        'nbcWallet.onchain.tokenDecimals',
        18
      ),
      0
    ),
    displayName: 'NBC'
  };
}

export function getWalletAssetConfigs(): WalletAssetConfig[] {
  return [getWalletAssetConfig('NBC'), getWalletAssetConfig('USDT')];
}

export function getAssetSymbolByTokenAddress(tokenAddress: string): WalletAssetSymbol {
  const normalized = tokenAddress.startsWith('native:')
    ? tokenAddress
    : normalizeWalletAddress(tokenAddress);
  const asset = getWalletAssetConfigs().find(
    (item) => item.tokenAddress.toLowerCase() === normalized.toLowerCase()
  );
  return asset?.symbol || 'NBC';
}
