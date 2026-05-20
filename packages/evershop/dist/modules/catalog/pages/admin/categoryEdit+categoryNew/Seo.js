import Area from '@components/common/Area.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import React from 'react';
export default function Seo({ category }) {
    const fields = [
        {
            component: {
                default: /*#__PURE__*/ React.createElement(InputField, {
                    name: "url_key",
                    label: _('URL key'),
                    placeholder: _('Enter URL key'),
                    defaultValue: category?.urlKey || '',
                    required: true,
                    validation: {
                        required: _('URL key is required'),
                        pattern: {
                            value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                            message: _('URL key must be lowercase and can only contain alphanumeric characters and hyphens')
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
                    label: _('Meta title'),
                    placeholder: _('Enter Meta title'),
                    defaultValue: category?.metaTitle || '',
                    required: true,
                    validation: {
                        required: _('Meta title is required')
                    }
                })
            },
            sortOrder: 10
        },
        {
            component: {
                default: /*#__PURE__*/ React.createElement(TextareaField, {
                    name: "meta_description",
                    label: _('Meta description'),
                    placeholder: _('Enter Meta description'),
                    defaultValue: category?.metaDescription || '',
                    required: true,
                    validation: {
                        required: _('Meta description is required')
                    }
                })
            },
            sortOrder: 30
        }
    ];
    return /*#__PURE__*/ React.createElement(Card, null, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('Search engine optimize')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Manage the SEO settings of the category.'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement(Area, {
        id: "categoryEditSeo",
        coreComponents: fields,
        className: "space-y-2"
    })));
}
export const layout = {
    areaId: 'leftSide',
    sortOrder: 60
};
export const query = `
  query Query {
    category(id: getContextValue('categoryId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;
