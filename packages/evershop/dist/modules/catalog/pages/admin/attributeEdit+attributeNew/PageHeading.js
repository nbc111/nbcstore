import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
export default function AttributeEditPageHeading({ backUrl, attribute }) {
    return /*#__PURE__*/ React.createElement(PageHeading, {
        backUrl: backUrl,
        heading: attribute?.attributeName ? _('Editing ${name}', {
            name: attribute.attributeName
        }) : _('Create a new attribute')
    });
}
AttributeEditPageHeading.defaultProps = {
    attribute: {}
};
export const layout = {
    areaId: 'content',
    sortOrder: 5
};
export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeName
    }
    backUrl: url(routeId: "attributeGrid")
  }
`;
