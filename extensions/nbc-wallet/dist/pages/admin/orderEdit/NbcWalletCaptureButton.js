import { Button } from '@evershop/evershop/components/common/ui/Button';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
export default function NbcWalletCaptureButton({ captureAPI, order: { uuid, paymentMethod, paymentStatus } }) {
    const [isLoading, setIsLoading] = React.useState(false);
    const onAction = async ()=>{
        try {
            setIsLoading(true);
            const response = await axios.post(captureAPI, {
                order_id: uuid
            });
            if (!response.data.error) {
                window.location.reload();
            } else {
                toast.error(response.data.error.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally{
            setIsLoading(false);
        }
    };
    return paymentMethod === 'nbc_wallet' && [
        'pending',
        'nbc_pending',
        'nbc_failed'
    ].includes(paymentStatus.code) ? /*#__PURE__*/ React.createElement("div", {
        className: "px-6 pb-6"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "flex justify-end"
    }, /*#__PURE__*/ React.createElement(Button, {
        onClick: onAction,
        isLoading: isLoading,
        disabled: isLoading,
        className: ""
    }, _('Capture NBC Payment')))) : null;
}
export const layout = {
    areaId: 'orderPaymentActions',
    sortOrder: 11
};
export const query = `
  query Query {
    captureAPI: url(routeId: "nbcWalletCapturePayment")
    order(uuid: getContextValue("orderId")) {
      uuid
      paymentMethod
      paymentStatus {
        code
      }
    }
  }
`;
