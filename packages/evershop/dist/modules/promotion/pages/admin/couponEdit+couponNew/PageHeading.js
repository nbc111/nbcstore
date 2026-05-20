import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
export default function CouponEditPageHeading({ backUrl, coupon }) {
    return /*#__PURE__*/ React.createElement(PageHeading, {
        backUrl: backUrl,
        heading: coupon ? _('Editing ${code}', {
            code: coupon.coupon
        }) : _('Create a new coupon')
    });
}
CouponEditPageHeading.defaultProps = {
    coupon: null
};
export const layout = {
    areaId: 'content',
    sortOrder: 5
};
export const query = `
  query Query {
    coupon(id: getContextValue("couponId", null)) {
      coupon
    }
    backUrl: url(routeId: "couponGrid")
  }
`;
