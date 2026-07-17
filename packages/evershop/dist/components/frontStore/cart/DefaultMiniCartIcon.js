import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ShoppingBag } from 'lucide-react';
import React from 'react';
export const DefaultMiniCartIcon = ({ totalQty, onClick, isOpen, disabled = false, showItemCount = true, syncStatus })=>{
    const prevQtyRef = React.useRef(totalQty);
    const [badgeAnimating, setBadgeAnimating] = React.useState(false);
    React.useEffect(()=>{
        if (totalQty > prevQtyRef.current) {
            setBadgeAnimating(true);
            const timer = setTimeout(()=>setBadgeAnimating(false), 400);
            prevQtyRef.current = totalQty;
            return ()=>clearTimeout(timer);
        }
        prevQtyRef.current = totalQty;
    }, [
        totalQty
    ]);
    return /*#__PURE__*/ React.createElement("button", {
        type: "button",
        onClick: onClick,
        disabled: disabled,
        className: `web3-icon-btn mini-cart-icon relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
        "data-active": isOpen,
        "aria-label": _('Shopping cart with ${count} items', {
            count: String(totalQty)
        }),
        "aria-expanded": isOpen
    }, syncStatus.syncing ? /*#__PURE__*/ React.createElement("div", {
        className: "w-5 h-5 flex items-center justify-center"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"
    })) : /*#__PURE__*/ React.createElement(ShoppingBag, {
        className: "w-5 h-5"
    }), showItemCount && totalQty > 0 && !syncStatus.syncing && /*#__PURE__*/ React.createElement("span", {
        className: `absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-semibold ${badgeAnimating ? 'web3-cart-badge' : ''}`
    }, totalQty > 99 ? '99+' : totalQty));
};
