import { Form } from '@components/common/form/Form.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Button } from '@components/common/ui/Button.js';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@components/common/ui/Dialog.js';
import React from 'react';
import { useForm } from 'react-hook-form';
export default function AddTrackingButton({ order: { noShippingRequired, shipment }, carriers }) {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const form = useForm();
    if (noShippingRequired || !shipment) {
        return null;
    } else {
        return /*#__PURE__*/ React.createElement(React.Fragment, null, /*#__PURE__*/ React.createElement(Dialog, {
            open: dialogOpen,
            onOpenChange: setDialogOpen
        }, /*#__PURE__*/ React.createElement(DialogTrigger, {
            render: /*#__PURE__*/ React.createElement(Button, {
                title: _('Edit Tracking Info'),
                variant: "outline",
                onClick: ()=>{
                    setDialogOpen(true);
                }
            })
        }, _('Edit Tracking Info')), /*#__PURE__*/ React.createElement(DialogContent, null, /*#__PURE__*/ React.createElement(DialogHeader, null, /*#__PURE__*/ React.createElement(DialogTitle, null, _('Edit Tracking Info'))), /*#__PURE__*/ React.createElement(Form, {
            form: form,
            id: "editTrackingInfo",
            method: "PATCH",
            action: shipment.updateShipmentApi,
            submitBtn: false,
            onSuccess: ()=>{
                location.reload();
            }
        }, /*#__PURE__*/ React.createElement("div", {
            className: "grid grid-cols-2 gap-2"
        }, /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(InputField, {
            type: "text",
            name: "tracking_number",
            label: _('Tracking number'),
            placeholder: _('Tracking number'),
            defaultValue: shipment.trackingNumber || '',
            required: true,
            validation: {
                required: _('Tracking number is required')
            }
        })), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(SelectField, {
            name: "carrier",
            label: _('Carrier'),
            defaultValue: shipment.carrier || '',
            required: true,
            options: carriers,
            validation: {
                required: _('Carrier is required')
            }
        }))), /*#__PURE__*/ React.createElement("div", {
            className: "flex justify-end"
        }, /*#__PURE__*/ React.createElement("div", {
            className: "grid grid-cols-2 gap-2"
        }))), /*#__PURE__*/ React.createElement(DialogFooter, null, /*#__PURE__*/ React.createElement(DialogClose, {
            render: /*#__PURE__*/ React.createElement(Button, {
                title: _('Cancel'),
                variant: "outline",
                onClick: ()=>{
                    setDialogOpen(false);
                }
            })
        }, _('Cancel')), /*#__PURE__*/ React.createElement(Button, {
            title: _('Save'),
            variant: "default",
            isLoading: form.formState.isSubmitting,
            onClick: async ()=>{
                document.getElementById('editTrackingInfo').dispatchEvent(new Event('submit', {
                    cancelable: true,
                    bubbles: true
                }));
            }
        }, _('Save'))))));
    }
}
export const layout = {
    areaId: 'order_actions',
    sortOrder: 5
};
export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      noShippingRequired
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      createShipmentApi
    },
    carriers {
      label: name
      value: code
    }
  }
`;
