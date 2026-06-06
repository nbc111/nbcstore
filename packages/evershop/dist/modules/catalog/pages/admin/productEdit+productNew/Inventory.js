import { NumberField } from '@components/common/form/NumberField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function Inventory({ product }) {
    const inventory = product?.inventory || {
        qty: undefined,
        stockAvailability: undefined,
        manageStock: undefined
    };
    return /*#__PURE__*/ React.createElement(Card, {
        className: "bg-popover"
    }, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('Inventory')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Manage the inventory settings of the product.'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "manage_stock",
        label: _('Manage Stock'),
        options: [
            {
                value: 1,
                label: _('Yes')
            },
            {
                value: 0,
                label: _('No')
            }
        ],
        defaultValue: inventory.manageStock === 0 ? 0 : 1,
        required: true
    })), /*#__PURE__*/ React.createElement(CardContent, {
        className: "border-t border-t-border pt-6"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "stock_availability",
        label: _('Stock Availability'),
        options: [
            {
                value: 1,
                label: _('In Stock')
            },
            {
                value: 0,
                label: _('Out of Stock')
            }
        ],
        defaultValue: inventory.stockAvailability === 0 ? 0 : 1,
        required: true
    })), /*#__PURE__*/ React.createElement(CardContent, {
        className: "border-t border-t-border pt-6"
    }, /*#__PURE__*/ React.createElement(NumberField, {
        name: "qty",
        defaultValue: inventory.qty,
        placeholder: _('Quantity'),
        label: _('Quantity'),
        required: true
    })));
}
export const layout = {
    areaId: 'rightSide',
    sortOrder: 15
};
export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      inventory {
        qty
        stockAvailability
        manageStock
      }
    }
  }
`;
