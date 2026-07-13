import { Button } from '@evershop/evershop/components/common/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@evershop/evershop/components/common/ui/Card';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Loader2, Wallet } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNbcWallet, NbcWalletApis, NbcWalletPublicConfig } from '../hooks/useNbcWallet.js';
import { formatFiatAmount, formatNbcExchangeRate } from '../lib/formatFiat.js';
import { formatNbcAmount, shortenAddress } from '../lib/formatWallet.js';
import {
  bindWalletCustomer,
  fetchWalletDepositAddress,
  fetchWalletProfile,
  fetchWalletTransactions,
  fetchWalletWithdrawals,
  WalletDepositAddress,
  WalletUserProfile,
  requestWalletWithdrawal
} from '../lib/nbcWalletApi.js';

interface WalletTransactionRow {
  uuid: string;
  assetSymbol?: string;
  transactionType: string;
  amount: number;
  displayAmount?: number;
  balanceAfter: number;
  status: string;
  createdAt?: string;
  orderNumber?: string;
}

type LoadTransactionsOptions = {
  notifyDeposits?: boolean;
  silent?: boolean;
};

interface WalletWithdrawalRow {
  uuid: string;
  assetSymbol?: string;
  amount: number;
  status: string;
  txHash?: string | null;
  errorMessage?: string | null;
}

interface NbcWalletAccountSectionProps {
  apis: NbcWalletApis & {
    bindCustomerApi?: string;
    depositAddressApi?: string;
    profileApi?: string;
    transactionsApi: string;
    withdrawalsApi: string;
    withdrawApi: string;
  };
  publicConfig: NbcWalletPublicConfig;
}

const txTypeLabels: Record<string, string> = {
  debit: 'Payment',
  refund: 'Refund',
  admin_credit: 'Admin credit',
  admin_debit: 'Admin debit',
  onchain_deposit: 'On-chain deposit'
};

const withdrawalStatusLabels: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed'
};

function isShadowEmail(email?: string | null) {
  return /^wallet_[^@\s]+@nbc\.local$/i.test(String(email || '').trim());
}

export function NbcWalletAccountSection({
  apis,
  publicConfig
}: NbcWalletAccountSectionProps) {
  const mapWithdrawalErrorMessage = useCallback((message: string) => {
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
  }, []);

  const {
    wallet,
    connecting,
    loadingBalance,
    error,
    isConnected,
    connect,
    refreshBalance
  } = useNbcWallet(apis, publicConfig, { autoLoadBalance: true });

  const [transactions, setTransactions] = useState<WalletTransactionRow[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [depositAddress, setDepositAddress] =
    useState<WalletDepositAddress | null>(null);
  const [loadingDepositAddress, setLoadingDepositAddress] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawalRow[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState('NBC');
  const [profile, setProfile] = useState<WalletUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [submittingAccountEmail, setSubmittingAccountEmail] = useState(false);
  const seenDepositTransactionUuidsRef = useRef<Set<string>>(new Set());
  const depositToastBaselineReadyRef = useRef(false);
  const accountEmailNeedsCompletion = isShadowEmail(profile?.customerEmail);
  const walletAssets = wallet?.assets?.length
    ? wallet.assets
    : wallet
      ? [
          {
            symbol: 'NBC',
            displayName: 'NBC',
            balance: wallet.balance,
            frozenBalance: wallet.frozenBalance,
            availableBalance: wallet.availableBalance
          }
        ]
      : [];
  const selectedWalletAsset = walletAssets.find(
    (asset) => asset.symbol === selectedAssetSymbol
  );
  const selectedPublicAsset = publicConfig.assets?.find(
    (asset) => asset.symbol === selectedAssetSymbol
  );
  const selectedExchangeRate =
    selectedWalletAsset?.exchangeRate ||
    selectedPublicAsset?.exchangeRate ||
    wallet?.exchangeRate ||
    publicConfig.exchangeRate;
  const selectedAvailableBalance =
    selectedWalletAsset?.availableBalance ||
    (selectedAssetSymbol === 'NBC' ? wallet?.availableBalance || 0 : 0);

  const loadTransactions = useCallback(async (
    options: LoadTransactionsOptions = {}
  ) => {
    if (!isConnected) {
      setTransactions([]);
      seenDepositTransactionUuidsRef.current = new Set();
      depositToastBaselineReadyRef.current = false;
      return;
    }
    if (!options.silent) {
      setLoadingTx(true);
    }
    try {
      const data = await fetchWalletTransactions(
        apis.transactionsApi,
        10,
        selectedAssetSymbol
      );
      const items = (data?.items || []) as WalletTransactionRow[];
      const completedDeposits = items.filter(
        (tx) =>
          tx.transactionType === 'onchain_deposit' &&
          tx.status === 'completed'
      );
      const seen = seenDepositTransactionUuidsRef.current;

      if (!depositToastBaselineReadyRef.current) {
        completedDeposits.forEach((tx) => seen.add(tx.uuid));
        depositToastBaselineReadyRef.current = true;
      } else if (options.notifyDeposits) {
        completedDeposits
          .filter((tx) => !seen.has(tx.uuid))
          .reverse()
          .forEach((tx) => {
            seen.add(tx.uuid);
            const amount = tx.displayAmount ?? tx.amount;
            const asset = tx.assetSymbol || selectedAssetSymbol;
            toast.success(
              _('Deposit received: ${amount} ${asset}', {
                amount: formatNbcAmount(amount),
                asset
              }),
              { toastId: `nbc-wallet-deposit-${tx.uuid}` }
            );
          });
      }

      setTransactions(items);
    } catch {
      if (!options.silent) {
        setTransactions([]);
      }
    } finally {
      if (!options.silent) {
        setLoadingTx(false);
      }
    }
  }, [apis.transactionsApi, isConnected, selectedAssetSymbol]);

  const loadWithdrawals = useCallback(async () => {
    if (!isConnected) {
      setWithdrawals([]);
      return;
    }
    setLoadingWithdrawals(true);
    try {
      const data = await fetchWalletWithdrawals(apis.withdrawalsApi, 10);
      setWithdrawals(data?.items || []);
    } catch {
      setWithdrawals([]);
    } finally {
      setLoadingWithdrawals(false);
    }
  }, [apis.withdrawalsApi, isConnected]);

  const loadDepositAddress = useCallback(async () => {
    if (!isConnected || !publicConfig.onchainEnabled) {
      setDepositAddress(null);
      return;
    }

    if (!apis.depositAddressApi) {
      setDepositAddress(
        publicConfig.treasuryAddress
          ? {
              mode: 'treasury',
              depositAddress: publicConfig.treasuryAddress,
              addressIndex: null,
              chainId: publicConfig.chainId || 0,
              tokenAddress: null
            }
          : null
      );
      return;
    }

    setLoadingDepositAddress(true);
    try {
      setDepositAddress(
        await fetchWalletDepositAddress(
          apis.depositAddressApi,
          selectedAssetSymbol
        )
      );
    } catch {
      setDepositAddress(null);
    } finally {
      setLoadingDepositAddress(false);
    }
  }, [
    apis.depositAddressApi,
    isConnected,
    publicConfig.chainId,
    publicConfig.onchainEnabled,
    publicConfig.treasuryAddress,
    selectedAssetSymbol
  ]);

  const loadProfile = useCallback(async () => {
    if (!isConnected || !apis.profileApi) {
      setProfile(null);
      setAccountEmail('');
      return;
    }

    setLoadingProfile(true);
    try {
      const nextProfile = await fetchWalletProfile(apis.profileApi);
      setProfile(nextProfile);
      setAccountEmail(
        isShadowEmail(nextProfile?.customerEmail)
          ? nextProfile?.email || ''
          : nextProfile?.customerEmail || nextProfile?.email || ''
      );
    } catch {
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [apis.profileApi, isConnected]);

  const submitAccountEmail = useCallback(async () => {
    const email = accountEmail.trim();
    if (!email) {
      toast.error(_('Email is required'));
      return;
    }

    if (!apis.bindCustomerApi) {
      toast.error(_('Wallet account binding is unavailable'));
      return;
    }

    setSubmittingAccountEmail(true);
    try {
      const data = await bindWalletCustomer(apis.bindCustomerApi, {
        email,
        password: accountPassword || undefined
      });
      setAccountPassword('');
      setProfile(data?.profile || null);
      toast.success(
        data?.mode === 'bound_existing'
          ? _('Wallet linked to your existing account')
          : _('Account email saved')
      );
      await refreshBalance();
      await loadProfile();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : _('Failed to save account email')
      );
    } finally {
      setSubmittingAccountEmail(false);
    }
  }, [
    accountEmail,
    accountPassword,
    apis.bindCustomerApi,
    loadProfile,
    refreshBalance
  ]);

  const submitWithdrawal = useCallback(async () => {
    const amount = Number(String(withdrawAmount || '').trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(_('Withdrawal amount must be greater than 0'));
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
      await requestWalletWithdrawal(
        apis.withdrawApi,
        amount,
        selectedAssetSymbol
      );
      setWithdrawAmount('');
      toast.success(_('Withdrawal request submitted'));
      await refreshBalance();
      await loadWithdrawals();
    } catch (error) {
      const message = mapWithdrawalErrorMessage(
        error instanceof Error ? error.message : _('Failed to request withdrawal')
      );
      toast.error(message);
    } finally {
      setSubmittingWithdrawal(false);
    }
  }, [
    apis.withdrawApi,
    loadWithdrawals,
    mapWithdrawalErrorMessage,
    refreshBalance,
    selectedAssetSymbol,
    selectedAvailableBalance,
    withdrawAmount
  ]);

  useEffect(() => {
    seenDepositTransactionUuidsRef.current = new Set();
    depositToastBaselineReadyRef.current = false;
  }, [selectedAssetSymbol, wallet?.walletAddress]);

  useEffect(() => {
    if (isConnected) {
      loadProfile();
      loadDepositAddress();
      loadTransactions();
      loadWithdrawals();
    }
  }, [
    isConnected,
    loadDepositAddress,
    loadProfile,
    loadTransactions,
    loadWithdrawals
  ]);

  useEffect(() => {
    if (!isConnected) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      refreshBalance();
      loadTransactions({ notifyDeposits: true, silent: true });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [isConnected, loadTransactions, refreshBalance]);

  return (
    <Card className="mb-7 w-full">
      <CardHeader className="">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          {publicConfig.displayName || _('NBC Wallet')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {_(
                'Connect your Web3 wallet to view NBC balance and pay with tokens at checkout.'
              )}
            </p>
            <Button
              type="button"
              className=""
              disabled={connecting}
              onClick={() => connect()}
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {_('Connecting wallet…')}
                </>
              ) : (
                _('Connect wallet')
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block">{_('Address')}</span>
                <span className="font-mono">{shortenAddress(wallet!.walletAddress)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  {_('Available balance')}
                </span>
                <span className="text-lg font-semibold">
                  {loadingBalance
                    ? '…'
                    : `${formatNbcAmount(selectedAvailableBalance)} ${selectedAssetSymbol}`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">{_('Total balance')}</span>
                <span>
                  {formatNbcAmount(selectedWalletAsset?.balance || 0)}{' '}
                  {selectedAssetSymbol}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">{_('Exchange rate')}</span>
                <span>
                  1 {selectedAssetSymbol} ={' '}
                  {formatNbcExchangeRate(
                    selectedExchangeRate,
                    publicConfig.shopCurrency || 'USD'
                  )}
                </span>
              </div>
            </div>

            {apis.profileApi && apis.bindCustomerApi && (
              <div className="rounded-md border p-4 space-y-3">
                <div>
                  <h4 className="font-medium">{_('Account email')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {accountEmailNeedsCompletion
                      ? _(
                          'Add your real email, or enter an existing account email and password to link this wallet.'
                        )
                      : _('This wallet is linked to your customer account.')}
                  </p>
                </div>
                {accountEmailNeedsCompletion ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        {_('Email')}
                      </label>
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(event) => setAccountEmail(event.target.value)}
                        placeholder={_('Enter your email')}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        {_('Password')}
                      </label>
                      <input
                        type="password"
                        value={accountPassword}
                        onChange={(event) =>
                          setAccountPassword(event.target.value)
                        }
                        placeholder={_('Required for an existing account')}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {_(
                          'Leave password empty when saving a new email for this wallet account.'
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className=""
                      onClick={() => submitAccountEmail()}
                      isLoading={submittingAccountEmail}
                      disabled={submittingAccountEmail || loadingProfile}
                    >
                      {_('Save account email')}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm">
                    <span className="text-muted-foreground block">
                      {_('Customer email')}
                    </span>
                    <span>{profile?.customerEmail || accountEmail}</span>
                  </div>
                )}
              </div>
            )}

            {walletAssets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {walletAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    type="button"
                    className={`rounded-md border p-3 text-left ${
                      selectedAssetSymbol === asset.symbol
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setSelectedAssetSymbol(asset.symbol);
                      setWithdrawAmount('');
                    }}
                  >
                    <div className="font-medium">{asset.symbol}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {_('Available balance')}: {formatNbcAmount(asset.availableBalance)}{' '}
                      {asset.symbol}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {_('Total balance')}: {formatNbcAmount(asset.balance)}{' '}
                      {asset.symbol}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {publicConfig.onchainEnabled && (
              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <p className="font-medium mb-1">
                  {_('Top up (on-chain deposit)')} - {selectedAssetSymbol}
                </p>
                <p className="text-muted-foreground mb-1">
                  Send {selectedAssetSymbol} tokens to the deposit address below. Balance updates after confirmations.
                </p>
                <p className="font-mono break-all">
                  {loadingDepositAddress
                    ? '...'
                    : depositAddress?.depositAddress ||
                      wallet?.depositAddress ||
                      publicConfig.treasuryAddress ||
                      _('Deposit address unavailable')}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                className=""
                variant="outline"
                size="sm"
                disabled={loadingBalance}
                onClick={() => refreshBalance()}
              >
                {_('Refresh balance')}
              </Button>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <h4 className="font-medium">
                {_('Withdraw')} {selectedAssetSymbol}
              </h4>
              <p className="text-sm text-muted-foreground">
                Submit a withdrawal request to transfer {selectedAssetSymbol} back to your connected wallet address.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium">
                    {_('Amount')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.00000001"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder={_('Withdraw amount')}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {_('Funds will be frozen until the withdrawal is processed.')}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => submitWithdrawal()}
                  isLoading={submittingWithdrawal}
                  disabled={!wallet || submittingWithdrawal}
                  className=""
                >
                  {_('Request withdrawal')}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">{_('Recent transactions')}</h4>
              {loadingTx ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{_('No transactions yet')}</p>
              ) : (
                <ul className="divide-y border rounded-md text-sm">
                  {transactions.map((tx) => {
                    // Prefer decimal-preserved display amount for on-chain deposits.
                    // Fallback to `amount` for other transaction types.
                    const renderedAmount = tx.displayAmount ?? tx.amount;
                    return (
                      <li
                        key={tx.uuid}
                        className="flex justify-between gap-2 px-3 py-2"
                      >
                        <div>
                          <span className="font-medium">
                            {_(txTypeLabels[tx.transactionType] || tx.transactionType)}
                          </span>
                          {tx.orderNumber && (
                            <span className="text-muted-foreground ml-2">
                              #{tx.orderNumber}
                            </span>
                          )}
                        </div>
                        <span
                          className={
                            renderedAmount >= 0 ? 'text-green-600' : 'text-destructive'
                          }
                        >
                          {renderedAmount >= 0 ? '+' : ''}
                          {formatNbcAmount(renderedAmount)}{' '}
                          {tx.assetSymbol || selectedAssetSymbol}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">{_('Recent withdrawals')}</h4>
              {loadingWithdrawals ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {_('No withdrawals yet')}
                </p>
              ) : (
                <ul className="divide-y border rounded-md text-sm">
                  {withdrawals.map((item) => (
                    <li
                      key={item.uuid}
                      className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {formatNbcAmount(item.amount)}{' '}
                          {item.assetSymbol || selectedAssetSymbol}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {_(withdrawalStatusLabels[item.status] || item.status)}
                          {item.txHash ? ` · ${item.txHash}` : ''}
                        </div>
                        {item.errorMessage ? (
                          <div className="text-xs text-destructive">
                            {item.errorMessage}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
