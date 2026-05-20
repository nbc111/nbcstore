import { _ } from '@evershop/evershop/lib/locale/translate/_';
import PropTypes from 'prop-types';
import React from 'react';
export default function Version({ version }) {
    return /*#__PURE__*/ React.createElement("div", {
        className: "version"
    }, /*#__PURE__*/ React.createElement("span", null, _('Version ${version}', {
        version
    })));
}
Version.propTypes = {
    version: PropTypes.string.isRequired
};
export const layout = {
    areaId: 'footerLeft',
    sortOrder: 20
};
export const query = `
  query query {
    version
  }
`;
