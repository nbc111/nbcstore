import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
export default function NewPageButton({ newPageUrl }) {
    return /*#__PURE__*/ React.createElement(Button, {
        onClick: ()=>window.location.href = newPageUrl
    }, _('New Page'));
}
export const layout = {
    areaId: 'pageHeadingRight',
    sortOrder: 10
};
export const query = `
  query Query {
    newPageUrl: url(routeId: "cmsPageNew")
  }
`;
