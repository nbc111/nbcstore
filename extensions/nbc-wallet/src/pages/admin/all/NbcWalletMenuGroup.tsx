import { NavigationItemGroup } from '@evershop/evershop/components/admin/NavigationItemGroup';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Coins, WalletCards } from 'lucide-react';
import React from 'react';

export default function NbcWalletMenuGroup({
  assetGrid,
  withdrawalGrid
}: {
  assetGrid: string;
  withdrawalGrid: string;
}) {
  const items = [
    {
      Icon: Coins,
      url: assetGrid,
      title: '支持币种'
    },
    {
      Icon: WalletCards,
      url: withdrawalGrid,
      title: '提现审核'
    }
  ] as any;

  return (
    <NavigationItemGroup
      id="nbcWalletMenuGroup"
      name="NBC 钱包"
      items={items}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 35
};

export const query = `
  query Query {
    assetGrid: url(routeId: "nbcWalletAssetGrid")
    withdrawalGrid: url(routeId: "nbcWalletWithdrawalGrid")
  }
`;
