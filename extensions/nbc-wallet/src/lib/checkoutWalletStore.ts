import { useEffect, useState } from 'react';
import { WalletSummary } from './nbcWalletApi.js';

export interface CheckoutWalletSnapshot {
  wallet: WalletSummary | null;
  onchainBalance: number | null;
  onchainWalletAddress: string | null;
  connecting: boolean;
  loadingBalance: boolean;
  loadingOnchainBalance: boolean;
  error: string | null;
  requiredNbc: number;
  availableBalance: number;
  hasSufficientBalance: boolean;
  isConnected: boolean;
  connect: (() => Promise<void>) | null;
  refreshBalance: (() => Promise<void>) | null;
}

const defaultSnapshot: CheckoutWalletSnapshot = {
  wallet: null,
  onchainBalance: null,
  onchainWalletAddress: null,
  connecting: false,
  loadingBalance: false,
  loadingOnchainBalance: false,
  error: null,
  requiredNbc: 0,
  availableBalance: 0,
  hasSufficientBalance: false,
  isConnected: false,
  connect: null,
  refreshBalance: null
};

let snapshot: CheckoutWalletSnapshot = { ...defaultSnapshot };
const listeners = new Set<() => void>();

export function setCheckoutWalletSnapshot(
  partial: Partial<CheckoutWalletSnapshot>
) {
  snapshot = { ...snapshot, ...partial };
  listeners.forEach((listener) => listener());
}

export function resetCheckoutWalletSnapshot() {
  snapshot = { ...defaultSnapshot };
  listeners.forEach((listener) => listener());
}

export function useCheckoutWalletSnapshot(): CheckoutWalletSnapshot {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return snapshot;
}
