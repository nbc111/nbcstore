import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
export default function OrderEditPageHeading({ backUrl, order }) {
    return /*#__PURE__*/ React.createElement(PageHeading, {
        backUrl: backUrl,
        heading: _('Editing #${orderNumber}', {
            orderNumber: order.orderNumber
        })
    });
}
export const layout = {
    areaId: 'content',
    sortOrder: 5
};
export const query = `
  query Query {
    order(uuid: getContextValue("orderId", null)) {
      orderNumber
    }
    backUrl: url(routeId: "orderGrid")
  }
`;
