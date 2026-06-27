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
  ChevronRight,
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
};

type OnchainBalance = {
  walletAddress: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  source: 'native' | 'erc20';
  chainId: number;
  tokenAddress: string | null;
};

type DepositTx = {
  uuid: string;
  amount: number;
  transactionType: string;
  createdAt?: string;
  reference?: string;
  status?: string;
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

interface DepositButtonProps {
  authRequestApi: string;
  authVerifyApi: string;
  depositAddressApi: string;
  balanceApi: string;
  onchainBalanceApi: string;
  transactionsApi: string;
  withdrawApi: string;
  nbcWalletPublicConfig: {
    chainId?: number | null;
    tokenAddress?: string | null;
    tokenDecimals?: number | null;
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

async function requestDepositAddress(depositAddressApi: string): Promise<DepositAddressData> {
  return parseJson(
    await fetch(depositAddressApi, {
      ...fetchOpts,
      method: 'POST'
    })
  );
}

async function fetchWalletBalance(balanceApi: string): Promise<WalletSummary | null> {
  const data = await parseJson(await fetch(balanceApi, { ...fetchOpts, method: 'GET' }));
  return data?.wallet || null;
}

async function fetchOnchainBalance(
  onchainBalanceApi: string,
  walletAddress: string
): Promise<OnchainBalance | null> {
  if (!walletAddress) {
    return null;
  }
  const url = new URL(onchainBalanceApi, window.location.origin);
  url.searchParams.set('walletAddress', walletAddress);
  const data = await parseJson(await fetch(url.toString(), { ...fetchOpts, method: 'GET' }));
  return data || null;
}

async function fetchOnchainDepositTransactions(
  transactionsApi: string
): Promise<DepositTx[]> {
  const url = new URL(transactionsApi, window.location.origin);
  url.searchParams.set('limit', '5');
  url.searchParams.set('transactionType', 'onchain_deposit');
  const data = await parseJson(await fetch(url.toString(), { ...fetchOpts, method: 'GET' }));
  return data?.items || [];
}

async function requestWalletWithdrawal(withdrawApi: string, amount: number) {
  return parseJson(
    await fetch(withdrawApi, {
      ...fetchOpts,
      method: 'POST',
      body: JSON.stringify({ amount })
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const dataMessage = (error as any)?.data?.message || (error as any)?.data?.originalError?.message;
    const directMessage = (error as any)?.message;
    if (typeof dataMessage === 'string' && dataMessage && dataMessage !== '[object Object]') {
      return dataMessage;
    }
    if (typeof directMessage === 'string' && directMessage && directMessage !== '[object Object]') {
      return directMessage;
    }
  }
  return '';
}

function mapDepositTransactionError(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  if (normalized.includes('insufficient funds')) {
    return _('Wallet balance is not enough for the deposit amount plus gas.');
  }
  return message || _('Failed to submit deposit transaction');
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
  maxBalance
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
  maxBalance?: number | null;
}) {
  const availableBalance = wallet?.availableBalance || 0;
  const totalBalance = wallet?.balance || 0;
  const actionBalance = maxBalance ?? (isDeposit ? totalBalance : availableBalance);
  const coinBalance = isDeposit ? actionBalance : totalBalance;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{_('Select coin')}</p>
        <button
          type="button"
          className="w-full rounded-lg border border-border bg-muted/35 px-3 py-2.5 flex items-center justify-between transition-colors hover:bg-muted/55"
        >
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            <span className="font-medium">NBC</span>
            <span className="text-xs text-muted-foreground">
              {loading ? '...' : coinBalance.toLocaleString()}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div
        className={`grid gap-2 text-xs ${isDeposit ? 'grid-cols-1' : 'grid-cols-2'}`}
      >
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-muted-foreground mb-1">
            {balanceLabel || (isDeposit ? _('Wallet balance') : _('Store balance (for payment)'))}
          </p>
          <p className="font-semibold">
            {loading ? '...' : `${(isDeposit ? actionBalance : totalBalance).toLocaleString()} NBC`}
          </p>
        </div>
        {!isDeposit && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground mb-1">{_('Withdrawable balance')}</p>
            <p className="font-semibold">
              {loading ? '...' : `${availableBalance.toLocaleString()} NBC`}
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
            placeholder="0.00 NBC"
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
            const baseAmount = isDeposit ? actionBalance : availableBalance;
            const nextAmount = (baseAmount * nextRatio) / 100;
            setAmount(nextAmount <= 0 ? '' : String(Math.floor(nextAmount)));
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
  authRequestApi,
  authVerifyApi,
  depositAddressApi,
  balanceApi,
  onchainBalanceApi,
  transactionsApi,
  withdrawApi,
  nbcWalletPublicConfig
}: DepositButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'deposit' | 'withdraw'>('deposit');
  const [depositAddress, setDepositAddress] = React.useState<DepositAddressData | null>(
    null
  );
  const [wallet, setWallet] = React.useState<WalletSummary | null>(null);
  const [onchainBalance, setOnchainBalance] = React.useState<OnchainBalance | null>(null);
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
  const [debugLogs, setDebugLogs] = React.useState<string[]>([]);
  const autoSignInAttemptedRef = React.useRef<string | null>(null);
  const sessionReadyRef = React.useRef(false);
  const hasCustomerSession = Boolean(wallet?.walletAddress);
  const canSubmitDeposit = React.useMemo(() => {
    const amount = Number(String(depositAmount || '').trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }
    if (onchainBalance && amount > onchainBalance.balance) {
      return false;
    }
    return true;
  }, [depositAmount, onchainBalance]);

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
    setLoading(true);
    setError('');
    try {
      const [addressData, walletData, txData] = await Promise.all([
        requestDepositAddress(depositAddressApi),
        fetchWalletBalance(balanceApi),
        fetchOnchainDepositTransactions(transactionsApi)
      ]);
      const chainBalance = walletData?.walletAddress
        ? await fetchOnchainBalance(onchainBalanceApi, walletData.walletAddress)
        : null;
      console.log('[nbc-wallet] deposit-address response', addressData);
      setPauseDepositPolling(false);
      setDepositAddress(addressData);
      setWallet(walletData);
      setOnchainBalance(chainBalance);
      setDepositTxs(txData);
    } catch (error) {
      console.error('[nbc-wallet] deposit-address error', error);
      const message = mapDepositErrorMessage(
        error instanceof Error ? error.message : _('Failed to load deposit data')
      );
      setPauseDepositPolling(shouldSkipDepositAutoRefresh(message));
      setError(message);
      setDepositAddress(null);
      setOnchainBalance(null);
      setDepositTxs([]);
    } finally {
      setLoading(false);
    }
  }, [balanceApi, depositAddressApi, onchainBalanceApi, transactionsApi]);

  const loadWalletData = React.useCallback(async () => {
    try {
      const walletData = await fetchWalletBalance(balanceApi);
      setWallet(walletData);
    } catch {
      setWallet(null);
    }
  }, [balanceApi]);

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
    if (!open || activeTab !== 'deposit' || wallet || autoSigningIn) {
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
    if (activeTab === 'deposit' && !hasCustomerSession) {
      const ethereum = (window as any).ethereum || (window as any).okxwallet?.ethereum;
      if (ethereum?.request) {
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
        if (activeTab === 'deposit' && !hasCustomerSession) {
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
    hasCustomerSession,
    pauseDepositPolling,
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

  const handleDepositAction = React.useCallback(async () => {
    pushDebugLog('Add funds clicked');
    setError('');
    let targetDepositAddress = depositAddress?.depositAddress || '';
    if (!targetDepositAddress) {
      pushDebugLog('Deposit address missing, requesting address');
      try {
        const latestAddress = await requestDepositAddress(depositAddressApi);
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
    if (onchainBalance && Number(amountText) > onchainBalance.balance) {
      const message = _('Wallet balance is not enough for the deposit amount plus gas.');
      pushDebugLog('Validation failed: insufficient on-chain balance', {
        amount: amountText,
        walletBalance: onchainBalance.balance
      });
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
      if (!sessionReady) {
        pushDebugLog('Customer session missing, starting wallet sign-in');
        await ensureCustomerSession(ethereum, from);
        await loadDepositData();
        sessionReadyRef.current = true;
      }

      if (nbcWalletPublicConfig.chainId && nbcWalletPublicConfig.chainId > 0) {
        const chainIdHex = `0x${Number(nbcWalletPublicConfig.chainId).toString(16)}`;
        pushDebugLog('Switching wallet chain', {
          chainId: nbcWalletPublicConfig.chainId,
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

      const tokenAddress = String(nbcWalletPublicConfig.tokenAddress || '').trim();
      const tokenDecimals = Number(nbcWalletPublicConfig.tokenDecimals || 18);
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
        message: getErrorMessage(error) || String(error)
      });
      if (code === 4001) {
        const message = _('Transaction was rejected by wallet');
        setError(message);
        toast.error(message);
        return;
      }
      const message = mapDepositTransactionError(error);
      setError(message);
      toast.error(message);
    } finally {
      setSubmittingDeposit(false);
      pushDebugLog('Deposit flow finished');
    }
  }, [
    depositAddress?.depositAddress,
    depositAmount,
    onchainBalance,
    ensureCustomerSession,
    loadDepositData,
    depositAddressApi,
    nbcWalletPublicConfig.chainId,
    nbcWalletPublicConfig.tokenAddress,
    nbcWalletPublicConfig.tokenDecimals,
    pushDebugLog,
    hasCustomerSession,
    loadWalletData
  ]);

  const handleWithdrawAction = React.useCallback(async () => {
    const amount = Math.floor(Number(withdrawAmount || 0));
    if (!amount || amount <= 0) {
      toast.error(_('Withdraw amount must be greater than 0'));
      return;
    }
    if (amount > (wallet?.availableBalance || 0)) {
      toast.error(_('Withdrawal amount exceeds available balance'));
      return;
    }
    try {
      setSubmittingWithdrawal(true);
      await requestWalletWithdrawal(withdrawApi, amount);
      toast.success(_('Withdrawal request submitted'));
      setWithdrawAmount('');
      setWithdrawRatio(0);
      await loadWalletData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : _('Failed to request withdrawal')
      );
    } finally {
      setSubmittingWithdrawal(false);
    }
  }, [loadWalletData, wallet?.availableBalance, withdrawAmount, withdrawApi]);

  const latestDeposit = depositTxs[0] || null;
  const explorerTxUrl =
    latestDeposit?.reference && nbcWalletPublicConfig.blockExplorerUrl
      ? `${String(nbcWalletPublicConfig.blockExplorerUrl).replace(/\/$/, '')}/tx/${latestDeposit.reference}`
      : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-all hover:bg-muted/40"
          />
        }
      >
        <Wallet className="h-4 w-4" />
        {_('Deposit')}
      </DialogTrigger>
      <DialogContent
        className="max-w-[430px] rounded-xl border border-border bg-background p-5 text-foreground shadow-2xl"
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
                loading={loading}
                amount={depositAmount}
                setAmount={setDepositAmount}
                ratio={depositRatio}
                setRatio={setDepositRatio}
                onPrimaryAction={handleDepositAction}
                primaryLabel={_('Add funds')}
                primaryDisabled={submittingDeposit || !canSubmitDeposit}
                primaryLoading={submittingDeposit}
                balanceLabel={_('Wallet balance')}
                maxBalance={onchainBalance?.balance ?? null}
              />
              {debugLogs.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  <p className="mb-1 font-medium">{_('Debug logs')}</p>
                  <div className="space-y-1 font-mono text-muted-foreground">
                    {debugLogs.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
              {loading && (
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
              {depositAddress && (
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
                        {_('Latest deposit')}: +{latestDeposit.amount} NBC
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
              loading={loading}
              amount={withdrawAmount}
              setAmount={setWithdrawAmount}
              ratio={withdrawRatio}
              setRatio={setWithdrawRatio}
              onPrimaryAction={handleWithdrawAction}
              primaryLabel={_('Withdraw')}
              primaryLoading={submittingWithdrawal}
              primaryDisabled={!wallet || submittingWithdrawal}
              balanceLabel={_('Store balance (for payment)')}
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
    authRequestApi: url(routeId: "authRequest")
    authVerifyApi: url(routeId: "authVerify")
    depositAddressApi: url(routeId: "nbcWalletDepositAddress")
    balanceApi: url(routeId: "nbcWalletBalance")
    onchainBalanceApi: url(routeId: "nbcWalletOnchainBalance")
    transactionsApi: url(routeId: "nbcWalletTransactions")
    withdrawApi: url(routeId: "nbcWalletWithdraw")
    nbcWalletPublicConfig {
      chainId
      tokenAddress
      tokenDecimals
      blockExplorerUrl
      onchainEnabled
      onchainEnabledRaw
      treasuryAddress
    }
  }
`;
