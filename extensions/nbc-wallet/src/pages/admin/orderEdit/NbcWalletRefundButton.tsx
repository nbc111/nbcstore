import { Button } from '@evershop/evershop/components/common/ui/Button';
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
  };
}

export default function NbcWalletRefundButton({
  refundAPI,
  order: { uuid, paymentMethod, paymentStatus }
}: Props) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(refundAPI, { order_id: uuid });
      if (!response.data.error) {
        window.location.reload();
      } else {
        toast.error(response.data.error.message);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    paymentMethod === 'nbc_wallet' &&
    ['nbc_paid', 'nbc_partial_refunded'].includes(paymentStatus.code) ? (
      <div className="px-6 pb-6">
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
      </div>
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
      paymentStatus {
        code
      }
    }
  }
`;
