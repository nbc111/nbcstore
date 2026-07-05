import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { getChainRpcConfig } from './getChainRpcConfig.js';
import { getOnchainConfig } from './getOnchainConfig.js';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)'
];

export function getTreasurySigner() {
  const chain = getChainRpcConfig();
  const onchain = getOnchainConfig();
  const privateKey = String(process.env.NBC_WALLET_TREASURY_PRIVATE_KEY || '').trim();

  if (!onchain.enabled) {
    throw new Error('NBC on-chain transfer is disabled');
  }
  if (!chain.rpcUrl) {
    throw new Error('nbcWallet.onchain.rpcUrl is required');
  }
  if (!chain.chainId) {
    throw new Error('nbcWallet.onchain.chainId is required');
  }
  if (chain.assetType === 'erc20' && !chain.tokenAddress) {
    throw new Error('nbcWallet.onchain.tokenAddress is required');
  }
  if (!privateKey) {
    throw new Error('NBC_WALLET_TREASURY_PRIVATE_KEY is required');
  }

  const provider = new JsonRpcProvider(chain.rpcUrl, chain.chainId);
  const signer = new Wallet(privateKey, provider);
  const token = chain.assetType === 'erc20'
    ? new Contract(chain.tokenAddress, ERC20_ABI, signer)
    : null;

  return {
    signer,
    token,
    chain
  };
}
