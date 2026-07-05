import { Contract, JsonRpcProvider, formatUnits, isAddress } from 'ethers';
import { getChainRpcConfig, isChainRpcConfigured } from './getChainRpcConfig.js';
import { getWalletAssetConfig } from './assets.js';
import { normalizeWalletAddress } from './normalizeWalletAddress.js';

const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)'
];

export type OnchainNbcBalance = {
  walletAddress: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  source: 'native' | 'erc20';
  chainId: number;
  tokenAddress: string | null;
  assetSymbol: string;
};

export async function getOnchainNbcBalance(
  walletAddress: string,
  assetSymbol = 'NBC'
): Promise<OnchainNbcBalance> {
  const config = getChainRpcConfig();
  const asset = getWalletAssetConfig(assetSymbol);

  if (!isChainRpcConfigured(config)) {
    throw new Error('NBC Chain RPC is not configured');
  }

  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }

  const normalized = normalizeWalletAddress(walletAddress);
  const provider = new JsonRpcProvider(config.rpcUrl, asset.chainId || config.chainId);

  if (asset.assetType === 'erc20') {
    const contract = new Contract(
      asset.tokenAddress,
      ERC20_BALANCE_ABI,
      provider
    );
    const raw = await contract.balanceOf(normalized);
    const balance = Number(formatUnits(raw, asset.tokenDecimals));

    return {
      walletAddress: normalized,
      balance,
      balanceRaw: raw.toString(),
      decimals: asset.tokenDecimals,
      source: 'erc20',
      chainId: asset.chainId || config.chainId,
      tokenAddress: asset.tokenAddress,
      assetSymbol: asset.symbol
    };
  }

  const raw = await provider.getBalance(normalized);
  const balance = Number(formatUnits(raw, asset.tokenDecimals));

  return {
    walletAddress: normalized,
    balance,
    balanceRaw: raw.toString(),
    decimals: asset.tokenDecimals,
    source: 'native',
    chainId: asset.chainId || config.chainId,
    tokenAddress: null,
    assetSymbol: asset.symbol
  };
}
