declare global {
  interface Window {
    ethereum?: EthereumProvider;
    okxwallet?: {
      ethereum?: EthereumProvider;
    };
  }
}

export type WalletProviderKind = 'any' | 'metamask' | 'okx';

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  providers?: EthereumProvider[];
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

function getInjectedProviders(): EthereumProvider[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const base = window.ethereum;
  const list = base?.providers?.length ? base.providers : base ? [base] : [];
  if (window.okxwallet?.ethereum) {
    return [...list, window.okxwallet.ethereum];
  }
  return list;
}

function pickProvider(kind: WalletProviderKind = 'any'): EthereumProvider | null {
  const providers = getInjectedProviders();
  if (!providers.length) {
    return null;
  }
  if (kind === 'metamask') {
    return providers.find((p) => Boolean(p.isMetaMask)) || null;
  }
  if (kind === 'okx') {
    return (
      providers.find((p) => Boolean(p.isOkxWallet)) ||
      window.okxwallet?.ethereum ||
      null
    );
  }
  return providers[0] || null;
}

export function hasWalletProvider(kind: WalletProviderKind = 'any'): boolean {
  return Boolean(pickProvider(kind));
}

export async function connectWalletAddress(
  kind: WalletProviderKind = 'any'
): Promise<string> {
  const provider = pickProvider(kind);
  if (!provider) {
    throw new WalletNotFoundError();
  }
  const accounts = (await provider.request({
    method: 'eth_requestAccounts'
  })) as string[];
  if (!accounts?.[0]) {
    throw new Error('No wallet account returned');
  }
  return accounts[0];
}

export async function getConnectedWalletAddress(
  kind: WalletProviderKind = 'any'
): Promise<string | null> {
  const provider = pickProvider(kind);
  if (!provider) {
    return null;
  }
  const accounts = (await provider.request({
    method: 'eth_accounts'
  })) as string[];
  return accounts?.[0] || null;
}

export async function signWalletMessage(
  walletAddress: string,
  message: string,
  kind: WalletProviderKind = 'any'
): Promise<string> {
  const provider = pickProvider(kind);
  if (!provider) {
    throw new WalletNotFoundError();
  }
  const signature = await provider.request({
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
  chain: WalletChainParams | number | null | undefined,
  kind: WalletProviderKind = 'any'
) {
  const params = resolveChainParams(chain);
  const provider = pickProvider(kind);
  if (!params || !provider) {
    return;
  }

  const hexChainId = `0x${params.chainId.toString(16)}`;

  try {
    await provider.request({
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

    await provider.request({
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
