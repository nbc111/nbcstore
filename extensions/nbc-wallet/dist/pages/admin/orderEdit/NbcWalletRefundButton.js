import { Button } from '@evershop/evershop/components/common/ui/Button';
import { useAlertContext } from '@evershop/evershop/components/common/modal/Alert';
import { CardContent } from '@evershop/evershop/components/common/ui/Card';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
export default function NbcWalletRefundButton({ refundAPI, order: { uuid, paymentMethod, paymentStatus, grandTotal, items } }) {
    const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
    const [isLoading, setIsLoading] = React.useState(false);
    const submitRefund = async (event)=>{
        event.preventDefault();
        try {
            setIsLoading(true);
            dispatchAlert({
                type: 'update',
                payload: {
                    secondaryAction: {
                        isLoading: true
                    }
                }
            });
            const formData = new FormData(event.currentTarget);
            const refundItems = items.map((item)=>({
                    orderItemId: item.id,
                    qty: Number(formData.get(`item_qty_${item.id}`) || 0)
                })).filter((item)=>item.qty > 0);
            const amount = formData.get('amount');
            const payload = refundItems.length > 0 ? {
                order_id: uuid,
                items: refundItems
            } : {
                order_id: uuid,
                amount
            };
            const response = await axios.post(refundAPI, payload);
            if (!response.data.error) {
                window.location.reload();
            } else {
                toast.error(response.data.error.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || error.message);
        } finally{
            setIsLoading(false);
            dispatchAlert({
                type: 'update',
                payload: {
                    secondaryAction: {
                        isLoading: false
                    }
                }
            });
        }
    };
    const onAction = ()=>{
        openAlert({
            heading: _('Refund NBC Payment'),
            content: /*#__PURE__*/ React.createElement("form", {
                id: "nbcWalletRefund",
                onSubmit: submitRefund
            }, /*#__PURE__*/ React.createElement("div", {
                className: "space-y-4"
            }, /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("label", {
                className: "block mb-1 font-medium",
                htmlFor: "nbc-refund-amount"
            }, _('Refund amount')), /*#__PURE__*/ React.createElement("div", {
                className: "flex items-center gap-2"
            }, /*#__PURE__*/ React.createElement("input", {
                id: "nbc-refund-amount",
                name: "amount",
                type: "number",
                min: "0.01",
                step: "0.01",
                defaultValue: grandTotal.value,
                className: "form-field"
            }), /*#__PURE__*/ React.createElement("span", null, grandTotal.currency)), /*#__PURE__*/ React.createElement("p", {
                className: "mt-1 text-textSubdued"
            }, _('Leave item quantities empty to refund by amount.'))), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("div", {
                className: "mb-2 font-medium"
            }, _('Refund by line items')), /*#__PURE__*/ React.createElement("div", {
                className: "space-y-2"
            }, items.map((item)=>/*#__PURE__*/ React.createElement("div", {
                    key: item.id,
                    className: "grid grid-cols-[1fr_96px] gap-3 items-center"
                }, /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("div", {
                    className: "font-medium"
                }, item.productName), /*#__PURE__*/ React.createElement("div", {
                    className: "text-textSubdued"
                }, _('Ordered'), ": ", item.qty, " · ", item.total.text)), /*#__PURE__*/ React.createElement("input", {
                    name: `item_qty_${item.id}`,
                    type: "number",
                    min: "0",
                    max: item.qty,
                    step: "1",
                    placeholder: "0",
                    className: "form-field"
                }))))))),
            primaryAction: {
                title: _('Cancel'),
                onAction: closeAlert,
                variant: ''
            },
            secondaryAction: {
                title: _('Refund'),
                onAction: ()=>{
                    const form = document.getElementById('nbcWalletRefund');
                    if (form) {
                        form.dispatchEvent(new Event('submit', {
                            cancelable: true,
                            bubbles: true
                        }));
                    }
                },
                variant: 'secondary',
                isLoading
            }
        });
    };
    return paymentMethod === 'nbc_wallet' && [
        'nbc_paid',
        'nbc_partial_refunded'
    ].includes(paymentStatus.code) ? /*#__PURE__*/ React.createElement(CardContent, {
        className: ""
    }, /*#__PURE__*/ React.createElement("div", {
        className: "flex justify-end"
    }, /*#__PURE__*/ React.createElement(Button, {
        variant: "destructive",
        onClick: onAction,
        isLoading: isLoading,
        disabled: isLoading,
        className: ""
    }, _('Refund NBC Payment')))) : null;
}
export const layout = {
    areaId: 'orderPaymentActions',
    sortOrder: 12
};
export const query = `
  query Query {
    refundAPI: url(routeId: "nbcWalletRefundPayment")
    order(uuid: getContextValue("orderId")) {
      uuid
      paymentMethod
      grandTotal {
        value
        currency
      }
      paymentStatus {
        code
      }
      items {
        id: orderItemId
        productName
        qty
        total {
          value
          text
        }
      }
    }
  }
`;
