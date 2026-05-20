import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function StripePayment({ setting: { stripePaymentStatus, stripeDisplayName, stripePublishableKey, stripeSecretKey, stripeEndpointSecret, stripePaymentMode } }) {
    return /*#__PURE__*/ React.createElement(Card, null, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('Stripe Payment')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Configure your Stripe payment gateway settings'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Enable?'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(ToggleField, {
        name: "stripePaymentStatus",
        defaultValue: stripePaymentStatus,
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
        name: "stripeDisplayName",
        placeholder: _('Display Name'),
        defaultValue: stripeDisplayName || ''
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Publishable Key'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(InputField, {
        name: "stripePublishableKey",
        placeholder: _('Publishable Key'),
        defaultValue: stripePublishableKey || ''
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Secret Key'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(InputField, {
        name: "stripeSecretKey",
        placeholder: _('Secret Key'),
        defaultValue: stripeSecretKey || ''
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Webhook Secret Key'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(InputField, {
        name: "stripeEndpointSecret",
        placeholder: _('Secret Key'),
        defaultValue: stripeEndpointSecret || '',
        helperText: _('Your webhook url should be: https://yourdomain.com/api/stripe/webhook')
    })))), /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-4 border-t border-border"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "grid grid-cols-3 gap-5"
    }, /*#__PURE__*/ React.createElement("div", {
        className: "col-span-1 items-center flex"
    }, /*#__PURE__*/ React.createElement("h4", null, _('Payment mode'))), /*#__PURE__*/ React.createElement("div", {
        className: "col-span-2"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "stripePaymentMode",
        defaultValue: stripePaymentMode,
        options: [
            {
                label: _('Authorize only'),
                value: 'authorizeOnly'
            },
            {
                label: _('Capture'),
                value: 'capture'
            }
        ]
    })))));
}
export const layout = {
    areaId: 'paymentSetting',
    sortOrder: 10
};
export const query = `
  query Query {
    setting {
      stripeDisplayName
      stripePaymentStatus
      stripePublishableKey
      stripeSecretKey
      stripeEndpointSecret
      stripePaymentMode
    }
  }
`;
