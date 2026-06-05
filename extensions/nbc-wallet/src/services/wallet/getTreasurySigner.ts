import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getChainRpcConfig } from './getChainRpcConfig.js';
import { getOnchainConfig } from './getOnchainConfig.js';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)'
];

export function getTreasurySigner() {
  const chain = getChainRpcConfig();
  const onchain = getOnchainConfig();

  // Prefer env var over config file to keep private keys out of source control
  const privateKey = (
    process.env.NBC_WALLET_TREASURY_PRIVATE_KEY ||
    String(getConfig('nbcWallet.onchain.treasuryPrivateKey', ''))
  ).trim();

  if (!onchain.enabled) {
    throw new Error('NBC on-chain transfer is disabled');
  }
  if (!chain.rpcUrl) {
    throw new Error('nbcWallet.onchain.rpcUrl is required');
  }
  if (!chain.chainId) {
    throw new Error('nbcWallet.onchain.chainId is required');
  }
  if (!chain.tokenAddress) {
    throw new Error('nbcWallet.onchain.tokenAddress is required');
  }
  if (!privateKey) {
    throw new Error('nbcWallet.onchain.treasuryPrivateKey is required');
  }

  const provider = new JsonRpcProvider(chain.rpcUrl, chain.chainId);
  const signer = new Wallet(privateKey, provider);
  const token = new Contract(chain.tokenAddress, ERC20_ABI, signer);

  return {
    signer,
    token,
    chain
  };
}
