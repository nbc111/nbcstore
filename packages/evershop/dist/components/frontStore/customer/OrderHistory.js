import { Image } from '@components/common/Image.js';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';
import { useCustomer } from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
function translateLabel(value) {
    if (!value) {
        return '';
    }
    return _(value);
}
const StatusLine = ({ label, value })=>{
    if (!value) {
        return null;
    }
    return /*#__PURE__*/ React.createElement("div", {
        className: "text-sm text-muted-foreground"
    }, /*#__PURE__*/ React.createElement("span", {
        className: "font-medium text-foreground"
    }, label, "："), translateLabel(value));
};
const OrderDetail = ({ order })=>{
    return /*#__PURE__*/ React.createElement("div", {
        className: "order border-divider"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "order-inner grid grid-cols-1 md:grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "order-items col-span-2"
    }, order.items.map((item)=>/*#__PURE__*/ React.createElement("div", {
            className: "order-item mb-2 flex gap-5 items-center",
            key: item.orderItemId || item.productSku
        }, /*#__PURE__*/ React.createElement("div", {
            className: "thumbnail border border-divider p-2 rounded"
        }, item.thumbnail && /*#__PURE__*/ React.createElement(Image, {
            width: 50,
            height: 50,
            style: {
                maxWidth: '6rem'
            },
            src: item.thumbnail,
            alt: item.productName
        }), !item.thumbnail && /*#__PURE__*/ React.createElement(ProductNoThumbnail, {
            width: 50,
            height: 50
        })), /*#__PURE__*/ React.createElement("div", {
            className: "order-item-info"
        }, /*#__PURE__*/ React.createElement("div", {
            className: "order-item-name font-semibold"
        }, item.productName), /*#__PURE__*/ React.createElement("div", {
            className: "order-item-sku italic"
        }, _('SKU: ${sku}', {
            sku: item.productSku
        })), /*#__PURE__*/ React.createElement("div", {
            className: "order-item-qty"
        }, item.qty, " × ", item.productPrice.text))))), /*#__PURE__*/ React.createElement("div", {
        className: "order-total col-span-1 space-y-2"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "order-header"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "order-number"
    }, /*#__PURE__*/ React.createElement("span", {
        className: "font-bold"
    }, _('Order'), ": #", order.orderNumber), /*#__PURE__*/ React.createElement("span", {
        className: "italic pl-2 text-muted-foreground"
    }, order.createdAt.text))), /*#__PURE__*/ React.createElement(StatusLine, {
        label: _('Order status'),
        value: order.status?.name
    }), /*#__PURE__*/ React.createElement(StatusLine, {
        label: _('Payment status'),
        value: order.paymentStatus?.name
    }), /*#__PURE__*/ React.createElement(StatusLine, {
        label: _('Shipment status'),
        value: order.shipmentStatus?.name
    }), /*#__PURE__*/ React.createElement(StatusLine, {
        label: _('Payment method'),
        value: order.paymentMethodName
    }), /*#__PURE__*/ React.createElement(StatusLine, {
        label: _('Shipping method'),
        value: order.shippingMethodName
    }), /*#__PURE__*/ React.createElement("div", {
        className: "order-total-value font-bold pt-1"
    }, _('Total'), ": ", order.grandTotal.text))));
};
export default function OrderHistory({ title }) {
    const { customer } = useCustomer();
    const orders = customer?.orders || [];
    return /*#__PURE__*/ React.createElement("div", {
        className: "order-history divide-y"
    }, title && /*#__PURE__*/ React.createElement("h2", {
        className: "order-history-title border-border"
    }, title), orders.length === 0 && /*#__PURE__*/ React.createElement("div", {
        className: "order-history-empty py-4 text-muted-foreground"
    }, _('You have not placed any orders yet')), orders.map((order)=>/*#__PURE__*/ React.createElement("div", {
            className: "order-history-order border-divider py-5",
            key: order.orderId
        }, /*#__PURE__*/ React.createElement(OrderDetail, {
            order: order
        }))));
}
