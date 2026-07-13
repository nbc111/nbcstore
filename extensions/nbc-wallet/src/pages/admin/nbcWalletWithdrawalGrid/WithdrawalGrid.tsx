import { Button } from '@evershop/evershop/components/common/ui/Button';
import {
  Card,
  CardContent,
  CardHeader
} from '@evershop/evershop/components/common/ui/Card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@evershop/evershop/components/common/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@evershop/evershop/components/common/ui/Table';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { Check, RefreshCw, Send, X } from 'lucide-react';
import React from 'react';
import { toast } from 'react-toastify';

type WithdrawalStatus =
  | 'requested'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed';

type Withdrawal = {
  withdrawalId: number;
  uuid: string;
  walletId: number;
  customerId: number;
  customerEmail?: string | null;
  walletAddress: string;
  assetSymbol?: string | null;
  amount: number;
  txHash?: string | null;
  status: WithdrawalStatus;
  errorMessage?: string | null;
  requestedAt?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  createdAt?: string | null;
};

type ApiResponse = {
  items: Withdrawal[];
  pagination?: {
    total: number;
  };
};

const statuses: Array<{ label: string; value: 'all' | WithdrawalStatus }> = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'requested' },
  { label: '已审核', value: 'approved' },
  { label: '打款中', value: 'processing' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' }
];

function compactAddress(address?: string | null) {
  if (!address) {
    return '-';
  }
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function statusClassName(status: WithdrawalStatus) {
  if (status === 'completed') return 'bg-green-500/10 text-green-700';
  if (status === 'failed') return 'bg-red-500/10 text-red-700';
  if (status === 'processing') return 'bg-amber-500/10 text-amber-700';
  if (status === 'approved') return 'bg-slate-100 text-slate-700';
  return 'border border-border text-foreground';
}

function statusText(status: WithdrawalStatus) {
  if (status === 'requested') return '待审核';
  if (status === 'approved') return '已审核';
  if (status === 'processing') return '打款中';
  if (status === 'completed') return '已完成';
  if (status === 'failed') return '失败';
  return status;
}

async function parseApi<T>(request: Promise<{ data: { data?: T; error?: { message?: string } } }>) {
  const response = await request;
  if (response.data?.error) {
    throw new Error(response.data.error.message || 'Request failed');
  }
  return response.data?.data as T;
}

export default function NbcWalletWithdrawalGrid({
  listApi,
  approveApi,
  processApi,
  failApi
}: {
  listApi: string;
  approveApi: string;
  processApi: string;
  failApi: string;
}) {
  const [status, setStatus] = React.useState<'all' | WithdrawalStatus>('all');
  const [items, setItems] = React.useState<Withdrawal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [actingUuid, setActingUuid] = React.useState('');

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(listApi, window.location.origin);
      url.searchParams.set('limit', '50');
      if (status !== 'all') {
        url.searchParams.set('status', status);
      }
      const data = await parseApi<ApiResponse>(axios.get(url.toString()));
      setItems(data?.items || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : _('Failed to load withdrawals'));
    } finally {
      setLoading(false);
    }
  }, [listApi, status]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const runAction = React.useCallback(
    async (uuid: string, action: 'approve' | 'process' | 'fail') => {
      const endpoint =
        action === 'approve' ? approveApi : action === 'process' ? processApi : failApi;
      const body: { withdrawal_uuid: string; reason?: string } = {
        withdrawal_uuid: uuid
      };
      if (action === 'fail') {
        const reason = window.prompt(_('Reason'));
        if (!reason) {
          return;
        }
        body.reason = reason;
      }
      setActingUuid(uuid);
      try {
        await parseApi(axios.post(endpoint, body));
        toast.success(_('Withdrawal updated'));
        await loadItems();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : _('Failed to update withdrawal'));
      } finally {
        setActingUuid('');
      }
    },
    [approveApi, failApi, loadItems, processApi]
  );

  return (
    <Card className="">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(value) => setStatus(value as 'all' | WithdrawalStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue className="" />
            </SelectTrigger>
            <SelectContent className="">
              <SelectGroup className="">
                {statuses.map((item) => (
                  <SelectItem className="" key={item.value} value={item.value}>
                    {_(item.label)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            className=""
            type="button"
            variant="outline"
            onClick={() => loadItems()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="">
        <Table className="">
          <TableHeader className="">
            <TableRow className="">
              <TableHead className="">ID</TableHead>
              <TableHead className="">客户</TableHead>
              <TableHead className="">钱包 / Hash</TableHead>
              <TableHead className="">金额</TableHead>
              <TableHead className="">状态 / 操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="">
            {items.length === 0 && (
              <TableRow className="">
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {loading ? '加载中...' : '暂无提现记录'}
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => {
              const busy = actingUuid === item.uuid;
              return (
                <TableRow className="" key={item.uuid}>
                  <TableCell className="font-medium">#{item.withdrawalId}</TableCell>
                  <TableCell className="">
                    <div>{item.customerEmail || `#${item.customerId}`}</div>
                    <div className="text-xs text-muted-foreground">wallet #{item.walletId}</div>
                  </TableCell>
                  <TableCell className="max-w-[360px]">
                    <div className="break-all font-mono text-xs" title={item.walletAddress}>
                      {item.walletAddress || '-'}
                    </div>
                    {item.txHash && (
                      <div className="mt-1 break-all text-xs text-muted-foreground">
                        tx: <span className="font-mono" title={item.txHash}>{item.txHash}</span>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.requestedAt || item.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="">
                    {item.amount.toLocaleString()} {item.assetSymbol || 'NBC'}
                  </TableCell>
                  <TableCell className="">
                    <span
                      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${statusClassName(item.status)}`}
                    >
                      {statusText(item.status)}
                    </span>
                    {item.errorMessage && (
                      <div className="mt-1 text-xs text-destructive">{item.errorMessage}</div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.status === 'requested' && (
                        <Button
                          className=""
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => runAction(item.uuid, 'approve')}
                        >
                          <Check className="h-4 w-4" />
                          审核通过
                        </Button>
                      )}
                      {item.status === 'approved' && (
                        <Button
                          className=""
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          onClick={() => runAction(item.uuid, 'process')}
                        >
                          <Send className="h-4 w-4" />
                          打款
                        </Button>
                      )}
                      {(item.status === 'requested' || item.status === 'approved') && (
                        <Button
                          className=""
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => runAction(item.uuid, 'fail')}
                        >
                          <X className="h-4 w-4" />
                          驳回
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
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
    listApi: url(routeId: "nbcWalletAdminWithdrawals")
    approveApi: url(routeId: "nbcWalletApproveWithdrawal")
    processApi: url(routeId: "nbcWalletProcessWithdrawal")
    failApi: url(routeId: "nbcWalletFailWithdrawal")
  }
`;
