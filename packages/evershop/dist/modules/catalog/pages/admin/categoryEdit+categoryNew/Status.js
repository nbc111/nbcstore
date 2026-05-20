import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function Status({ category }) {
    return /*#__PURE__*/ React.createElement(Card, null, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('Status')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Manage the status settings of the category.'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "status",
        label: _('Status'),
        options: [
            {
                label: _('Disabled'),
                value: 0
            },
            {
                label: _('Enabled'),
                value: 1
            }
        ],
        defaultValue: category?.status === 0 ? 0 : 1,
        validation: {
            required: _('This field is required')
        }
    })), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-6 border-t border-border"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "include_in_nav",
        label: _('Include in Store Menu?'),
        options: [
            {
                label: _('No'),
                value: 0
            },
            {
                label: _('Yes'),
                value: 1
            }
        ],
        defaultValue: category?.includeInNav === 0 ? 0 : 1,
        validation: {
            required: _('This field is required')
        }
    })), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-6 border-t border-border"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "show_products",
        label: _('Show products?'),
        options: [
            {
                label: _('No'),
                value: 0
            },
            {
                label: _('Yes'),
                value: 1
            }
        ],
        defaultValue: category?.showProducts === 0 ? 0 : 1,
        validation: {
            required: _('This field is required')
        }
    })));
}
export const layout = {
    areaId: 'rightSide',
    sortOrder: 15
};
export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      status
      includeInNav
      showProducts
    }
  }
`;
