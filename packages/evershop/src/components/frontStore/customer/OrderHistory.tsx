import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import {
  Order,
  useCustomer
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

function translateLabel(value?: string | null): string {
  if (!value) {
    return '';
  }
  return _(value);
}

const StatusLine: React.FC<{ label: string; value?: string | null }> = ({
  label,
  value
}) => {
  if (!value) {
    return null;
  }
  return (
    <div className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{label}：</span>
      {translateLabel(value)}
    </div>
  );
};

const OrderDetail: React.FC<{ order: Order }> = ({ order }) => {
  return (
    <div className="order border-divider">
      <div className="order-inner grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="order-items col-span-2">
          {order.items.map((item) => (
            <div
              className="order-item mb-2 flex gap-5 items-center"
              key={item.orderItemId || item.productSku}
            >
              <div className="thumbnail border border-divider p-2 rounded">
                {item.thumbnail && (
                  <Image
                    width={50}
                    height={50}
                    style={{ maxWidth: '6rem' }}
                    src={item.thumbnail}
                    alt={item.productName}
                  />
                )}
                {!item.thumbnail && (
                  <ProductNoThumbnail width={50} height={50} />
                )}
              </div>
              <div className="order-item-info">
                <div className="order-item-name font-semibold">
                  {item.productName}
                </div>
                <div className="order-item-sku italic">
                  {_('SKU: ${sku}', { sku: item.productSku })}
                </div>
                <div className="order-item-qty">
                  {item.qty} × {item.productPrice.text}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="order-total col-span-1 space-y-2">
          <div className="order-header">
            <div className="order-number">
              <span className="font-bold">
                {_('Order')}: #{order.orderNumber}
              </span>
              <span className="italic pl-2 text-muted-foreground">
                {order.createdAt.text}
              </span>
            </div>
          </div>
          <StatusLine label={_('Order status')} value={order.status?.name} />
          <StatusLine
            label={_('Payment status')}
            value={order.paymentStatus?.name}
          />
          <StatusLine
            label={_('Shipment status')}
            value={order.shipmentStatus?.name}
          />
          <StatusLine
            label={_('Payment method')}
            value={order.paymentMethodName}
          />
          <StatusLine
            label={_('Shipping method')}
            value={order.shippingMethodName}
          />
          <div className="order-total-value font-bold pt-1">
            {_('Total')}: {order.grandTotal.text}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OrderHistory({ title }: { title?: string }) {
  const { customer } = useCustomer();
  const orders = customer?.orders || [];
  return (
    <div className="order-history divide-y">
      {title && <h2 className="order-history-title border-border">{title}</h2>}
      {orders.length === 0 && (
        <div className="order-history-empty py-4 text-muted-foreground">
          {_('You have not placed any orders yet')}
        </div>
      )}
      {orders.map((order) => (
        <div
          className="order-history-order border-divider py-5"
          key={order.orderId}
        >
          <OrderDetail order={order} />
        </div>
      ))}
    </div>
  );
}
