import { NavigationItemGroup } from '@components/admin/NavigationItemGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { GiftIcon } from 'lucide-react';
import React from 'react';
export default function CatalogMenuGroup({ couponGrid }) {
    return /*#__PURE__*/ React.createElement(NavigationItemGroup, {
        id: "couponMenuGroup",
        name: "Promotion",
        items: [
            {
                Icon: GiftIcon,
                url: couponGrid,
                title: _('Coupons')
            }
        ]
    });
}
export const layout = {
    areaId: 'adminMenu',
    sortOrder: 50
};
export const query = `
  query Query {
    couponGrid: url(routeId:"couponGrid")
  }
`;
