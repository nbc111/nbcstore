import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function PaypalPayment({ setting: { paypalPaymentStatus, paypalDisplayName, paypalClientId, paypalClientSecret, paypalEnvironment, paypalPaymentIntent } }) {
    return /*#__PURE__*/ React.createElement(Card, null, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('Paypal Payment')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Configure your Paypal payment gateway settings'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Enable?'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(ToggleField, {
        name: "paypalPaymentStatus",
        defaultValue: paypalPaymentStatus,
        trueValue: 1,
        falseValue: 0
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Dislay Name'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(InputField, {
        name: "paypalDisplayName",
        placeholder: _('Display Name'),
        defaultValue: paypalDisplayName
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Client ID'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(InputField, {
        name: "paypalClientId",
        placeholder: _('Client ID'),
        defaultValue: paypalClientId
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Client Secret'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(InputField, {
        name: "paypalClientSecret",
        placeholder: _('Secret Key'),
        defaultValue: paypalClientSecret
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Environment'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "paypalEnvironment",
        defaultValue: paypalEnvironment,
        options: [
            {
                label: _('Sandbox'),
                value: 'https://api-m.sandbox.paypal.com'
            },
            {
                label: _('Live'),
                value: 'https://api-m.paypal.com'
            }
        ]
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Payment mode'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "paypalPaymentIntent",
        defaultValue: paypalPaymentIntent,
        options: [
            {
                label: _('Authorize only'),
                value: 'AUTHORIZE'
            },
            {
                label: _('Capture'),
                value: 'CAPTURE'
            }
        ]
    })))));
}
export const layout = {
    areaId: 'paymentSetting',
    sortOrder: 15
};
export const query = `
  query Query {
    setting {
      paypalPaymentStatus
      paypalDisplayName
      paypalClientId
      paypalClientSecret
      paypalEnvironment
      paypalPaymentIntent
    }
  }
`;
