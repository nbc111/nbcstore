import { Badge } from '@components/common/ui/Badge.js';
import { TableCell } from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
export function ShipmentStatus({ status }) {
    return /*#__PURE__*/ React.createElement(TableCell, null, /*#__PURE__*/ React.createElement(Badge, {
        variant: status.badge || 'default'
    }, _(status.name)));
}
