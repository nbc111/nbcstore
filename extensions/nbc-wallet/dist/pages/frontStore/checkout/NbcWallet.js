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
    var _a, _b, _c;
    const { data: cart } = useCartState();
    const checkoutState = useCheckout();
    const { orderPlaced, orderId, checkoutData, loadingStates } = checkoutState;
    const { registerPaymentComponent } = useCheckoutDispatch();
    const captureRequestedRef = useRef(false);
    const publicAssets = React.useMemo(() => {
        var _a;
        return ((_a = nbcWalletPublicConfig.assets) === null || _a === void 0 ? void 0 : _a.length)
            ? nbcWalletPublicConfig.assets
            : [
                {
                    symbol: 'NBC',
                    displayName: 'NBC',
                    chainId: nbcWalletPublicConfig.chainId,
                    assetType: nbcWalletPublicConfig.tokenAddress ? 'erc20' : 'native',
                    tokenAddress: nbcWalletPublicConfig.tokenAddress,
                    tokenDecimals: nbcWalletPublicConfig.tokenDecimals,
                    exchangeRate: nbcWalletPublicConfig.exchangeRate
                }
            ];
    }, [
        nbcWalletPublicConfig.assets,
        nbcWalletPublicConfig.chainId,
        nbcWalletPublicConfig.exchangeRate,
        nbcWalletPublicConfig.tokenAddress,
        nbcWalletPublicConfig.tokenDecimals
    ]);
    const [selectedAssetSymbol, setSelectedAssetSymbol] = React.useState(((_a = publicAssets[0]) === null || _a === void 0 ? void 0 : _a.symbol) || 'NBC');
    const apis = React.useMemo(() => ({ authRequestApi, authVerifyApi, balanceApi, onchainBalanceApi }), [authRequestApi, authVerifyApi, balanceApi, onchainBalanceApi]);
    const publicConfig = React.useMemo(() => ({
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
        onchainEnabled: nbcWalletPublicConfig.onchainEnabled,
        assets: publicAssets
    }), [
        nbcWalletPublicConfig.blockExplorerUrl,
        nbcWalletPublicConfig.chainBalanceEnabled,
        nbcWalletPublicConfig.chainId,
        nbcWalletPublicConfig.chainName,
        nbcWalletPublicConfig.displayName,
        nbcWalletPublicConfig.exchangeRate,
        nbcWalletPublicConfig.nativeSymbol,
        nbcWalletPublicConfig.onchainEnabled,
        nbcWalletPublicConfig.rpcUrl,
        nbcWalletPublicConfig.shopCurrency,
        nbcWalletPublicConfig.tokenAddress,
        nbcWalletPublicConfig.tokenDecimals,
        nbcWalletPublicConfig.treasuryAddress,
        publicAssets
    ]);
    const checkoutGrandTotal = (_b = cart === null || cart === void 0 ? void 0 : cart.grandTotal) === null || _b === void 0 ? void 0 : _b.value;
    const initialGrandTotal = (_c = myCart === null || myCart === void 0 ? void 0 : myCart.grandTotal) === null || _c === void 0 ? void 0 : _c.value;
    const orderCnyTotal = typeof checkoutGrandTotal === 'number' && checkoutGrandTotal > 0
        ? checkoutGrandTotal
        : typeof initialGrandTotal === 'number'
            ? initialGrandTotal
            : checkoutGrandTotal !== null && checkoutGrandTotal !== void 0 ? checkoutGrandTotal : 0;
    const isNbcSelected = (checkoutData === null || checkoutData === void 0 ? void 0 : checkoutData.paymentMethod) === 'nbc_wallet';
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
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order_uuid: orderId,
                        asset: selectedAssetSymbol
                    })
                });
                const json = await response.json();
                if (!response.ok || json.error) {
                    captureRequestedRef.current = false;
                    throw new Error(((_a = json.error) === null || _a === void 0 ? void 0 : _a.message) || _('NBC payment failed'));
                }
                window.location.href = `${checkoutSuccessUrl}/${orderId}`;
            }
            catch (error) {
                captureRequestedRef.current = false;
                toast.error(error instanceof Error ? error.message : _('NBC payment failed'));
            }
        };
        captureOrder();
    }, [
        orderPlaced,
        orderId,
        checkoutData === null || checkoutData === void 0 ? void 0 : checkoutData.paymentMethod,
        captureAPI,
        checkoutSuccessUrl,
        selectedAssetSymbol
    ]);
    useEffect(() => {
        registerPaymentComponent('nbc_wallet', {
            nameRenderer: ({ isSelected }) => (React.createElement("span", { className: isSelected ? 'font-medium' : '' }, nbcWalletPublicConfig.displayName || _('NBC Wallet'))),
            formRenderer: ({ isSelected }) => (React.createElement(NbcWalletCheckoutPanel, { publicConfig: publicConfig, orderCnyTotal: orderCnyTotal, isSelected: isSelected, selectedAssetSymbol: selectedAssetSymbol, onSelectAsset: setSelectedAssetSymbol })),
            checkoutButtonRenderer: () => (React.createElement(NbcWalletPayButton, { isNbcSelected: isNbcSelected, selectedAssetSymbol: selectedAssetSymbol }))
        });
    }, [
        registerPaymentComponent,
        nbcWalletPublicConfig.displayName,
        orderCnyTotal,
        isNbcSelected,
        publicConfig,
        selectedAssetSymbol
    ]);
    return (React.createElement(NbcWalletBridge, { apis: apis, publicConfig: publicConfig, orderCnyTotal: orderCnyTotal, enabled: isNbcSelected, selectedAssetSymbol: selectedAssetSymbol }));
}
function NbcWalletPayButton({ isNbcSelected, selectedAssetSymbol }) {
    const dispatch = useCheckoutDispatch();
    const { checkout } = dispatch;
    const { loadingStates, orderPlaced } = useCheckout();
    const { isConnected, hasSufficientBalance, connecting, loadingBalance } = useCheckoutWalletSnapshot();
    const canPay = isConnected && hasSufficientBalance && !connecting && !loadingBalance;
    const onCheckout = async (event) => {
        event.preventDefault();
        if (!canPay) {
            toast.error(_('Connect your wallet and ensure sufficient balance').replace('balance', `${selectedAssetSymbol} balance`));
            return;
        }
        try {
            await checkout();
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : _('Failed to place order'));
        }
    };
    if (!isNbcSelected) {
        return null;
    }
    return (React.createElement(Button, { variant: "default", size: "xl", type: "button", onClick: onCheckout, disabled: loadingStates.placingOrder || orderPlaced || !canPay, className: "w-full" }, loadingStates.placingOrder
        ? _('Placing Order...')
        : `${_('Pay with')} ${selectedAssetSymbol} ${_('Wallet')}`));
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
      assets {
        symbol
        displayName
        chainId
        assetType
        tokenAddress
        tokenDecimals
        exchangeRate
      }
    }
    myCart {
      grandTotal {
        value
        text
      }
    }
  }
`;
//# sourceMappingURL=NbcWallet.js.map