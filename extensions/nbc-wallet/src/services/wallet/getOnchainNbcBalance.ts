import { Contract, JsonRpcProvider, formatUnits, isAddress } from 'ethers';
import { getChainRpcConfig, isChainRpcConfigured } from './getChainRpcConfig.js';
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
};

export async function getOnchainNbcBalance(
  walletAddress: string
): Promise<OnchainNbcBalance> {
  const config = getChainRpcConfig();

  if (!isChainRpcConfigured(config)) {
    throw new Error('NBC Chain RPC is not configured');
  }

  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }

  const normalized = normalizeWalletAddress(walletAddress);
  const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);

  if (config.tokenAddress) {
    const contract = new Contract(
      config.tokenAddress,
      ERC20_BALANCE_ABI,
      provider
    );
    const raw = await contract.balanceOf(normalized);
    const balance = Number(formatUnits(raw, config.tokenDecimals));

    return {
      walletAddress: normalized,
      balance,
      balanceRaw: raw.toString(),
      decimals: config.tokenDecimals,
      source: 'erc20',
      chainId: config.chainId,
      tokenAddress: config.tokenAddress
    };
  }

  const raw = await provider.getBalance(normalized);
  const balance = Number(formatUnits(raw, config.tokenDecimals));

  return {
    walletAddress: normalized,
    balance,
    balanceRaw: raw.toString(),
    decimals: config.tokenDecimals,
    source: 'native',
    chainId: config.chainId,
    tokenAddress: null
  };
}
