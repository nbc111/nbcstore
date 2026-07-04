import Area from '@components/common/Area';
import { Card } from '@components/common/ui/Card';
import { CardContent, CardTitle } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import PropTypes from 'prop-types';
import React from 'react';
function FullName({ fullName }) {
    return /*#__PURE__*/ React.createElement(CardContent, null, /*#__PURE__*/ React.createElement(CardTitle, {
        className: "mb-2"
    }, _('Full Name')), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("span", null, fullName)));
}
FullName.propTypes = {
    fullName: PropTypes.string.isRequired
};
function Group({ group }) {
    return /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-3 border-t border-border"
    }, /*#__PURE__*/ React.createElement(CardTitle, {
        className: "mb-2"
    }, _('Group')), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("span", null, group?.groupName || _('Default'))));
}
Group.propTypes = {
    group: PropTypes.shape({
        groupName: PropTypes.string
    }).isRequired
};
function Email({ email }) {
    return /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-3 border-t border-border min-w-0"
    }, /*#__PURE__*/ React.createElement(CardTitle, {
        className: "mb-2"
    }, _('Email')), /*#__PURE__*/ React.createElement("div", {
        className: "min-w-0"
    }, /*#__PURE__*/ React.createElement("span", {
        className: "block break-all"
    }, email)));
}
Email.propTypes = {
    email: PropTypes.string.isRequired
};
function Status({ status }) {
    return /*#__PURE__*/ React.createElement(CardContent, {
        className: "pt-3 border-t border-border"
    }, /*#__PURE__*/ React.createElement(CardTitle, {
        className: "mb-2"
    }, _('Status')), /*#__PURE__*/ React.createElement("div", null, /*#__PURE__*/ React.createElement("span", null, parseInt(status, 10) === 1 ? _('Enabled') : _('Disabled'))));
}
Status.propTypes = {
    status: PropTypes.number.isRequired
};
export default function General({ customer }) {
    return /*#__PURE__*/ React.createElement(Card, null, /*#__PURE__*/ React.createElement(Area, {
        id: "customerEditInformation",
        className: "space-y-3",
        coreComponents: [
            {
                component: {
                    default: ()=>/*#__PURE__*/ React.createElement(FullName, {
                            fullName: customer.fullName
                        })
                },
                sortOrder: 10
            },
            {
                component: {
                    default: ()=>/*#__PURE__*/ React.createElement(Email, {
                            email: customer.email
                        })
                },
                sortOrder: 15
            },
            {
                component: {
                    default: ()=>/*#__PURE__*/ React.createElement(Group, {
                            group: customer.group
                        })
                },
                sortOrder: 20
            },
            {
                component: {
                    default: ()=>/*#__PURE__*/ React.createElement(Status, {
                            status: customer.status
                        })
                },
                sortOrder: 25
            }
        ]
    }));
}
General.propTypes = {
    customer: PropTypes.shape({
        email: PropTypes.string,
        fullName: PropTypes.string,
        group: PropTypes.shape({
            groupName: PropTypes.string
        }),
        status: PropTypes.number
    }).isRequired
};
export const layout = {
    areaId: 'rightSide',
    sortOrder: 10
};
export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      customerId
      fullName
      email
      status
      group {
        groupName
      }
    }
  }
`;
