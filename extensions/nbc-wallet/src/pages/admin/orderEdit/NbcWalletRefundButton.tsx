import { Button } from '@evershop/evershop/components/common/ui/Button';
import { useAlertContext } from '@evershop/evershop/components/common/modal/Alert';
import { CardContent } from '@evershop/evershop/components/common/ui/Card';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface Props {
  refundAPI: string;
  order: {
    uuid: string;
    paymentMethod: string;
    paymentStatus: {
      code: string;
    };
    grandTotal: {
      value: number;
      currency: string;
    };
    items: {
      id: string;
      productName: string;
      qty: number;
      total: {
        value: number;
        text: string;
      };
    }[];
  };
}

export default function NbcWalletRefundButton({
  refundAPI,
  order: { uuid, paymentMethod, paymentStatus, grandTotal, items }
}: Props) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [isLoading, setIsLoading] = React.useState(false);

  const submitRefund = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsLoading(true);
      dispatchAlert({
        type: 'update',
        payload: { secondaryAction: { isLoading: true } }
      });

      const formData = new FormData(event.currentTarget);
      const refundItems = items
        .map((item) => ({
          orderItemId: item.id,
          qty: Number(formData.get(`item_qty_${item.id}`) || 0)
        }))
        .filter((item) => item.qty > 0);
      const amount = formData.get('amount');
      const payload =
        refundItems.length > 0
          ? { order_id: uuid, items: refundItems }
          : { order_id: uuid, amount };

      const response = await axios.post(refundAPI, payload);
      if (!response.data.error) {
        window.location.reload();
      } else {
        toast.error(response.data.error.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.message);
    } finally {
      setIsLoading(false);
      dispatchAlert({
        type: 'update',
        payload: { secondaryAction: { isLoading: false } }
      });
    }
  };

  const onAction = () => {
    openAlert({
      heading: _('Refund NBC Payment'),
      content: (
        <form id="nbcWalletRefund" onSubmit={submitRefund}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium" htmlFor="nbc-refund-amount">
                {_('Refund amount')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="nbc-refund-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={grandTotal.value}
                  className="form-field"
                />
                <span>{grandTotal.currency}</span>
              </div>
              <p className="mt-1 text-textSubdued">
                {_('Leave item quantities empty to refund by amount.')}
              </p>
            </div>
            <div>
              <div className="mb-2 font-medium">{_('Refund by line items')}</div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_96px] gap-3 items-center"
                  >
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-textSubdued">
                        {_('Ordered')}: {item.qty} · {item.total.text}
                      </div>
                    </div>
                    <input
                      name={`item_qty_${item.id}`}
                      type="number"
                      min="0"
                      max={item.qty}
                      step="1"
                      placeholder="0"
                      className="form-field"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      ),
      primaryAction: {
        title: _('Cancel'),
        onAction: closeAlert,
        variant: ''
      },
      secondaryAction: {
        title: _('Refund'),
        onAction: () => {
          const form = document.getElementById(
            'nbcWalletRefund'
          ) as HTMLFormElement | null;
          if (form) {
            form.dispatchEvent(
              new Event('submit', { cancelable: true, bubbles: true })
            );
          }
        },
        variant: 'secondary',
        isLoading
      }
    });
  };

  return (
    paymentMethod === 'nbc_wallet' &&
    ['nbc_paid', 'nbc_partial_refunded'].includes(paymentStatus.code) ? (
      <CardContent className="">
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={onAction}
            isLoading={isLoading}
            disabled={isLoading}
            className=""
          >
            {_('Refund NBC Payment')}
          </Button>
        </div>
      </CardContent>
    ) : null
  );
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
