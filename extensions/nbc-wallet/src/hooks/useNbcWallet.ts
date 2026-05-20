import { useAppDispatch } from '@evershop/evershop/components/common/context/app';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateRequiredNbc } from '../lib/calculateRequiredNbc.js';
import {
  connectWalletAddress,
  ensureWalletChain,
  getConnectedWalletAddress,
  hasWalletProvider,
  signWalletMessage,
  WalletChainParams,
  WalletNotFoundError
} from '../lib/ethereum.js';
import {
  fetchOnchainNbcBalance,
  fetchWalletBalance,
  requestWalletAuth,
  verifyWalletAuth,
  WalletSummary
} from '../lib/nbcWalletApi.js';

export interface NbcWalletApis {
  authRequestApi: string;
  authVerifyApi: string;
  balanceApi: string;
  onchainBalanceApi?: string;
}

export interface NbcWalletPublicConfig {
  exchangeRate: number;
  shopCurrency?: string;
  displayName?: string;
  chainId?: number | null;
  rpcUrl?: string | null;
  chainName?: string;
  nativeSymbol?: string;
  tokenAddress?: string | null;
  tokenDecimals?: number;
  blockExplorerUrl?: string | null;
  chainBalanceEnabled?: boolean;
  treasuryAddress?: string | null;
  onchainEnabled?: boolean;
}

export function useNbcWallet(
  apis: NbcWalletApis,
  publicConfig: NbcWalletPublicConfig,
  options: {
    orderCnyTotal?: number;
    autoLoadBalance?: boolean;
    redirectUrl?: string;
  } = {}
) {
  const { orderCnyTotal = 0, autoLoadBalance = true, redirectUrl } = options;
  const appDispatch = useAppDispatch() as { fetchPageData: (url: string) => Promise<void> };
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [onchainBalance, setOnchainBalance] = useState<number | null>(null);
  const [onchainWalletAddress, setOnchainWalletAddress] = useState<string | null>(
    null
  );
  const [connecting, setConnecting] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingOnchainBalance, setLoadingOnchainBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainParams: WalletChainParams | null = useMemo(() => {
    if (!publicConfig.chainId || publicConfig.chainId <= 0) {
      return null;
    }
    return {
      chainId: publicConfig.chainId,
      chainName: publicConfig.chainName,
      rpcUrl: publicConfig.rpcUrl || undefined,
      nativeSymbol: publicConfig.nativeSymbol,
      blockExplorerUrl: publicConfig.blockExplorerUrl || undefined
    };
  }, [publicConfig]);

  const requiredNbc = useMemo(
    () =>
      calculateRequiredNbc(orderCnyTotal, publicConfig.exchangeRate || 0.01),
    [orderCnyTotal, publicConfig.exchangeRate]
  );

  const availableBalance = wallet?.availableBalance ?? 0;
  const hasSufficientBalance =
    wallet !== null && availableBalance >= requiredNbc;
  const isConnected = wallet !== null;

  const refreshOnchainBalance = useCallback(
    async (walletAddress?: string | null) => {
      if (
        !publicConfig.chainBalanceEnabled ||
        !apis.onchainBalanceApi
      ) {
        setOnchainBalance(null);
        setOnchainWalletAddress(null);
        return;
      }

      const address =
        walletAddress ||
        wallet?.walletAddress ||
        (await getConnectedWalletAddress());

      if (!address) {
        setOnchainBalance(null);
        setOnchainWalletAddress(null);
        return;
      }

      setLoadingOnchainBalance(true);
      try {
        const result = await fetchOnchainNbcBalance(
          apis.onchainBalanceApi,
          address
        );
        setOnchainBalance(result.balance);
        setOnchainWalletAddress(result.walletAddress);
      } catch (err) {
        setOnchainBalance(null);
        setOnchainWalletAddress(address);
        console.warn('[nbc-wallet] On-chain balance fetch failed:', err);
      } finally {
        setLoadingOnchainBalance(false);
      }
    },
    [
      apis.onchainBalanceApi,
      publicConfig.chainBalanceEnabled,
      wallet?.walletAddress
    ]
  );

  const refreshBalance = useCallback(async () => {
    setLoadingBalance(true);
    setError(null);
    try {
      const summary = await fetchWalletBalance(apis.balanceApi);
      setWallet(summary);
      await refreshOnchainBalance(summary?.walletAddress);
    } catch (err) {
      setWallet(null);
      setOnchainBalance(null);
      setOnchainWalletAddress(null);
      if (
        err instanceof Error &&
        err.message.includes('Customer login is required')
      ) {
        const connected = await getConnectedWalletAddress();
        if (connected) {
          await refreshOnchainBalance(connected);
        }
        return;
      }
      setError(err instanceof Error ? err.message : _('Failed to load wallet'));
    } finally {
      setLoadingBalance(false);
    }
  }, [apis.balanceApi, refreshOnchainBalance]);

  useEffect(() => {
    if (autoLoadBalance) {
      refreshBalance();
    }
  }, [autoLoadBalance, refreshBalance]);

  useEffect(() => {
    if (!publicConfig.chainBalanceEnabled || !apis.onchainBalanceApi) {
      return;
    }
    getConnectedWalletAddress().then((address) => {
      if (address) {
        refreshOnchainBalance(address);
      }
    });
  }, [
    apis.onchainBalanceApi,
    publicConfig.chainBalanceEnabled,
    refreshOnchainBalance
  ]);

  const refreshPageContext = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('ajax', 'true');
    await appDispatch.fetchPageData(url.toString());
  }, [appDispatch]);

  const connect = useCallback(async () => {
    if (!hasWalletProvider()) {
      throw new WalletNotFoundError();
    }
    setConnecting(true);
    setError(null);
    try {
      await ensureWalletChain(chainParams);
      const walletAddress = await connectWalletAddress();
      await refreshOnchainBalance(walletAddress);
      const auth = await requestWalletAuth(apis.authRequestApi, walletAddress);
      const signature = await signWalletMessage(
        auth.walletAddress,
        auth.message
      );
      await verifyWalletAuth(apis.authVerifyApi, {
        walletAddress: auth.walletAddress,
        signature,
        nonce: auth.nonce
      });
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      await refreshPageContext();
      await refreshBalance();
    } finally {
      setConnecting(false);
    }
  }, [
    apis.authRequestApi,
    apis.authVerifyApi,
    chainParams,
    refreshBalance,
    refreshOnchainBalance,
    refreshPageContext,
    redirectUrl
  ]);

  const connectWithErrors = useCallback(async () => {
    try {
      await connect();
    } catch (err) {
      if (err instanceof WalletNotFoundError) {
        setError(
          _('No Web3 wallet detected. Install MetaMask or another wallet.')
        );
      } else {
        setError(
          err instanceof Error ? err.message : _('Failed to connect wallet')
        );
      }
      throw err;
    }
  }, [connect]);

  return {
    wallet,
    onchainBalance,
    onchainWalletAddress,
    connecting,
    loadingBalance,
    loadingOnchainBalance,
    error,
    setError,
    requiredNbc,
    availableBalance,
    hasSufficientBalance,
    isConnected,
    connect: connectWithErrors,
    refreshBalance,
    refreshOnchainBalance
  };
}
