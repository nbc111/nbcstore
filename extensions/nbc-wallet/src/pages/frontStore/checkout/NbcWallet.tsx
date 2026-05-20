import { Button } from '@evershop/evershop/components/common/ui/Button';
import {
  useCheckout,
  useCheckoutDispatch
} from '@evershop/evershop/components/frontStore/checkout/CheckoutContext';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

interface NbcWalletProps {
  captureAPI: string;
  checkoutSuccessUrl: string;
}

export default function NbcWallet({
  captureAPI,
  checkoutSuccessUrl
}: NbcWalletProps) {
  const checkoutState = useCheckout() as any;
  const checkoutDispatch = useCheckoutDispatch() as any;
  const { orderPlaced, orderId, checkoutData } = checkoutState;
  const { registerPaymentComponent } = checkoutDispatch;
  const captureRequestedRef = useRef(false);

  useEffect(() => {
    const captureOrder = async () => {
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
        toast.error(
          error instanceof Error ? error.message : _('NBC payment failed')
        );
      }
    };

    captureOrder();
  }, [orderPlaced, orderId, checkoutData?.paymentMethod, captureAPI, checkoutSuccessUrl]);

  useEffect(() => {
    registerPaymentComponent('nbc_wallet', {
      nameRenderer: () => <span>{_('NBC Wallet')}</span>,
      formRenderer: () => (
        <div className="text-sm text-muted-foreground py-3 text-center">
          {_('Pay directly with your NBC wallet balance.')}
        </div>
      ),
      checkoutButtonRenderer: () => {
        const dispatch = useCheckoutDispatch() as any;
        const state = useCheckout() as any;
        const { checkout } = dispatch;
        const { loadingStates, orderPlaced } = state;

        const onCheckout = async (event: React.MouseEvent) => {
          event.preventDefault();
          try {
            await checkout();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : _('Failed to place order')
            );
          }
        };

        return (
          <Button
            variant="default"
            size="xl"
            type="button"
            onClick={onCheckout}
            disabled={loadingStates.placingOrder || orderPlaced}
            className="w-full"
          >
            {loadingStates.placingOrder
              ? _('Placing Order...')
              : _('Pay with NBC Wallet')}
          </Button>
        );
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
