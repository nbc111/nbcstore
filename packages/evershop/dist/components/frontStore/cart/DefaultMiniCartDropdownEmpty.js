import { Area } from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ShoppingBag } from 'lucide-react';
import React from 'react';
export const DefaultMiniCartDropdownEmpty = ({ setIsDropdownOpen })=>/*#__PURE__*/ React.createElement("div", {
        className: "minicart__empty p-8 text-center flex flex-col items-center justify-center h-full"
    }, /*#__PURE__*/ React.createElement(Area, {
        id: "miniCartEmptyBefore",
        noOuter: true
    }), /*#__PURE__*/ React.createElement("div", {
        className: "web3-empty-icon mb-6"
    }, /*#__PURE__*/ React.createElement(ShoppingBag, {
        className: "w-12 h-12 text-muted-foreground/60"
    })), /*#__PURE__*/ React.createElement("p", {
        className: "text-muted-foreground mb-2 text-lg"
    }, _('Your cart is empty')), /*#__PURE__*/ React.createElement("p", {
        className: "text-muted-foreground/60 text-sm mb-6"
    }, _('Discover our collection and add items to your cart')), /*#__PURE__*/ React.createElement(Button, {
        variant: "default",
        className: "web3-btn-glow",
        onClick: ()=>setIsDropdownOpen(false),
        size: "lg"
    }, _('Continue Shopping')), /*#__PURE__*/ React.createElement(Area, {
        id: "miniCartEmptyAfter",
        noOuter: true
    }));
