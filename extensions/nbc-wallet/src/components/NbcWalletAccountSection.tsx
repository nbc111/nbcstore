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
import { useNbcWallet, NbcWalletApis, NbcWalletPublicConfig } from '../hooks/useNbcWallet.js';
import { formatFiatAmount, formatNbcExchangeRate } from '../lib/formatFiat.js';
import { formatNbcAmount, shortenAddress } from '../lib/formatWallet.js';
import { fetchWalletTransactions } from '../lib/nbcWalletApi.js';

interface WalletTransactionRow {
  uuid: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  status: string;
  createdAt?: string;
  orderNumber?: string;
}

interface NbcWalletAccountSectionProps {
  apis: NbcWalletApis & { transactionsApi: string };
  publicConfig: NbcWalletPublicConfig;
}

const txTypeLabels: Record<string, string> = {
  debit: 'Payment',
  refund: 'Refund',
  admin_credit: 'Admin credit',
  admin_debit: 'Admin debit',
  onchain_deposit: 'On-chain deposit'
};

export function NbcWalletAccountSection({
  apis,
  publicConfig
}: NbcWalletAccountSectionProps) {
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

  useEffect(() => {
    if (isConnected) {
      loadTransactions();
    }
  }, [isConnected, loadTransactions, wallet?.balance]);

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

            <div>
              <h4 className="font-medium mb-2">{_('Recent transactions')}</h4>
              {loadingTx ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{_('No transactions yet')}</p>
              ) : (
                <ul className="divide-y border rounded-md text-sm">
                  {transactions.map((tx) => (
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
                          tx.amount >= 0 ? 'text-green-600' : 'text-destructive'
                        }
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {formatNbcAmount(tx.amount)} NBC
                      </span>
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
