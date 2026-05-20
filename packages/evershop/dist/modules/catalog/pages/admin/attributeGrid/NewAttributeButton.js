import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
export default function NewAttributeButton({ newAttributeUrl }) {
    return /*#__PURE__*/ React.createElement(Button, {
        onClick: ()=>window.location.href = newAttributeUrl
    }, _('New Attribute'));
}
export const layout = {
    areaId: 'pageHeadingRight',
    sortOrder: 10
};
export const query = `
  query Query {
    newAttributeUrl: url(routeId: "attributeNew")
  }
`;
