import { Button } from '@evershop/evershop/components/common/ui/Button';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Loader2, Wallet } from 'lucide-react';
import React from 'react';
import { useCheckoutWalletSnapshot } from '../lib/checkoutWalletStore.js';
import { formatFiatAmount, formatNbcExchangeRate } from '../lib/formatFiat.js';
import { formatNbcAmount, shortenAddress } from '../lib/formatWallet.js';
import { NbcWalletPublicConfig } from '../hooks/useNbcWallet.js';

interface NbcWalletCheckoutPanelProps {
  publicConfig: NbcWalletPublicConfig;
  orderCnyTotal: number;
  orderTotalText?: string;
  isSelected: boolean;
}

export function NbcWalletCheckoutPanel({
  publicConfig,
  orderCnyTotal,
  orderTotalText,
  isSelected
}: NbcWalletCheckoutPanelProps) {
  const {
    wallet,
    onchainBalance,
    onchainWalletAddress,
    connecting,
    loadingBalance,
    loadingOnchainBalance,
    error,
    requiredNbc,
    availableBalance,
    hasSufficientBalance,
    isConnected,
    connect,
    refreshBalance
  } = useCheckoutWalletSnapshot();

  const showOnchainBalance = Boolean(publicConfig.chainBalanceEnabled);
  const onchainFractionDigits = publicConfig.tokenDecimals
    ? Math.min(publicConfig.tokenDecimals, 6)
    : 4;

  if (!isSelected) {
    return null;
  }

  return (
    <div className="space-y-4 py-3 text-sm">
      <p className="text-muted-foreground text-center">
        {_('Pay with your NBC wallet balance. Connect your wallet to continue.')}
      </p>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex justify-between items-start gap-3">
          <span className="text-muted-foreground shrink-0">{_('Order total')}</span>
          <span className="font-medium text-right tabular-nums">
            {orderTotalText ||
              formatFiatAmount(
                orderCnyTotal,
                publicConfig.shopCurrency || 'USD'
              )}
          </span>
        </div>
        <div className="flex justify-between items-start gap-3">
          <span className="text-muted-foreground shrink-0">{_('Required NBC')}</span>
          <span className="font-medium text-right tabular-nums">
            {formatNbcAmount(requiredNbc)} NBC
          </span>
        </div>
        <div className="flex justify-between items-start gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">{_('Exchange rate')}</span>
          <span className="text-right tabular-nums">
            1 NBC ={' '}
            {formatNbcExchangeRate(
              publicConfig.exchangeRate,
              publicConfig.shopCurrency || 'USD'
            )}
          </span>
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="default"
            className="w-full"
            disabled={connecting || !connect}
            onClick={() => connect?.()}
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {_('Connecting wallet…')}
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                {_('Connect wallet')}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {_('Sign in with your wallet to pay with NBC tokens.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground shrink-0">{_('Wallet')}</span>
              <span className="font-mono text-xs text-right break-all">
                {wallet ? shortenAddress(wallet.walletAddress) : '—'}
              </span>
            </div>
            {showOnchainBalance && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-muted-foreground shrink-0 max-w-[55%]">
                  {_('On-chain NBC balance')}
                </span>
                <span className="font-semibold text-foreground text-right tabular-nums break-all">
                  {loadingOnchainBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : onchainBalance !== null ? (
                    `${formatNbcAmount(onchainBalance, onchainFractionDigits)} NBC`
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground shrink-0 max-w-[55%]">
                {_('Store balance (for payment)')}
              </span>
              <span
                className={
                  hasSufficientBalance
                    ? 'font-semibold text-foreground text-right tabular-nums'
                    : 'font-semibold text-destructive text-right tabular-nums'
                }
              >
                {loadingBalance ? (
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                  `${formatNbcAmount(availableBalance)} NBC`
                )}
              </span>
            </div>
          </div>
          {showOnchainBalance && onchainWalletAddress && (
            <p className="text-xs text-muted-foreground text-center">
              {_('NBC Chain')} ({publicConfig.chainName || 'NBC Chain'}
              {publicConfig.chainId ? ` · ${publicConfig.chainId}` : ''})
            </p>
          )}

          {!hasSufficientBalance && !loadingBalance && (
            <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs">
              {_(
                'Insufficient NBC balance. Top up your wallet before paying.'
              )}
              {publicConfig.onchainEnabled && publicConfig.treasuryAddress && (
                <p className="mt-2 break-all font-mono">
                  {_('Deposit to')}: {publicConfig.treasuryAddress}
                </p>
              )}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={loadingBalance || !refreshBalance}
            onClick={() => refreshBalance?.()}
          >
            {_('Refresh balance')}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
