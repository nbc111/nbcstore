import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/common/ui/Select.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
export function SelectField({ name, label, error, helperText, required, validation, options, placeholder, wrapperClassName, className, defaultValue, disabled, id, onChange: onChangeCallback }) {
    const { control, formState: { errors } } = useFormContext();
    const fieldError = getNestedError(name, errors, error);
    const fieldId = id || `field-${name}`;
    const hasDefaultValue = defaultValue !== undefined && defaultValue !== null && defaultValue !== '';
    const validationRules = {
        ...validation,
        ...required && !validation?.required && {
            required: {
                value: true,
                message: _('${field} is required', {
                    field: label || name
                })
            },
            validate: {
                ...validation?.validate,
                notEmpty: (value)=>{
                    if (required && (value === '' || value === null || value === undefined)) {
                        return _('${field} is required', {
                            field: label || name
                        });
                    }
                    return true;
                }
            }
        }
    };
    return /*#__PURE__*/ React.createElement(Field, {
        "data-invalid": fieldError ? 'true' : 'false',
        className: wrapperClassName
    }, label && /*#__PURE__*/ React.createElement(FieldLabel, {
        htmlFor: fieldId
    }, /*#__PURE__*/ React.createElement(React.Fragment, null, _(label), required && /*#__PURE__*/ React.createElement("span", {
        className: "text-destructive"
    }, "*"), helperText && /*#__PURE__*/ React.createElement(Tooltip, {
        content: _(helperText),
        position: "top"
    }))), /*#__PURE__*/ React.createElement(Controller, {
        name: name,
        control: control,
        rules: validationRules,
        defaultValue: hasDefaultValue ? defaultValue : '',
        render: ({ field })=>/*#__PURE__*/ React.createElement(Select, {
                items: options,
                value: field.value === '' || field.value === null || field.value === undefined ? null : field.value,
                onValueChange: (value)=>{
                    const newValue = value === null || value === undefined || value === '' ? '' : value;
                    field.onChange(newValue);
                    if (onChangeCallback && newValue !== '') {
                        onChangeCallback(newValue);
                    }
                },
                disabled: disabled
            }, /*#__PURE__*/ React.createElement(SelectTrigger, {
                id: fieldId,
                className: cn('w-full', className),
                "aria-invalid": fieldError !== undefined ? 'true' : 'false',
                "aria-describedby": fieldError !== undefined ? `${fieldId}-error` : undefined
            }, /*#__PURE__*/ React.createElement(SelectValue, {
                placeholder: placeholder ? _(placeholder) : undefined
            })), /*#__PURE__*/ React.createElement(SelectContent, null, options.map((option)=>/*#__PURE__*/ React.createElement(SelectItem, {
                    key: String(option.value),
                    value: option.value,
                    disabled: option.disabled
                }, option.label))))
    }), fieldError && /*#__PURE__*/ React.createElement(FieldError, null, fieldError));
}
