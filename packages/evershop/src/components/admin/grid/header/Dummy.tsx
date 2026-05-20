import { TableCell } from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export function DummyColumnHeader({ title }: { title: string }) {
  return (
    <TableCell>
      <div className="font-medium uppercase text-xs">
        <span>{_(title)}</span>
      </div>
    </TableCell>
  );
}
