import Spinner from '@components/admin/Spinner.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { Button } from '@components/common/ui/Button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/common/ui/Card.js';
import { InputGroupAddon, InputGroupInput } from '@components/common/ui/InputGroup.js';
import { InputGroup } from '@components/common/ui/InputGroup.js';
import { PlusCircle } from 'lucide-react';
import React from 'react';
import { useFormContext, Controller, useFieldArray } from 'react-hook-form';
import Select from 'react-select';
import { useQuery } from 'urql';
import { v4 as uuidv4 } from 'uuid';
import { get } from '../../../../../lib/util/get.js';
import './General.scss';
const GroupsQuery = `
  query Query {
    attributeGroups {
      items {
        value: attributeGroupId
        label: groupName
      }
    }
  }
`;
const Groups = ({ groups, createGroupApi })=>{
    const [result, reexecuteQuery] = useQuery({
        query: GroupsQuery
    });
    const { control } = useFormContext();
    const newGroup = React.useRef(null);
    const [createGroupError, setCreateGroupError] = React.useState(null);
    const { data, fetching, error } = result;
    const createGroup = ()=>{
        if (!newGroup.current?.value) {
            setCreateGroupError(_('Group name is required'));
            return;
        }
        fetch(createGroupApi, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group_name: newGroup.current.value
            })
        }).then((response)=>response.json()).then((jsonData)=>{
            if (!jsonData.error) {
                newGroup.current.value = '';
                setCreateGroupError(null);
                reexecuteQuery({
                    requestPolicy: 'network-only'
                });
            } else {
                setCreateGroupError(jsonData.error.message);
            }
        });
    };
    if (fetching) return /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(Spinner, {
        width: 20,
        height: 20
    }));
    if (error) {
        return /*#__PURE__*/ React.createElement("p", {
            className: "text-destructive"
        }, error.message);
    }
    return /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("div", {
        className: "mb-2"
    }, _('Select groups the attribute belongs to')), /*#__PURE__*/ React.createElement("div", {
        className: "grid gap-5 grid-cols-2"
    }, /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement(Controller, {
        name: "groups",
        control: control,
        defaultValue: groups.map((group)=>group.value),
        render: ({ field })=>/*#__PURE__*/ React.createElement(Select, {
                ...field,
                options: data.attributeGroups.items,
                hideSelectedOptions: true,
                isMulti: true,
                onChange: (selectedOptions)=>{
                    field.onChange(selectedOptions.map((option)=>option.value) || []);
                },
                value: data.attributeGroups.items.filter((item)=>field.value.includes(item.value))
            })
    })), /*#__PURE__*/ React.createElement("div", {
        className: "grid gap-5 grid-cols-1"
    }, /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("div", {
        className: "flex gap-5"
    }, /*#__PURE__*/ React.createElement(InputGroup, {
        className: "max-w-xs"
    }, /*#__PURE__*/ React.createElement(InputGroupInput, {
        type: "text",
        placeholder: _('Create a new group'),
        ref: newGroup
    }), /*#__PURE__*/ React.createElement(InputGroupAddon, {
        align: "inline-end"
    }, /*#__PURE__*/ React.createElement("a", {
        className: "flex w-8 items-center justify-center text-primary",
        href: "#",
        onClick: (e)=>{
            e.preventDefault();
            createGroup();
        }
    }, /*#__PURE__*/ React.createElement(PlusCircle, {
        className: "size-4"
    }))))), createGroupError && /*#__PURE__*/ React.createElement("p", {
        className: "text-destructive text-xs mt-1"
    }, createGroupError)))));
};
const Options = ({ originOptions = [] })=>{
    const { control } = useFormContext();
    const { fields, append, remove, replace } = useFieldArray({
        name: 'options',
        control
    });
    React.useEffect(()=>{
        replace(originOptions.map((option)=>({
                option_text: option.optionText,
                option_id: option.optionId,
                uuid: option.uuid
            })));
    }, []);
    const addOption = (e)=>{
        e.preventDefault();
        append({
            option_text: '',
            option_id: (Math.floor(Math.random() * (9000000 - 1000000)) + 1000000).toString(),
            uuid: uuidv4()
        });
    };
    return /*#__PURE__*/ React.createElement("div", {
        className: "attribute-edit-options"
    }, fields.map((field, index)=>{
        return /*#__PURE__*/ React.createElement("div", {
            key: field.id,
            className: "flex items-center mb-2 space-x-5"
        }, /*#__PURE__*/ React.createElement("div", {
            className: "flex-1"
        }, /*#__PURE__*/ React.createElement(InputField, {
            name: `options.${index}.option_text`,
            placeholder: _('Option text'),
            validation: {
                required: _('Option text is required')
            }
        }), /*#__PURE__*/ React.createElement(InputField, {
            type: "hidden",
            name: `options.${index}.option_id`
        })), /*#__PURE__*/ React.createElement("div", {
            className: "self-center"
        }, /*#__PURE__*/ React.createElement(Button, {
            type: "button",
            onClick: (e)=>{
                e.preventDefault();
                remove(index);
            },
            variant: 'destructive'
        }, _('Remove'))));
    }), /*#__PURE__*/ React.createElement("div", {
        className: "mt-2"
    }, /*#__PURE__*/ React.createElement(Button, {
        type: "button",
        onClick: addOption,
        variant: 'outline'
    }, _('Add option'))));
};
export default function General({ attribute, createGroupApi }) {
    const [type] = React.useState(attribute?.type || 'text');
    return /*#__PURE__*/ React.createElement(Card, null, /*#__PURE__*/ React.createElement(CardHeader, null, /*#__PURE__*/ React.createElement(CardTitle, null, _('General')), /*#__PURE__*/ React.createElement(CardDescription, null, _('Manage the general information of the attribute.'))), /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement("div", {
        className: "space-y-2"
    }, /*#__PURE__*/ React.createElement(InputField, {
        name: "attribute_name",
        label: _('Name'),
        placeholder: _('Enter attribute name'),
        required: true,
        defaultValue: attribute?.attributeName,
        validation: {
            required: _('Attribute name is required')
        }
    }), /*#__PURE__*/ React.createElement(InputField, {
        name: "attribute_code",
        label: _('Code'),
        placeholder: _('Enter attribute code'),
        required: true,
        defaultValue: attribute?.attributeCode,
        validation: {
            required: _('Attribute code is required')
        },
        helperText: _('Attribute code is used in API and must be unique')
    }), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("div", {
        className: "space-y-2"
    }, /*#__PURE__*/ React.createElement(RadioGroupField, {
        name: "type",
        options: [
            {
                label: _('Text'),
                value: 'text'
            },
            {
                label: _('Select list'),
                value: 'select'
            },
            {
                label: _('Multiselect'),
                value: 'multiselect'
            },
            {
                label: _('Textarea'),
                value: 'textarea'
            }
        ],
        label: _('Type'),
        defaultValue: attribute?.type,
        required: true,
        disabled: !!attribute?.attributeId,
        validation: {
            required: _('Type is required')
        }
    }))))), [
        'select',
        'multiselect'
    ].includes(type) && /*#__PURE__*/ React.createElement(CardContent, {
        title: _('Attribute options')
    }, /*#__PURE__*/ React.createElement(Options, {
        originOptions: get(attribute, 'options', [])
    })), /*#__PURE__*/ React.createElement(CardContent, {
        title: _('Attribute Group')
    }, /*#__PURE__*/ React.createElement(Groups, {
        groups: get(attribute, 'groups.items', []),
        createGroupApi: createGroupApi
    })));
}
export const layout = {
    areaId: 'leftSide',
    sortOrder: 10
};
export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeId
      attributeName
      attributeCode
      type
      options {
        optionId: attributeOptionId
        uuid
        optionText
      }
      groups {
        items {
          value: attributeGroupId
          label: groupName
        }
      }
    }
    createGroupApi: url(routeId: "createAttributeGroup")
  }
`;
