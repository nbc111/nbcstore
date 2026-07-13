import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@evershop/evershop/components/common/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@evershop/evershop/components/common/ui/Table';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

type WalletAsset = {
  symbol: string;
  displayName: string;
  chainId?: number | null;
  assetType: string;
  tokenAddress?: string | null;
  tokenDecimals: number;
};

type Props = {
  nbcWalletPublicConfig: {
    onchainEnabled: boolean;
    depositMode?: string | null;
    treasuryAddress?: string | null;
    assets?: WalletAsset[];
  };
};

function tokenAddressText(asset: WalletAsset) {
  if (asset.assetType === 'native') {
    return 'Native NBC';
  }
  return asset.tokenAddress || '-';
}

export default function NbcWalletAssetGrid({ nbcWalletPublicConfig }: Props) {
  const assets = nbcWalletPublicConfig.assets || [];

  return (
    <Card className="">
      <CardHeader className="">
        <CardTitle className="text-xl">支持币种</CardTitle>
        <div className="text-sm text-muted-foreground">
          扫链：{nbcWalletPublicConfig.onchainEnabled ? '已启用' : '未启用'}，
          入金模式：{nbcWalletPublicConfig.depositMode || '-'}
        </div>
      </CardHeader>
      <CardContent className="">
        <Table className="">
          <TableHeader className="">
            <TableRow className="">
              <TableHead className="">币种</TableHead>
              <TableHead className="">链 ID</TableHead>
              <TableHead className="">类型</TableHead>
              <TableHead className="">Token 地址</TableHead>
              <TableHead className="">精度</TableHead>
              <TableHead className="">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="">
            {assets.length === 0 && (
              <TableRow className="">
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  暂无支持币种配置
                </TableCell>
              </TableRow>
            )}
            {assets.map((asset) => (
              <TableRow className="" key={asset.symbol}>
                <TableCell className="font-semibold">
                  {asset.displayName || asset.symbol}
                </TableCell>
                <TableCell className="font-mono">{asset.chainId || '-'}</TableCell>
                <TableCell className="uppercase">{asset.assetType}</TableCell>
                <TableCell className="max-w-[460px] break-all font-mono text-xs">
                  {tokenAddressText(asset)}
                </TableCell>
                <TableCell className="font-mono">{asset.tokenDecimals}</TableCell>
                <TableCell className="">
                  <span className="inline-flex rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700">
                    已支持
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query {
    nbcWalletPublicConfig {
      onchainEnabled
      depositMode
      treasuryAddress
      assets {
        symbol
        displayName
        chainId
        assetType
        tokenAddress
        tokenDecimals
      }
    }
  }
`;
