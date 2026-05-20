import { DateField } from '@components/common/form/DateField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { NumberField } from '@components/common/form/NumberField.js';
import React from 'react';
export const Setting = ({ discountAmount, startDate, endDate })=>{
    return /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5 form-field-container"
    }, /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(NumberField, {
        name: "discount_amount",
        defaultValue: discountAmount,
        placeholder: _('Discount amount'),
        required: true,
        label: _('Discount amount'),
        validation: {
            required: _('Discount amount is required')
        }
    })), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(DateField, {
        name: "start_date",
        label: _('Start date'),
        placeholder: _('Start date'),
        defaultValue: startDate
    })), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(DateField, {
        placeholder: _('End date'),
        name: "end_date",
        label: _('End date'),
        defaultValue: endDate
    })));
};
