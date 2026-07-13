import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { Input } from '@components/common/ui/Input.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/common/ui/Tabs.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  CircleDollarSign,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet
} from 'lucide-react';
import React from 'react';
import { toast } from 'react-toastify';

type WalletSummary = {
  availableBalance: number;
  balance: number;
  walletAddress: string;
  assets?: WalletAssetBalance[];
};

type WalletAssetBalance = {
  symbol: string;
  displayName?: string;
  balance: number;
  frozenBalance: number;
  availableBalance: number;
  tokenAddress?: string | null;
  tokenDecimals?: number | null;
};

type PublicAsset = {
  symbol: string;
  displayName?: string;
  chainId?: number | null;
  assetType: 'native' | 'erc20' | string;
  tokenAddress?: string | null;
  tokenDecimals?: number | null;
};

type DepositTx = {
  uuid: string;
  amount: number;
  displayAmount?: number;
  transactionType: string;
  createdAt?: string;
  reference?: string;
  status?: string;
  assetSymbol?: string;
};

type DepositAddressData = {
  mode: 'hd' | 'treasury';
  walletId: number;
  customerId: number;
  depositAddress: string;
  addressIndex: number | null;
  chainId: number;
  tokenAddress: string;
};

const DISPLAY_DECIMALS = 8;

function formatNbcAmount(value: number, maximumFractionDigits = DISPLAY_DECIMALS) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}

function toInputAmount(value: number, maximumFractionDigits = DISPLAY_DECIMALS) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const fixed = value.toFixed(maximumFractionDigits);
  return fixed.replace(/\.?0+$/, '');
}

interface DepositButtonProps {
  customer?: {
    uuid: string;
  } | null;
  loginUrl: string;
  authRequestApi: string;
  authVerifyApi: string;
  depositAddressApi: string;
  balanceApi: string;
  transactionsApi: string;
  withdrawApi: string;
  nbcWalletPublicConfig: {
    chainId?: number | null;
    tokenAddress?: string | null;
    tokenDecimals?: number | null;
    assets?: PublicAsset[];
    blockExplorerUrl?: string | null;
    onchainEnabled: boolean;
    onchainEnabledRaw?: number | null;
    treasuryAddress?: string | null;
  };
}

function toRpcHex(value: bigint) {
  return `0x${value.toString(16)}`;
}

function parseDecimalToUnits(value: string, decimals = 18): bigint {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error('Deposit amount must be greater than 0');
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Invalid deposit amount');
  }

  const [whole, fraction = ''] = normalized.split('.');
  const paddedFraction = (fraction + '0'.repeat(decimals)).slice(0, decimals);
  const wholeUnits = BigInt(whole || '0') * 10n ** BigInt(decimals);
  const fractionUnits = BigInt(paddedFraction || '0');
  return wholeUnits + fractionUnits;
}

function encodeErc20Transfer(to: string, amount: bigint) {
  const address = to.toLowerCase().replace(/^0x/, '');
  if (address.length !== 40) {
    throw new Error('Invalid deposit address');
  }
  const method = 'a9059cbb';
  const toWord = address.padStart(64, '0');
  const amountWord = amount.toString(16).padStart(64, '0');
  return `0x${method}${toWord}${amountWord}`;
}

async function requestWithTimeout<T>(
  action: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });
  try {
    return await Promise.race([action, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function parseJson(response: Response) {
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.error) {
    console.error('[nbc-wallet] api error response', {
      url: response.url,
      status: response.status,
      body: json
    });
    throw new Error(json?.error?.message || 'Request failed');
  }
  return json?.data;
}

const fetchOpts: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
};

function withAssetParam(api: string, assetSymbol: string) {
  const url = new URL(api, window.location.origin);
  url.searchParams.set('asset', assetSymbol);
  return url.toString();
}

async function requestDepositAddress(
  depositAddressApi: string,
  assetSymbol: string
): Promise<DepositAddressData> {
  return parseJson(
    await fetch(withAssetParam(depositAddressApi, assetSymbol), {
      ...fetchOpts,
      method: 'POST'
    })
  );
}

async function fetchWalletBalance(balanceApi: string): Promise<WalletSummary | null> {
  const data = await parseJson(await fetch(balanceApi, { ...fetchOpts, method: 'GET' }));
  return data?.wallet || null;
}

async function fetchOnchainDepositTransactions(
  transactionsApi: string,
  assetSymbol: string
): Promise<DepositTx[]> {
  const url = new URL(transactionsApi, window.location.origin);
  url.searchParams.set('limit', '5');
  url.searchParams.set('transactionType', 'onchain_deposit');
  url.searchParams.set('asset', assetSymbol);
  const data = await parseJson(await fetch(url.toString(), { ...fetchOpts, method: 'GET' }));
  return data?.items || [];
}

async function requestWalletWithdrawal(
  withdrawApi: string,
  amount: number,
  assetSymbol: string
) {
  return parseJson(
    await fetch(withdrawApi, {
      ...fetchOpts,
      method: 'POST',
      body: JSON.stringify({ amount, asset: assetSymbol })
    })
  );
}

async function requestWalletAuth(authRequestApi: string, walletAddress: string) {
  return parseJson(
    await fetch(authRequestApi, {
      ...fetchOpts,
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    })
  ) as Promise<{
    walletAddress: string;
    nonce: string;
    message: string;
    expiresAt: string;
  }>;
}

async function verifyWalletAuth(
  authVerifyApi: string,
  payload: { walletAddress: string; nonce: string; signature: string }
) {
  return parseJson(
    await fetch(authVerifyApi, {
      ...fetchOpts,
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

function mapDepositErrorMessage(message: string) {
  const normalized = String(message || '').toLowerCase();
  if (
    normalized.includes('hdmastermnemonic is required') ||
    normalized.includes('treasuryaddress is required')
  ) {
    return _('On-chain deposit is not configured yet. Please contact support.');
  }
  if (normalized.includes('wallet not found')) {
    return _('Wallet account is not ready. Please try reconnecting your wallet.');
  }
  if (normalized.includes('customer login is required')) {
    return _('Please connect wallet and sign in first.');
  }
  if (normalized.includes('please connect wallet and sign in first')) {
    return _('Please connect wallet and sign in first.');
  }
  return message;
}

function shouldSkipDepositAutoRefresh(errorMessage: string) {
  const normalized = String(errorMessage || '').toLowerCase();
  return (
    normalized.includes('on-chain deposit is not configured yet') ||
    normalized.includes('链上充值暂未完成配置') ||
    normalized.includes('please connect wallet and sign in first') ||
    normalized.includes('请先连接钱包并登录')
  );
}

function mapWithdrawalErrorMessage(message: string) {
  const normalized = String(message || '').toLowerCase();
  if (
    normalized.includes('withdraw amount must be greater than 0') ||
    normalized.includes('amount must be greater than 0')
  ) {
    return _('Withdraw amount must be greater than 0');
  }
  if (normalized.includes('withdrawal amount must be at least')) {
    return _('Withdrawal amount must be at least 1 NBC');
  }
  if (
    normalized.includes('withdrawal amount exceeds available balance') ||
    normalized.includes('balance is insufficient for withdrawal')
  ) {
    return _('Withdrawal amount exceeds available balance');
  }
  if (normalized.includes('customer login is required')) {
    return _('Please connect wallet and sign in first.');
  }
  if (normalized.includes('daily withdrawal limit')) {
    return _('Daily withdrawal limit exceeded');
  }
  return message;
}

function WalletActionPanel({
  isDeposit,
  wallet,
  loading,
  amount,
  setAmount,
  ratio,
  setRatio,
  onPrimaryAction,
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  balanceLabel,
  assets,
  selectedAssetSymbol,
  onSelectAsset
}: {
  isDeposit: boolean;
  wallet: WalletSummary | null;
  loading: boolean;
  amount: string;
  setAmount: (value: string) => void;
  ratio: number;
  setRatio: (value: number) => void;
  onPrimaryAction: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  balanceLabel?: string;
  assets: PublicAsset[];
  selectedAssetSymbol: string;
  onSelectAsset: (symbol: string) => void;
}) {
  const selectedWalletAsset = wallet?.assets?.find(
    (asset) => asset.symbol === selectedAssetSymbol
  );
  const availableBalance =
    selectedWalletAsset?.availableBalance ??
    (selectedAssetSymbol === 'NBC' ? wallet?.availableBalance || 0 : 0);
  const totalBalance =
    selectedWalletAsset?.balance ??
    (selectedAssetSymbol === 'NBC' ? wallet?.balance || 0 : 0);
  const selectedCoinBalance = isDeposit ? totalBalance : availableBalance;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{_('Select coin')}</p>
        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => {
            const active = asset.symbol === selectedAssetSymbol;
            const assetBalance = wallet?.assets?.find(
              (item) => item.symbol === asset.symbol
            );
            const displayBalance =
              assetBalance?.balance ??
              (asset.symbol === 'NBC' ? wallet?.balance || 0 : 0);
            return (
              <button
                key={asset.symbol}
                type="button"
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-muted/35 hover:bg-muted/55'
                }`}
                onClick={() => onSelectAsset(asset.symbol)}
              >
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4" />
                  <span className="font-medium">{asset.symbol}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {loading ? '...' : formatNbcAmount(active ? selectedCoinBalance : displayBalance)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`grid gap-2 text-xs ${isDeposit ? 'grid-cols-1' : 'grid-cols-2'}`}
      >
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-muted-foreground mb-1">
            {balanceLabel || (isDeposit ? _('Wallet balance') : _('Store balance (for payment)'))}
          </p>
          <p className="font-semibold">
            {loading ? '...' : `${formatNbcAmount(totalBalance)} ${selectedAssetSymbol}`}
          </p>
        </div>
        {!isDeposit && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground mb-1">{_('Withdrawable balance')}</p>
            <p className="font-semibold">
              {loading ? '...' : `${formatNbcAmount(availableBalance)} ${selectedAssetSymbol}`}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isDeposit ? _('Deposit amount') : _('Withdraw amount')}</span>
          <span>{isDeposit ? _('MAX') : _('Highest')}</span>
        </div>
        <div className="relative">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`0.00 ${selectedAssetSymbol}`}
            className="h-10 rounded-lg bg-background pr-24"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $0.00
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{ratio}%</p>
        <input
          type="range"
          min={0}
          max={100}
          value={ratio}
          onChange={(e) => {
            const nextRatio = Number(e.target.value);
            setRatio(nextRatio);
            const baseAmount = isDeposit ? totalBalance : availableBalance;
            const nextAmount = (baseAmount * nextRatio) / 100;
            setAmount(toInputAmount(nextAmount));
          }}
          className="w-full accent-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <DialogClose
          render={
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-all hover:bg-muted/40"
            />
          }
        >
          {_('Close')}
        </DialogClose>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            console.log('[nbc-wallet] primary action clicked');
            onPrimaryAction();
          }}
          disabled={primaryDisabled}
        >
          {primaryLoading ? _('Processing...') : primaryLabel}
        </button>
      </div>
    </div>
  );
}

export default function DepositButton({
  customer,
  loginUrl,
  authRequestApi,
  authVerifyApi,
  depositAddressApi,
  balanceApi,
  transactionsApi,
  withdrawApi,
  nbcWalletPublicConfig
}: DepositButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'deposit' | 'withdraw'>('deposit');
  const [selectedAssetSymbol, setSelectedAssetSymbol] = React.useState('NBC');
  const [depositAddress, setDepositAddress] = React.useState<DepositAddressData | null>(
    null
  );
  const [wallet, setWallet] = React.useState<WalletSummary | null>(null);
  const [depositTxs, setDepositTxs] = React.useState<DepositTx[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [depositAmount, setDepositAmount] = React.useState('');
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [depositRatio, setDepositRatio] = React.useState(0);
  const [withdrawRatio, setWithdrawRatio] = React.useState(0);
  const [submittingWithdrawal, setSubmittingWithdrawal] = React.useState(false);
  const [submittingDeposit, setSubmittingDeposit] = React.useState(false);
  const [autoSigningIn, setAutoSigningIn] = React.useState(false);
  const [pauseDepositPolling, setPauseDepositPolling] = React.useState(false);
  const [openRefreshing, setOpenRefreshing] = React.useState(false);
  const [debugLogs, setDebugLogs] = React.useState<string[]>([]);
  const autoSignInAttemptedRef = React.useRef<string | null>(null);
  const sessionReadyRef = React.useRef(false);
  const hasCustomerSession = Boolean(wallet?.walletAddress);
  const publicAssets = React.useMemo<PublicAsset[]>(
    () =>
      nbcWalletPublicConfig.assets?.length
        ? nbcWalletPublicConfig.assets
        : [
            {
              symbol: 'NBC',
              displayName: 'NBC',
              assetType: nbcWalletPublicConfig.tokenAddress ? 'erc20' : 'native',
              chainId: nbcWalletPublicConfig.chainId,
              tokenAddress: nbcWalletPublicConfig.tokenAddress || null,
              tokenDecimals: nbcWalletPublicConfig.tokenDecimals || 18
            }
          ],
    [nbcWalletPublicConfig]
  );
  const selectedPublicAsset = React.useMemo(
    () =>
      publicAssets.find((asset) => asset.symbol === selectedAssetSymbol) ||
      publicAssets[0],
    [publicAssets, selectedAssetSymbol]
  );
  const selectedWalletAsset = React.useMemo(
    () => wallet?.assets?.find((asset) => asset.symbol === selectedAssetSymbol),
    [selectedAssetSymbol, wallet?.assets]
  );
  const selectedAvailableBalance =
    selectedWalletAsset?.availableBalance ??
    (selectedAssetSymbol === 'NBC' ? wallet?.availableBalance || 0 : 0);
  const canSubmitDeposit = React.useMemo(() => {
    const amount = Number(String(depositAmount || '').trim());
    return Number.isFinite(amount) && amount > 0;
  }, [depositAmount]);

  React.useEffect(() => {
    sessionReadyRef.current = hasCustomerSession;
  }, [hasCustomerSession]);

  const pushDebugLog = React.useCallback(
    (step: string, detail?: unknown) => {
      const line = `${new Date().toLocaleTimeString()} ${step}`;
      console.log('[nbc-wallet-debug]', line, detail ?? '');
      setDebugLogs((prev) => [line, ...prev].slice(0, 8));
    },
    []
  );

  const loadDepositData = React.useCallback(async () => {
    pushDebugLog('Loading deposit data started');
    setLoading(true);
    setError('');
    try {
      const [addressData, walletData, txData] = await Promise.all([
        requestDepositAddress(depositAddressApi, selectedAssetSymbol),
        fetchWalletBalance(balanceApi),
        fetchOnchainDepositTransactions(transactionsApi, selectedAssetSymbol)
      ]);
      console.log('[nbc-wallet] deposit-address response', addressData);
      setPauseDepositPolling(false);
      setDepositAddress(addressData);
      setWallet(walletData);
      setDepositTxs(txData);
      pushDebugLog('Loading deposit data succeeded', {
        hasAddress: Boolean(addressData?.depositAddress),
        hasWallet: Boolean(walletData?.walletAddress),
        txCount: Array.isArray(txData) ? txData.length : 0
      });
    } catch (error) {
      console.error('[nbc-wallet] deposit-address error', error);
      const message = mapDepositErrorMessage(
        error instanceof Error ? error.message : _('Failed to load deposit data')
      );
      setPauseDepositPolling(shouldSkipDepositAutoRefresh(message));
      setError(message);
      setDepositAddress(null);
      setDepositTxs([]);
      pushDebugLog('Loading deposit data failed', { message });
    } finally {
      setLoading(false);
      setOpenRefreshing(false);
    }
  }, [
    balanceApi,
    depositAddressApi,
    pushDebugLog,
    selectedAssetSymbol,
    transactionsApi
  ]);

  const loadWalletData = React.useCallback(async () => {
    try {
      const walletData = await fetchWalletBalance(balanceApi);
      setWallet(walletData);
      sessionReadyRef.current = Boolean(walletData?.walletAddress);
    } catch {
      setWallet(null);
      sessionReadyRef.current = false;
    } finally {
      setOpenRefreshing(false);
    }
  }, [balanceApi]);

  React.useEffect(() => {
    if (!open) {
      setOpenRefreshing(false);
      return;
    }
    // Clear displayed payload on each open to avoid showing stale values.
    setOpenRefreshing(true);
    setError('');
    setDepositAddress(null);
    setDepositTxs([]);
  }, [open]);

  const ensureCustomerSession = React.useCallback(
    async (ethereum: any, walletAddress: string) => {
      pushDebugLog('Auto sign-in started', { walletAddress });
      const auth = await requestWithTimeout(
        requestWalletAuth(authRequestApi, walletAddress),
        12000,
        _('Wallet sign-in request timed out. Please try again.')
      );
      const signature = (await requestWithTimeout(
        ethereum.request({
          method: 'personal_sign',
          params: [auth.message, auth.walletAddress]
        }) as Promise<string>,
        20000,
        _('Wallet signature timed out. Please check wallet popup.')
      )) as string;
      await requestWithTimeout(
        verifyWalletAuth(authVerifyApi, {
          walletAddress: auth.walletAddress,
          nonce: auth.nonce,
          signature
        }),
        12000,
        _('Wallet sign-in verify timed out. Please try again.')
      );
      pushDebugLog('Auto sign-in succeeded');
    },
    [authRequestApi, authVerifyApi, pushDebugLog]
  );

  React.useEffect(() => {
    if (!open || activeTab !== 'deposit' || wallet || autoSigningIn || customer?.uuid) {
      return;
    }
    const ethereum = (window as any).ethereum || (window as any).okxwallet?.ethereum;
    if (!ethereum?.request) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const accounts = (await ethereum.request({
          method: 'eth_accounts'
        })) as string[];
        const connected = String(accounts?.[0] || '').toLowerCase();
        if (!connected || cancelled) {
          return;
        }
        if (autoSignInAttemptedRef.current === connected) {
          return;
        }
        autoSignInAttemptedRef.current = connected;
        setAutoSigningIn(true);
        await ensureCustomerSession(ethereum, connected);
        sessionReadyRef.current = true;
        if (!cancelled) {
          await loadDepositData();
          await loadWalletData();
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : _('Please connect wallet and sign in first.');
          sessionReadyRef.current = false;
          setError(message);
          pushDebugLog('Auto sign-in failed', { message });
        }
      } finally {
        if (!cancelled) {
          setAutoSigningIn(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    autoSigningIn,
    customer?.uuid,
    ensureCustomerSession,
    loadDepositData,
    loadWalletData,
    open,
    pushDebugLog,
    wallet
  ]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    console.info('[nbc-wallet] deposit config', {
      onchainEnabled: nbcWalletPublicConfig.onchainEnabled,
      onchainEnabledRaw: nbcWalletPublicConfig.onchainEnabledRaw ?? null
    });
    if (activeTab === 'deposit' && pauseDepositPolling) {
      return;
    }
    // If wallet is connected but customer session is not ready,
    // skip polling until sign-in flow finishes and session is established.
    if (activeTab === 'deposit' && !hasCustomerSession && !customer?.uuid) {
      const ethereum = (window as any).ethereum || (window as any).okxwallet?.ethereum;
      if (ethereum?.request) {
        pushDebugLog('Skipping deposit load while waiting sign-in');
        return;
      }
    }
    if (activeTab === 'deposit') {
      loadDepositData();
    } else {
      loadWalletData();
    }
    const timer = window.setInterval(
      () => {
        if (activeTab === 'deposit' && !hasCustomerSession && !customer?.uuid) {
          const ethereum = (window as any).ethereum || (window as any).okxwallet?.ethereum;
          if (ethereum?.request) {
            return;
          }
        }
        if (activeTab === 'deposit') {
          loadDepositData();
          return;
        }
        loadWalletData();
      },
      activeTab === 'deposit' ? 10000 : 15000
    );
    return () => {
      window.clearInterval(timer);
    };
  }, [
    activeTab,
    loadDepositData,
    loadWalletData,
    nbcWalletPublicConfig.onchainEnabled,
    nbcWalletPublicConfig.onchainEnabledRaw,
    autoSigningIn,
    customer?.uuid,
    hasCustomerSession,
    pauseDepositPolling,
    pushDebugLog,
    open
  ]);

  const handleCopyAddress = React.useCallback(async () => {
    if (!depositAddress?.depositAddress) return;
    try {
      await navigator.clipboard.writeText(depositAddress.depositAddress);
      toast.success(_('Deposit address copied'));
    } catch {
      toast.error(_('Failed to copy deposit address'));
    }
  }, [depositAddress?.depositAddress]);

  const handleSelectAsset = React.useCallback((symbol: string) => {
    setSelectedAssetSymbol(symbol);
    setDepositAddress(null);
    setDepositTxs([]);
    setDepositAmount('');
    setWithdrawAmount('');
    setDepositRatio(0);
    setWithdrawRatio(0);
    setError('');
    setOpenRefreshing(true);
  }, []);

  const handleDepositAction = React.useCallback(async () => {
    pushDebugLog('Add funds clicked');
    setError('');
    let targetDepositAddress = depositAddress?.depositAddress || '';
    if (!targetDepositAddress) {
      pushDebugLog('Deposit address missing, requesting address');
      try {
        const latestAddress = await requestDepositAddress(
          depositAddressApi,
          selectedAssetSymbol
        );
        setDepositAddress(latestAddress);
        targetDepositAddress = latestAddress.depositAddress;
      } catch (error) {
        const message = mapDepositErrorMessage(
          error instanceof Error ? error.message : _('Failed to get deposit address')
        );
        setError(message);
        toast.error(message);
        return;
      }
    }
    const amountText = String(depositAmount || '').trim();
    if (!amountText || Number(amountText) <= 0) {
      const message = _('Deposit amount must be greater than 0');
      pushDebugLog('Validation failed: amount <= 0');
      setError(message);
      toast.error(message);
      return;
    }

    const ethereum = (window as any).ethereum || (window as any).okxwallet?.ethereum;
    if (!ethereum?.request) {
      const message = _('No Web3 wallet detected. Install MetaMask or another wallet.');
      pushDebugLog('Validation failed: wallet provider missing');
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setSubmittingDeposit(true);
      pushDebugLog('Requesting wallet accounts');
      toast.info(_('Requesting wallet confirmation...'));
      const accounts = (await requestWithTimeout(
        ethereum.request({
          method: 'eth_requestAccounts'
        }) as Promise<string[]>,
        12000,
        _('Wallet did not respond. Please check wallet popup or extension site access.')
      )) as string[];
      const from = accounts?.[0];
      if (!from) {
        throw new Error('No wallet account returned');
      }
      pushDebugLog('Wallet account ready', { from });

      let sessionReady = sessionReadyRef.current || hasCustomerSession;
      if (!sessionReady) {
        await loadWalletData();
        sessionReady = sessionReadyRef.current || hasCustomerSession;
      }
      if (!sessionReady && !customer?.uuid) {
        pushDebugLog('Customer session missing, starting wallet sign-in');
        await ensureCustomerSession(ethereum, from);
        await loadDepositData();
        sessionReadyRef.current = true;
      } else if (!sessionReady && customer?.uuid) {
        pushDebugLog('Customer session already exists, skip wallet sign-in');
      }

      const chainId = selectedPublicAsset?.chainId || nbcWalletPublicConfig.chainId;
      if (chainId && chainId > 0) {
        const chainIdHex = `0x${Number(chainId).toString(16)}`;
        pushDebugLog('Switching wallet chain', {
          chainId,
          chainIdHex
        });
        await requestWithTimeout(
          ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }]
          }),
          12000,
          _('Wallet network switch timed out. Please switch network in wallet manually.')
        );
        pushDebugLog('Wallet chain ready');
      }

      const tokenAddress = String(selectedPublicAsset?.tokenAddress || '').trim();
      const tokenDecimals = Number(selectedPublicAsset?.tokenDecimals || 18);
      const units = parseDecimalToUnits(amountText, tokenAddress ? tokenDecimals : 18);
      if (units <= 0n) {
        throw new Error('Deposit amount must be greater than 0');
      }
      pushDebugLog('Prepared transfer params', {
        to: targetDepositAddress,
        tokenAddress: tokenAddress || null,
        amount: amountText,
        units: units.toString()
      });

      const txParams = tokenAddress
        ? {
            from,
            to: tokenAddress,
            value: '0x0',
            data: encodeErc20Transfer(targetDepositAddress, units)
          }
        : {
            from,
            to: targetDepositAddress,
            value: toRpcHex(units)
          };

      pushDebugLog('Sending transaction request');
      const txHash = (await requestWithTimeout(
        ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams]
        }) as Promise<string>,
        20000,
        _('Wallet transaction request timed out. Please check wallet popup.')
      )) as string;

      pushDebugLog('Transaction submitted', { txHash });
      setError('');
      toast.success(_('Deposit transaction submitted: ${txHash}', { txHash }));
      await loadDepositData();
    } catch (error) {
      const code = (error as any)?.code;
      pushDebugLog('Deposit flow error', {
        code: code ?? null,
        message: error instanceof Error ? error.message : String(error)
      });
      if (code === 4001) {
        const message = _('Transaction was rejected by wallet');
        setError(message);
        toast.error(message);
        return;
      }
      const message = error instanceof Error ? error.message : _('Failed to submit deposit transaction');
      setError(message);
      toast.error(message);
    } finally {
      setSubmittingDeposit(false);
      pushDebugLog('Deposit flow finished');
    }
  }, [
    depositAddress?.depositAddress,
    depositAmount,
    ensureCustomerSession,
    loadDepositData,
    depositAddressApi,
    customer?.uuid,
    nbcWalletPublicConfig.chainId,
    selectedAssetSymbol,
    selectedPublicAsset,
    pushDebugLog,
    hasCustomerSession,
    loadWalletData
  ]);

  const handleWithdrawAction = React.useCallback(async () => {
    const amount = Number(String(withdrawAmount || '').trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(_('Withdraw amount must be greater than 0'));
      return;
    }
    if (amount < 1) {
      toast.error(`Withdrawal amount must be at least 1 ${selectedAssetSymbol}`);
      return;
    }
    if (amount > selectedAvailableBalance) {
      toast.error(_('Withdrawal amount exceeds available balance'));
      return;
    }
    try {
      setSubmittingWithdrawal(true);
      await requestWalletWithdrawal(withdrawApi, amount, selectedAssetSymbol);
      toast.success(_('Withdrawal request submitted'));
      setWithdrawAmount('');
      setWithdrawRatio(0);
      await loadWalletData();
    } catch (error) {
      const message = mapWithdrawalErrorMessage(
        error instanceof Error ? error.message : _('Failed to request withdrawal')
      );
      toast.error(message);
    } finally {
      setSubmittingWithdrawal(false);
    }
  }, [
    loadWalletData,
    selectedAssetSymbol,
    selectedAvailableBalance,
    withdrawAmount,
    withdrawApi
  ]);

  const latestDeposit = depositTxs[0] || null;
  const explorerTxUrl =
    latestDeposit?.reference && nbcWalletPublicConfig.blockExplorerUrl
      ? `${String(nbcWalletPublicConfig.blockExplorerUrl).replace(/\/$/, '')}/tx/${latestDeposit.reference}`
      : '';

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && !customer?.uuid) {
        window.location.href = loginUrl || '/account/login';
        return;
      }
      setOpen(nextOpen);
    },
    [customer?.uuid, loginUrl]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="web3-wallet-btn"
          />
        }
      >
        <Wallet className="h-4 w-4" />
        {_('Deposit')}
      </DialogTrigger>
      <DialogContent
        className="max-w-[430px] rounded-2xl border border-primary/20 web3-glass p-5 text-foreground shadow-[0_0_40px_rgba(0,240,255,0.1)]"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">{_('Deposit and Withdraw')}</DialogTitle>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'deposit' | 'withdraw')}
          className="w-full"
        >
          <TabsList className="w-full rounded-lg bg-muted p-1">
            <TabsTrigger
              value="deposit"
              className="h-9 rounded-md text-muted-foreground data-active:bg-background data-active:text-foreground"
            >
              {_('Deposit')}
            </TabsTrigger>
            <TabsTrigger
              value="withdraw"
              className="h-9 rounded-md text-muted-foreground data-active:bg-background data-active:text-foreground"
            >
              {_('Withdraw')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-4">
            <div className="space-y-3">
              <WalletActionPanel
                isDeposit
                wallet={wallet}
                loading={loading || openRefreshing}
                amount={depositAmount}
                setAmount={setDepositAmount}
                ratio={depositRatio}
                setRatio={setDepositRatio}
                onPrimaryAction={handleDepositAction}
                primaryLabel={_('Add funds')}
                primaryDisabled={submittingDeposit || !canSubmitDeposit}
                primaryLoading={submittingDeposit}
                balanceLabel={_('Store balance (for payment)')}
                assets={publicAssets}
                selectedAssetSymbol={selectedAssetSymbol}
                onSelectAsset={handleSelectAsset}
              />
              {debugLogs.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  <p className="mb-1 font-medium">{_('Debug logs')}</p>
                  <div className="space-y-1 font-mono text-muted-foreground">
                    {debugLogs.map((line, index) => (
                      <div key={`${line}-${index}`}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
              {(loading || openRefreshing) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {_('Loading deposit data')}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!openRefreshing && depositAddress && (
                <div className="rounded-lg border border-border bg-muted/25 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {_('Deposit address')}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="rounded bg-background px-2 py-0.5 text-[11px] text-muted-foreground border border-border">
                        {depositAddress.mode === 'hd' ? 'HD' : _('Treasury')}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-xs break-all">{depositAddress.depositAddress}</p>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={handleCopyAddress}>
                      <Copy className="h-4 w-4" />
                      {_('Copy')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => loadDepositData()}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      {_('Refresh')}
                    </Button>
                  </div>
                  {latestDeposit && (
                    <div className="rounded-md border border-border bg-background p-2 text-xs">
                      <p>
                        {_('Latest deposit')}: +
                        {latestDeposit.displayAmount ?? latestDeposit.amount}{' '}
                        {latestDeposit.assetSymbol || selectedAssetSymbol}
                      </p>
                      <p className="text-muted-foreground">
                        {_('Status')}: {latestDeposit.status || 'completed'}
                      </p>
                      {explorerTxUrl && (
                        <a
                          href={explorerTxUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                        >
                          {_('View on explorer')}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="withdraw" className="mt-4">
            <WalletActionPanel
              isDeposit={false}
              wallet={wallet}
              loading={loading || openRefreshing}
              amount={withdrawAmount}
              setAmount={setWithdrawAmount}
              ratio={withdrawRatio}
              setRatio={setWithdrawRatio}
              onPrimaryAction={handleWithdrawAction}
              primaryLabel={_('Withdraw')}
              primaryLoading={submittingWithdrawal}
              primaryDisabled={!wallet || submittingWithdrawal}
              balanceLabel={_('Store balance (for payment)')}
              assets={publicAssets}
              selectedAssetSymbol={selectedAssetSymbol}
              onSelectAsset={handleSelectAsset}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export const layout = {
  areaId: 'headerMiddleRight',
  sortOrder: 15
};

export const query = `
  query Query {
    customer: currentCustomer {
      uuid
    }
    loginUrl: url(routeId: "login")
    authRequestApi: url(routeId: "authRequest")
    authVerifyApi: url(routeId: "authVerify")
    depositAddressApi: url(routeId: "nbcWalletDepositAddress")
    balanceApi: url(routeId: "nbcWalletBalance")
    transactionsApi: url(routeId: "nbcWalletTransactions")
    withdrawApi: url(routeId: "nbcWalletWithdraw")
    nbcWalletPublicConfig {
      chainId
      tokenAddress
      tokenDecimals
      assets {
        symbol
        displayName
        chainId
        assetType
        tokenAddress
        tokenDecimals
      }
      blockExplorerUrl
      onchainEnabled
      onchainEnabledRaw
      treasuryAddress
    }
  }
`;
