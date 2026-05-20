declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

export class WalletNotFoundError extends Error {
  constructor() {
    super('WALLET_NOT_FOUND');
    this.name = 'WalletNotFoundError';
  }
}

export type WalletChainParams = {
  chainId: number;
  chainName?: string;
  rpcUrl?: string;
  nativeSymbol?: string;
  blockExplorerUrl?: string;
};

export function hasWalletProvider(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function connectWalletAddress(): Promise<string> {
  if (!hasWalletProvider()) {
    throw new WalletNotFoundError();
  }
  const accounts = (await window.ethereum!.request({
    method: 'eth_requestAccounts'
  })) as string[];
  if (!accounts?.[0]) {
    throw new Error('No wallet account returned');
  }
  return accounts[0];
}

export async function getConnectedWalletAddress(): Promise<string | null> {
  if (!hasWalletProvider()) {
    return null;
  }
  const accounts = (await window.ethereum!.request({
    method: 'eth_accounts'
  })) as string[];
  return accounts?.[0] || null;
}

export async function signWalletMessage(
  walletAddress: string,
  message: string
): Promise<string> {
  if (!hasWalletProvider()) {
    throw new WalletNotFoundError();
  }
  const signature = await window.ethereum!.request({
    method: 'personal_sign',
    params: [message, walletAddress]
  });
  return String(signature);
}

function resolveChainParams(
  chain: WalletChainParams | number | null | undefined
): WalletChainParams | null {
  if (!chain) {
    return null;
  }
  if (typeof chain === 'number') {
    return chain > 0 ? { chainId: chain } : null;
  }
  return chain.chainId > 0 ? chain : null;
}

export async function ensureWalletChain(
  chain: WalletChainParams | number | null | undefined
) {
  const params = resolveChainParams(chain);
  if (!params || !hasWalletProvider()) {
    return;
  }

  const hexChainId = `0x${params.chainId.toString(16)}`;

  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }]
    });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err?.code !== 4902) {
      throw error;
    }

    if (!params.rpcUrl) {
      throw new Error(`Please add ${params.chainName || 'NBC Chain'} to your wallet`);
    }

    await window.ethereum!.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: hexChainId,
          chainName: params.chainName || 'NBC Chain',
          rpcUrls: [params.rpcUrl],
          nativeCurrency: {
            name: params.nativeSymbol || 'NBC',
            symbol: params.nativeSymbol || 'NBC',
            decimals: 18
          },
          blockExplorerUrls: params.blockExplorerUrl
            ? [params.blockExplorerUrl]
            : []
        }
      ]
    });
  }
}
