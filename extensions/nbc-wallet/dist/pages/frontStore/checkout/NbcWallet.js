import { Button } from '@evershop/evershop/components/common/ui/Button';
import { useCartState } from '@evershop/evershop/components/frontStore/cart/CartContext';
import { useCheckout, useCheckoutDispatch } from '@evershop/evershop/components/frontStore/checkout/CheckoutContext';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { NbcWalletBridge } from '../../../components/NbcWalletBridge.js';
import { NbcWalletCheckoutPanel } from '../../../components/NbcWalletCheckoutPanel.js';
import { useCheckoutWalletSnapshot } from '../../../lib/checkoutWalletStore.js';
export default function NbcWallet({ captureAPI, authRequestApi, authVerifyApi, balanceApi, onchainBalanceApi, checkoutSuccessUrl, myCart, nbcWalletPublicConfig }) {
    const { data: cart } = useCartState();
    const checkoutState = useCheckout();
    const { orderPlaced, orderId, checkoutData, loadingStates } = checkoutState;
    const { registerPaymentComponent } = useCheckoutDispatch();
    const captureRequestedRef = useRef(false);
    const apis = {
        authRequestApi,
        authVerifyApi,
        balanceApi,
        onchainBalanceApi
    };
    const publicConfig = {
        exchangeRate: nbcWalletPublicConfig.exchangeRate,
        shopCurrency: nbcWalletPublicConfig.shopCurrency,
        displayName: nbcWalletPublicConfig.displayName,
        chainId: nbcWalletPublicConfig.chainId,
        rpcUrl: nbcWalletPublicConfig.rpcUrl,
        chainName: nbcWalletPublicConfig.chainName,
        nativeSymbol: nbcWalletPublicConfig.nativeSymbol,
        tokenAddress: nbcWalletPublicConfig.tokenAddress,
        tokenDecimals: nbcWalletPublicConfig.tokenDecimals,
        blockExplorerUrl: nbcWalletPublicConfig.blockExplorerUrl,
        chainBalanceEnabled: nbcWalletPublicConfig.chainBalanceEnabled,
        treasuryAddress: nbcWalletPublicConfig.treasuryAddress,
        onchainEnabled: nbcWalletPublicConfig.onchainEnabled
    };
    const checkoutGrandTotal = cart?.grandTotal?.value;
    const initialGrandTotal = myCart?.grandTotal?.value;
    const orderCnyTotal = typeof checkoutGrandTotal === 'number' && checkoutGrandTotal > 0 ? checkoutGrandTotal : typeof initialGrandTotal === 'number' ? initialGrandTotal : checkoutGrandTotal ?? 0;
    const isNbcSelected = checkoutData?.paymentMethod === 'nbc_wallet';
    useEffect(()=>{
        const captureOrder = async ()=>{
            if (!orderPlaced || !orderId || checkoutData?.paymentMethod !== 'nbc_wallet') {
                return;
            }
            if (captureRequestedRef.current) {
                return;
            }
            captureRequestedRef.current = true;
            try {
                const response = await fetch(captureAPI, {
                    method: 'POST',
                    credentials: 'include',
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
                    throw new Error(json.error?.message || _('NBC payment failed'));
                }
                window.location.href = `${checkoutSuccessUrl}/${orderId}`;
            } catch (error) {
                captureRequestedRef.current = false;
                toast.error(error instanceof Error ? error.message : _('NBC payment failed'));
            }
        };
        captureOrder();
    }, [
        orderPlaced,
        orderId,
        checkoutData?.paymentMethod,
        captureAPI,
        checkoutSuccessUrl
    ]);
    useEffect(()=>{
        registerPaymentComponent('nbc_wallet', {
            nameRenderer: ({ isSelected })=>/*#__PURE__*/ React.createElement("span", {
                    className: isSelected ? 'font-medium' : ''
                }, nbcWalletPublicConfig.displayName || _('NBC Wallet')),
            formRenderer: ({ isSelected })=>/*#__PURE__*/ React.createElement(NbcWalletCheckoutPanel, {
                    publicConfig: publicConfig,
                    orderCnyTotal: orderCnyTotal,
                    isSelected: isSelected
                }),
            checkoutButtonRenderer: ()=>/*#__PURE__*/ React.createElement(NbcWalletPayButton, {
                    isNbcSelected: isNbcSelected
                })
        });
    }, [
        registerPaymentComponent,
        nbcWalletPublicConfig.displayName,
        orderCnyTotal,
        isNbcSelected
    ]);
    return /*#__PURE__*/ React.createElement(NbcWalletBridge, {
        apis: apis,
        publicConfig: publicConfig,
        orderCnyTotal: orderCnyTotal,
        enabled: isNbcSelected
    });
}
function NbcWalletPayButton({ isNbcSelected }) {
    const dispatch = useCheckoutDispatch();
    const { checkout } = dispatch;
    const { loadingStates, orderPlaced } = useCheckout();
    const { isConnected, hasSufficientBalance, connecting, loadingBalance } = useCheckoutWalletSnapshot();
    const canPay = isConnected && hasSufficientBalance && !connecting && !loadingBalance;
    const onCheckout = async (event)=>{
        event.preventDefault();
        if (!canPay) {
            toast.error(_('Connect your wallet and ensure sufficient NBC balance'));
            return;
        }
        try {
            await checkout();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : _('Failed to place order'));
        }
    };
    if (!isNbcSelected) {
        return null;
    }
    return /*#__PURE__*/ React.createElement(Button, {
        variant: "default",
        size: "xl",
        type: "button",
        onClick: onCheckout,
        disabled: loadingStates.placingOrder || orderPlaced || !canPay,
        className: "w-full"
    }, loadingStates.placingOrder ? _('Placing Order...') : _('Pay with NBC Wallet'));
}
export const layout = {
    areaId: 'checkoutFormAfter',
    sortOrder: 10
};
export const query = `
  query Query {
    captureAPI: url(routeId: "nbcWalletCapturePayment")
    authRequestApi: url(routeId: "authRequest")
    authVerifyApi: url(routeId: "authVerify")
    balanceApi: url(routeId: "nbcWalletBalance")
    onchainBalanceApi: url(routeId: "nbcWalletOnchainBalance")
    checkoutSuccessUrl: url(routeId: "checkoutSuccess")
    nbcWalletPublicConfig {
      exchangeRate
      shopCurrency
      displayName
      chainId
      rpcUrl
      chainName
      nativeSymbol
      tokenAddress
      tokenDecimals
      blockExplorerUrl
      chainBalanceEnabled
      treasuryAddress
      onchainEnabled
    }
    myCart {
      grandTotal {
        value
        text
      }
    }
  }
`;
