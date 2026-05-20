import Area from '@components/common/Area.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';
import { Setting } from './components/Setting.js';
import './General.scss';
export default function General({ coupon }) {
    return /*#__PURE__*/ React.createElement(Area, {
        id: "couponFormGeneral",
        className: "space-y-3",
        coreComponents: [
            {
                component: {
                    default: /*#__PURE__*/ React.createElement(InputField, {
                        name: "coupon",
                        label: _('Coupon Code'),
                        defaultValue: coupon?.coupon || '',
                        placeholder: _('Enter coupon code'),
                        required: true,
                        validation: {
                            required: _('Coupon code is required'),
                            pattern: {
                                value: /^[a-zA-Z0-9_-]+$/,
                                message: _('Coupon code can only contain letters, numbers, underscores, and hyphens')
                            }
                        }
                    })
                },
                sortOrder: 10
            },
            {
                component: {
                    default: /*#__PURE__*/ React.createElement(TextareaField, {
                        name: "description",
                        label: _('Description'),
                        defaultValue: coupon?.description || '',
                        placeholder: _('Enter description'),
                        required: true,
                        validation: {
                            required: _('Description is required')
                        }
                    })
                },
                sortOrder: 20
            },
            {
                component: {
                    default: /*#__PURE__*/ React.createElement(RadioGroupField, {
                        name: "status",
                        label: _('Status'),
                        options: [
                            {
                                label: _('Enabled'),
                                value: 1
                            },
                            {
                                label: _('Disabled'),
                                value: 0
                            }
                        ],
                        defaultValue: coupon?.status === 0 ? 0 : 1,
                        required: true,
                        validation: {
                            required: _('Status is required'),
                            valueAsNumber: true
                        }
                    })
                },
                sortOrder: 30
            },
            {
                component: {
                    default: Setting
                },
                props: {
                    startDate: get(coupon, 'startDate.text', ''),
                    endDate: get(coupon, 'endDate.text', ''),
                    discountAmount: get(coupon, 'discountAmount', '')
                },
                sortOrder: 40
            },
            {
                component: {
                    default: /*#__PURE__*/ React.createElement(CheckboxField, {
                        name: "free_shipping",
                        defaultValue: parseInt(get(coupon, 'freeShipping'), 10) === 1,
                        label: _('Free shipping?')
                    })
                },
                sortOrder: 50
            }
        ]
    });
}
export const layout = {
    areaId: 'couponEditGeneral',
    sortOrder: 10
};
export const query = `
  query Query {
    coupon(id: getContextValue('couponId', null)) {
      coupon
      status
      description
      discountAmount
      freeShipping
      startDate {
        text
      }
      endDate {
        text
      }
    }
  }
`;
