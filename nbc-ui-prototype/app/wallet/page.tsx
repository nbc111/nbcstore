"use client"

import { useState } from "react"
import Link from "next/link"
import { Wallet, Copy, ArrowDownLeft, ArrowUpRight, RotateCcw, Plus, Package, TrendingUp, ShieldCheck } from "lucide-react"
import { useStore } from "@/lib/store"
import { formatCny, formatNbc, NBC_RATE, TRANSACTIONS, ORDERS, type Transaction } from "@/lib/data"

const TABS = ["流水记录", "我的订单"] as const

export default function WalletPage() {
  const { connected, address, balance, connect } = useStore()
  const [tab, setTab] = useState<(typeof TABS)[number]>("流水记录")

  if (!connected) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">连接钱包以查看账户</h1>
        <p className="mt-2 text-muted-foreground">查看 NBC 余额、交易流水与订单历史</p>
        <button
          onClick={connect}
          className="mt-6 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          <Wallet className="h-4 w-4" /> 连接钱包
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">钱包中心</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Balance card */}
        <div className="lg:col-span-2">
          <div className="glow-primary relative overflow-hidden rounded-3xl border border-border bg-card p-7">
            <div className="absolute inset-0 bg-grid opacity-30" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-60 animate-pulse-ring" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  已连接
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1 font-mono text-xs backdrop-blur">
                  {address} <Copy className="h-3 w-3 text-muted-foreground" />
                </span>
              </div>

              <p className="mt-8 text-sm text-muted-foreground">NBC 余额</p>
              <div className="mt-1 flex items-end gap-3">
                <span className="font-mono text-5xl font-semibold text-primary">{formatNbc(balance)}</span>
                <span className="pb-1.5 font-mono text-sm text-primary/70">NBC</span>
              </div>
              <p className="mt-1 font-mono text-sm text-muted-foreground">≈ ¥{formatCny(balance * NBC_RATE)}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95">
                  <Plus className="h-4 w-4" /> 充值 NBC
                </button>
                <button className="flex items-center gap-2 rounded-full border border-border bg-background/50 px-5 py-2.5 text-sm font-medium backdrop-blur transition-colors hover:border-primary/50">
                  <ArrowUpRight className="h-4 w-4" /> 提现
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          {[
            { icon: TrendingUp, label: "累计消费", value: "1,296,800 NBC" },
            { icon: Package, label: "订单总数", value: String(ORDERS.length) + " 笔" },
            { icon: ShieldCheck, label: "冻结余额", value: "0 NBC" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-mono text-sm font-semibold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-3 text-sm transition-colors ${
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        {tab === "流水记录" ? (
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {TRANSACTIONS.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {ORDERS.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1.5 font-medium">{o.title}</p>
                  <p className="text-sm text-muted-foreground">{o.date} · {o.items} 件商品</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-semibold text-primary">{formatNbc(o.total)} NBC</p>
                    <p className="text-xs text-muted-foreground">≈ ¥{formatCny(o.total * NBC_RATE)}</p>
                  </div>
                  <Link href="/#products" className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-primary/50">
                    详情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TxRow({ tx }: { tx: Transaction }) {
  const map = {
    credit: { icon: ArrowDownLeft, cls: "text-primary bg-primary/15" },
    debit: { icon: ArrowUpRight, cls: "text-foreground bg-secondary" },
    refund: { icon: RotateCcw, cls: "text-primary bg-primary/15" },
  }[tx.type]
  const Icon = map.icon

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${map.cls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{tx.title}</p>
        <p className="font-mono text-xs text-muted-foreground">{tx.time} · {tx.id}</p>
      </div>
      <div className="text-right">
        <p className={`font-mono text-sm font-semibold ${tx.amount > 0 ? "text-primary" : "text-foreground"}`}>
          {tx.amount > 0 ? "+" : ""}{formatNbc(tx.amount)}
        </p>
        <p className="text-xs text-muted-foreground">{tx.status}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "已完成"
      ? "bg-primary/15 text-primary"
      : status === "运输中"
        ? "bg-secondary text-foreground"
        : "border border-border text-muted-foreground"
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>
}
