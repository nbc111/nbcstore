import React, { useEffect } from 'react';
import {
  useNbcWallet,
  NbcWalletApis,
  NbcWalletPublicConfig
} from '../hooks/useNbcWallet.js';
import {
  resetCheckoutWalletSnapshot,
  setCheckoutWalletSnapshot
} from '../lib/checkoutWalletStore.js';

interface NbcWalletBridgeProps {
  apis: NbcWalletApis;
  publicConfig: NbcWalletPublicConfig;
  orderCnyTotal: number;
  enabled: boolean;
  selectedAssetSymbol: string;
}

/** Syncs wallet state for checkout form + pay button (separate React trees). */
export function NbcWalletBridge({
  apis,
  publicConfig,
  orderCnyTotal,
  enabled,
  selectedAssetSymbol
}: NbcWalletBridgeProps) {
  const walletState = useNbcWallet(apis, publicConfig, {
    orderCnyTotal,
    autoLoadBalance: enabled,
    syncPageContextOnConnect: false,
    selectedAssetSymbol
  });

  useEffect(() => {
    if (!enabled) {
      resetCheckoutWalletSnapshot();
      return;
    }
    setCheckoutWalletSnapshot({
      wallet: walletState.wallet,
      onchainBalance: walletState.onchainBalance,
      onchainWalletAddress: walletState.onchainWalletAddress,
      connecting: walletState.connecting,
      loadingBalance: walletState.loadingBalance,
      loadingOnchainBalance: walletState.loadingOnchainBalance,
      error: walletState.error,
      requiredNbc: walletState.requiredNbc,
      requiredAssetAmount: walletState.requiredAssetAmount,
      selectedAssetSymbol: walletState.selectedAssetSymbol,
      selectedAsset: walletState.selectedAsset,
      availableBalance: walletState.availableBalance,
      hasSufficientBalance: walletState.hasSufficientBalance,
      isConnected: walletState.isConnected,
      connect: walletState.connect,
      refreshBalance: walletState.refreshBalance
    });
  }, [enabled, walletState]);

  useEffect(() => {
    return () => resetCheckoutWalletSnapshot();
  }, []);

  return null;
}
