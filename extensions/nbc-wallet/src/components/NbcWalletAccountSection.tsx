import { Button } from '@evershop/evershop/components/common/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@evershop/evershop/components/common/ui/Card';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Loader2, Wallet } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNbcWallet, NbcWalletApis, NbcWalletPublicConfig } from '../hooks/useNbcWallet.js';
import { formatFiatAmount, formatNbcExchangeRate } from '../lib/formatFiat.js';
import { formatNbcAmount, shortenAddress } from '../lib/formatWallet.js';
import {
  fetchWalletTransactions,
  fetchWalletWithdrawals,
  requestWalletWithdrawal
} from '../lib/nbcWalletApi.js';

interface WalletTransactionRow {
  uuid: string;
  transactionType: string;
  amount: number;
  displayAmount?: number;
  balanceAfter: number;
  status: string;
  createdAt?: string;
  orderNumber?: string;
}

interface WalletWithdrawalRow {
  uuid: string;
  amount: number;
  status: string;
  txHash?: string | null;
  errorMessage?: string | null;
}

interface NbcWalletAccountSectionProps {
  apis: NbcWalletApis & {
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
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawalRow[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!isConnected) {
      setTransactions([]);
      return;
    }
    setLoadingTx(true);
    try {
      const data = await fetchWalletTransactions(apis.transactionsApi, 10);
      setTransactions(data?.items || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  }, [apis.transactionsApi, isConnected]);

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

  const submitWithdrawal = useCallback(async () => {
    const amount = Number(String(withdrawAmount || '').trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(_('Withdrawal amount must be greater than 0'));
      return;
    }
    if (amount < 1) {
      toast.error(_('Withdrawal amount must be at least 1 NBC'));
      return;
    }
    if (amount > (wallet?.availableBalance || 0)) {
      toast.error(_('Withdrawal amount exceeds available balance'));
      return;
    }

    try {
      setSubmittingWithdrawal(true);
      await requestWalletWithdrawal(apis.withdrawApi, amount);
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
    wallet?.availableBalance,
    withdrawAmount
  ]);

  useEffect(() => {
    if (isConnected) {
      loadTransactions();
      loadWithdrawals();
    }
  }, [isConnected, loadTransactions, loadWithdrawals, wallet?.balance, wallet?.frozenBalance]);

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
                  {loadingBalance ? '…' : `${formatNbcAmount(wallet!.availableBalance)} NBC`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">{_('Total balance')}</span>
                <span>{formatNbcAmount(wallet!.balance)} NBC</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{_('Exchange rate')}</span>
                <span>
                  1 NBC ={' '}
                  {formatNbcExchangeRate(
                    wallet!.exchangeRate,
                    publicConfig.shopCurrency || 'USD'
                  )}
                </span>
              </div>
            </div>

            {publicConfig.onchainEnabled && publicConfig.treasuryAddress && (
              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <p className="font-medium mb-1">{_('Top up (on-chain deposit)')}</p>
                <p className="text-muted-foreground mb-1">
                  {_('Send NBC tokens to the treasury address below. Balance updates after confirmations.')}
                </p>
                <p className="font-mono break-all">{publicConfig.treasuryAddress}</p>
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
              <h4 className="font-medium">{_('Withdraw NBC')}</h4>
              <p className="text-sm text-muted-foreground">
                {_('Submit a withdrawal request to transfer NBC back to your connected wallet address.')}
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
                          {formatNbcAmount(renderedAmount)} NBC
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
                          {formatNbcAmount(item.amount)} NBC
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
