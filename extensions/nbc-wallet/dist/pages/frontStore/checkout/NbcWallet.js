import { Button } from '@evershop/evershop/components/common/ui/Button';
import { useCheckout, useCheckoutDispatch } from '@evershop/evershop/components/frontStore/checkout/CheckoutContext';
import React, { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
export default function NbcWallet({ captureAPI, checkoutSuccessUrl }) {
    const checkoutState = useCheckout();
    const checkoutDispatch = useCheckoutDispatch();
    const { orderPlaced, orderId, checkoutData } = checkoutState;
    const { registerPaymentComponent } = checkoutDispatch;
    const captureRequestedRef = useRef(false);
    useEffect(() => {
        const captureOrder = async () => {
            var _a;
            if (!orderPlaced || !orderId || (checkoutData === null || checkoutData === void 0 ? void 0 : checkoutData.paymentMethod) !== 'nbc_wallet') {
                return;
            }
            if (captureRequestedRef.current) {
                return;
            }
            captureRequestedRef.current = true;
            try {
                const response = await fetch(captureAPI, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        order_uuid: orderId
                    })
                });
                const json = await response.json();
                if (!response.ok || json.error) {
                    captureRequestedRef.current = false;
                    throw new Error(((_a = json.error) === null || _a === void 0 ? void 0 : _a.message) || 'NBC payment failed');
                }
                window.location.href = `${checkoutSuccessUrl}/${orderId}`;
            }
            catch (error) {
                captureRequestedRef.current = false;
                toast.error(error instanceof Error ? error.message : 'NBC payment failed');
            }
        };
        captureOrder();
    }, [orderPlaced, orderId, checkoutData === null || checkoutData === void 0 ? void 0 : checkoutData.paymentMethod, captureAPI, checkoutSuccessUrl]);
    useEffect(() => {
        registerPaymentComponent('nbc_wallet', {
            nameRenderer: () => React.createElement("span", null, "NBC Wallet"),
            formRenderer: () => (React.createElement("div", { className: "text-sm text-muted-foreground py-3 text-center" }, "Pay directly with your NBC wallet balance.")),
            checkoutButtonRenderer: () => {
                const dispatch = useCheckoutDispatch();
                const state = useCheckout();
                const { checkout } = dispatch;
                const { loadingStates, orderPlaced } = state;
                const onCheckout = async (event) => {
                    event.preventDefault();
                    try {
                        await checkout();
                    }
                    catch (error) {
                        toast.error(error instanceof Error ? error.message : 'Failed to place order');
                    }
                };
                return (React.createElement(Button, { variant: "default", size: "xl", type: "button", onClick: onCheckout, disabled: loadingStates.placingOrder || orderPlaced, className: "w-full" }, loadingStates.placingOrder
                    ? 'Placing Order...'
                    : 'Pay with NBC Wallet'));
            }
        });
    }, [registerPaymentComponent]);
    return null;
}
export const layout = {
    areaId: 'checkoutFormAfter',
    sortOrder: 10
};
export const query = `
  query Query {
    captureAPI: url(routeId: "nbcWalletCapturePayment")
    checkoutSuccessUrl: url(routeId: "checkoutSuccess")
  }
`;
//# sourceMappingURL=NbcWallet.js.map