import { NumberField } from '@components/common/form/NumberField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function General({ attribute }) {
    return /*#__PURE__*/ React.createElement(Card, {
        className: "bg-popover"
    }, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('Setting')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Manage the setting of the attribute.'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "is_required",
        label: _('Is Required?'),
        options: [
            {
                value: 0,
                label: _('No')
            },
            {
                value: 1,
                label: _('Yes')
            }
        ],
        required: true,
        validation: {
            required: _('This field is required')
        },
        defaultValue: attribute?.isRequired === 0 ? 0 : 1
    })), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-6 border-t border-border"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "is_filterable",
        label: _('Is Filterable?'),
        options: [
            {
                value: 0,
                label: _('No')
            },
            {
                value: 1,
                label: _('Yes')
            }
        ],
        required: true,
        validation: {
            required: _('This field is required')
        },
        defaultValue: attribute?.isFilterable === 1 ? 1 : 0
    })), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-6 border-t border-border"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "display_on_frontend",
        label: _('Display on Frontend?'),
        options: [
            {
                value: 0,
                label: _('No')
            },
            {
                value: 1,
                label: _('Yes')
            }
        ],
        required: true,
        validation: {
            required: _('This field is required')
        },
        defaultValue: attribute?.displayOnFrontend === 1 ? 1 : 0
    })), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-6 border-t border-border"
    }, /*#__PURE__*/ React.createElement(NumberField, {
        name: "sort_order",
        label: _('Sort Order'),
        placeholder: _('Sort order'),
        required: true,
        validation: {
            required: _('Sort order is required'),
            min: {
                value: 0,
                message: _('Sort order must be a positive number')
            }
        },
        defaultValue: attribute?.sortOrder
    })));
}
export const layout = {
    areaId: 'rightSide',
    sortOrder: 10
};
export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeId
      isFilterable
      isRequired
      displayOnFrontend
      sortOrder
    }
  }
`;
