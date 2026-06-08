import Area from '@components/common/Area.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function SEO({ product }) {
    const fields = [
        {
            component: {
                default: /*#__PURE__*/ React.createElement(InputField, {
                    name: "url_key",
                    label: _('URL Key'),
                    placeholder: _('Enter URL Key'),
                    required: true,
                    defaultValue: product?.urlKey,
                    validation: {
                        required: _('URL Key is required'),
                        pattern: {
                            value: /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
                            message: _('URL Key can only contain lowercase letters numbers and hyphens')
                        }
                    }
                })
            },
            sortOrder: 0
        },
        {
            component: {
                default: /*#__PURE__*/ React.createElement(InputField, {
                    name: "meta_title",
                    label: _('Meta Title'),
                    placeholder: _('Enter Meta Title'),
                    required: true,
                    defaultValue: product?.metaTitle,
                    validation: {
                        required: _('Meta Title is required')
                    }
                })
            },
            sortOrder: 10
        },
        {
            component: {
                default: /*#__PURE__*/ React.createElement(InputField, {
                    type: "hidden",
                    name: "meta_keywords",
                    defaultValue: product?.metaKeywords
                })
            },
            sortOrder: 20
        },
        {
            component: {
                default: /*#__PURE__*/ React.createElement(TextareaField, {
                    name: "meta_description",
                    label: _('Meta Description'),
                    placeholder: _('Enter Meta Description'),
                    defaultValue: product?.metaDescription || ''
                })
            },
            sortOrder: 30
        }
    ];
    return /*#__PURE__*/ React.createElement(Card, null, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('SEO')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Manage the SEO settings.'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement(Area, {
        id: "productEditSeo",
        coreComponents: fields,
        className: "flex flex-col gap-2"
    })));
}
export const layout = {
    areaId: 'leftSide',
    sortOrder: 60
};
export const query = `
  query Query {
    product(id: getContextValue('productId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;
