import { _ } from '@evershop/evershop/lib/locale/translate/_';
export var Operator = /*#__PURE__*/ function(Operator) {
    Operator["EQUAL"] = "=";
    Operator["NOT_EQUAL"] = "!=";
    Operator["GREATER"] = ">";
    Operator["GREATER_OR_EQUAL"] = ">=";
    Operator["SMALLER"] = "<";
    Operator["SMALLER_OR_EQUAL"] = "<=";
    Operator["IN"] = "IN";
    Operator["NOT_IN"] = "NOT IN";
    return Operator;
}({});
const optionDefs = [
    {
        key: 'category',
        label: 'Category'
    },
    {
        key: 'collection',
        label: 'Collection'
    },
    {
        key: 'attribute_group',
        label: 'Attribute Group'
    },
    {
        key: 'sku',
        label: 'Sku'
    },
    {
        key: 'price',
        label: 'Price'
    }
];
const operatorDefs = [
    {
        key: "=",
        label: 'Equal'
    },
    {
        key: "!=",
        label: 'Not equal'
    },
    {
        key: ">",
        label: 'Greater'
    },
    {
        key: ">=",
        label: 'Greater or equal'
    },
    {
        key: "<",
        label: 'Smaller'
    },
    {
        key: "<=",
        label: 'Equal or smaller'
    },
    {
        key: "IN",
        label: 'In'
    },
    {
        key: "NOT IN",
        label: 'Not in'
    }
];
export const options = optionDefs.map((o)=>({
        ...o,
        label: _(o.label)
    }));
export const operators = operatorDefs.map((o)=>({
        ...o,
        label: _(o.label)
    }));
