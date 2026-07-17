import Area from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export function DefaultMiniCartDropdownSummary({
  total,
  cartUrl,
  checkoutUrl,
  totalQty
}: {
  total: string;
  cartUrl: string;
  checkoutUrl: string;
  totalQty: number;
}) {
  return (
    <div className="web3-minicart-footer space-y-3">
      <div className="minicart__summary flex justify-between items-center">
        <span className="font-medium text-muted-foreground">{_('Subtotal')}:</span>
        <span className="font-semibold text-lg web3-mono text-primary">
          {total || '—'}
        </span>
      </div>
      <Area id="miniCartSummaryViewCartButtonBefore" noOuter />
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          if (cartUrl) {
            window.location.href = cartUrl;
          }
        }}
        className="minicart__viewcart__button w-full web3-tap"
      >
        {_('View Cart (${totalQty})', {
          totalQty: totalQty.toString()
        })}
      </Button>
      <Area id="miniCartSummaryViewCartButtonAfter" noOuter />
      <Area id="miniCartSummaryCheckoutButtonBefore" noOuter />
      <Button
        variant="default"
        size="lg"
        onClick={() => {
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
          }
        }}
        className="minicart__checkout__button w-full web3-btn-glow web3-tap"
      >
        {_('Checkout')}
      </Button>
      <Area id="miniCartSummaryCheckoutButtonAfter" noOuter />
    </div>
  );
}
