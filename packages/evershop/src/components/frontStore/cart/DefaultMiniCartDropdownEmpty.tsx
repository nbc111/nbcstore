import { Area } from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ShoppingBag } from 'lucide-react';
import React from 'react';

export const DefaultMiniCartDropdownEmpty: React.FC<{
  setIsDropdownOpen: (isOpen: boolean) => void;
}> = ({ setIsDropdownOpen }) => (
  <div className="minicart__empty p-8 text-center flex flex-col items-center justify-center h-full">
    <Area id="miniCartEmptyBefore" noOuter />
    <div className="web3-empty-icon mb-6">
      <ShoppingBag className="w-12 h-12 text-muted-foreground/60" />
    </div>
    <p className="text-muted-foreground mb-2 text-lg">{_('Your cart is empty')}</p>
    <p className="text-muted-foreground/60 text-sm mb-6">
      {_('Discover our collection and add items to your cart')}
    </p>
    <Button
      variant="default"
      className="web3-btn-glow"
      onClick={() => setIsDropdownOpen(false)}
      size="lg"
    >
      {_('Continue Shopping')}
    </Button>
    <Area id="miniCartEmptyAfter" noOuter />
  </div>
);
