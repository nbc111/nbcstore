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
  isSelected: boolean;
  selectedAssetSymbol: string;
  onSelectAsset: (symbol: string) => void;
}

export function NbcWalletCheckoutPanel({
  publicConfig,
  orderCnyTotal,
  isSelected,
  selectedAssetSymbol,
  onSelectAsset
}: NbcWalletCheckoutPanelProps) {
  const {
    wallet,
    onchainBalance,
    onchainWalletAddress,
    connecting,
    loadingBalance,
    loadingOnchainBalance,
    error,
    requiredAssetAmount,
    selectedAsset,
    availableBalance,
    hasSufficientBalance,
    isConnected,
    connect,
    refreshBalance
  } = useCheckoutWalletSnapshot();

  const assets = publicConfig.assets?.length
    ? publicConfig.assets
    : [
        {
          symbol: 'NBC',
          displayName: 'NBC',
          assetType: publicConfig.tokenAddress ? 'erc20' : 'native',
          tokenAddress: publicConfig.tokenAddress,
          tokenDecimals: publicConfig.tokenDecimals,
          exchangeRate: publicConfig.exchangeRate
        }
      ];
  const activeAsset =
    selectedAsset || assets.find((asset) => asset.symbol === selectedAssetSymbol) || assets[0];
  const activeSymbol = activeAsset?.symbol || 'NBC';
  const showOnchainBalance = Boolean(publicConfig.chainBalanceEnabled);
  const onchainFractionDigits = activeAsset?.tokenDecimals
    ? Math.min(activeAsset.tokenDecimals, 6)
    : 4;

  if (!isSelected) {
    return null;
  }

  return (
    <div className="space-y-4 py-3 text-sm">
      <p className="text-muted-foreground text-center">
        {_('Pay with your wallet balance. Connect your wallet to continue.')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset) => {
          const active = asset.symbol === activeSymbol;
          return (
            <button
              key={asset.symbol}
              type="button"
              className={
                active
                  ? 'rounded-md border border-primary bg-primary text-primary-foreground px-3 py-2 font-medium'
                  : 'rounded-md border border-border bg-background px-3 py-2 font-medium hover:bg-muted'
              }
              onClick={() => onSelectAsset(asset.symbol)}
            >
              {asset.symbol}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex justify-between items-start gap-3">
          <span className="text-muted-foreground shrink-0">{_('Order total')}</span>
          <span className="font-medium text-right tabular-nums">
            {formatFiatAmount(orderCnyTotal, publicConfig.shopCurrency || 'USD')}
          </span>
        </div>
        <div className="flex justify-between items-start gap-3">
          <span className="text-muted-foreground shrink-0">
            {_('Required')} {activeSymbol}
          </span>
          <span className="font-medium text-right tabular-nums">
            {formatNbcAmount(requiredAssetAmount)} {activeSymbol}
          </span>
        </div>
        <div className="flex justify-between items-start gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">{_('Exchange rate')}</span>
          <span className="text-right tabular-nums">
            1 {activeSymbol} ={' '}
            {formatNbcExchangeRate(
              activeAsset?.exchangeRate || publicConfig.exchangeRate,
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
            {_('Sign in with your wallet to pay with tokens.')}
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
                  {_('On-chain')} {activeSymbol} {_('balance')}
                </span>
                <span className="font-semibold text-foreground text-right tabular-nums break-all">
                  {loadingOnchainBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : onchainBalance !== null ? (
                    `${formatNbcAmount(onchainBalance, onchainFractionDigits)} ${activeSymbol}`
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
                  `${formatNbcAmount(availableBalance)} ${activeSymbol}`
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
              {`${activeSymbol} ${_('balance is insufficient. Top up your wallet before paying.')}`}
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
