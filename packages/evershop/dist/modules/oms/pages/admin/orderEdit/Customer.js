import { AddressSummary } from '@components/common/customer/address/AddressSummary.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Card, CardContent, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function Customer({ order: { noShippingRequired, shippingAddress, billingAddress, customerFullName, customerEmail, customerUrl } }) {
    return /*#__PURE__*/ React.createElement(Card, {
        className: ""
    }, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('Customer Information'))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "min-w-0"
    }, customerUrl && /*#__PURE__*/ React.createElement("a", {
        href: customerUrl,
        className: "text-interactive hover:underline block break-all"
    }, customerFullName), !customerUrl && /*#__PURE__*/ React.createElement("span", {
        className: "break-all"
    }, customerEmail, " (", _('Guest Checkout'), ")")), /*#__PURE__*/ React.createElement(CardContent, {
        className: "border-t border-border pt-3 min-w-0"
    }, /*#__PURE__*/ React.createElement(CardTitle, {
        className: "mb-2"
    }, _('Contact Information')), /*#__PURE__*/ React.createElement("div", {
        className: "min-w-0"
    }, /*#__PURE__*/ React.createElement("a", {
        href: "#",
        className: "text-interactive hover:underline block break-all"
    }, customerEmail)), shippingAddress?.telephone && /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("span", null, shippingAddress.telephone))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "border-t border-border pt-3"
    }, /*#__PURE__*/ React.createElement(CardTitle, {
        className: "mb-2"
    }, _('Shipping Address')), !noShippingRequired && /*#__PURE__*/ React.createElement(AddressSummary, {
        address: shippingAddress
    }), noShippingRequired && /*#__PURE__*/ React.createElement("span", {
        className: "text-muted-foreground"
    }, _('No shipping required'))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "border-t border-border pt-3"
    }, /*#__PURE__*/ React.createElement(CardTitle, {
        className: "mb-2"
    }, _('Billing address')), /*#__PURE__*/ React.createElement(AddressSummary, {
        address: billingAddress
    })));
}
export const layout = {
    areaId: 'rightSide',
    sortOrder: 15
};
export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      customerFullName
      customerEmail
      customerUrl
      noShippingRequired
      shippingAddress {
        fullName
        city
        address1
        address2
        postcode
        telephone
        province {
          code
          name
        }
        country {
          code
          name
        }
      }
      billingAddress {
        fullName
        city
        address1
        address2
        postcode
        telephone
        province {
          code
          name
        }
        country {
          code
          name
        }
      }
    }
  }
`;

