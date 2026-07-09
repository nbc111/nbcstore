"use client"

import { useState } from "react"
import Link from "next/link"
import { Wallet, LogOut, Copy, ChevronRight, X, ShieldCheck } from "lucide-react"
import { useStore } from "@/lib/store"
import { formatNbc } from "@/lib/data"

const WALLETS = [
  { name: "MetaMask", desc: "最流行的浏览器钱包", tag: "推荐" },
  { name: "WalletConnect", desc: "扫码连接移动端钱包" },
  { name: "OKX Wallet", desc: "多链一体钱包" },
  { name: "Coinbase Wallet", desc: "合规友好" },
]

export function WalletConnect() {
  const { connected, address, balance, connect, disconnect } = useStore()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [signing, setSigning] = useState(false)

  function handleSelect() {
    setSigning(true)
    setTimeout(() => {
      connect()
      setSigning(false)
      setOpen(false)
    }, 1400)
  }

  if (connected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setMenu((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/50"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-60 animate-pulse-ring" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-xs">{address}</span>
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
              <div className="border-b border-border p-4">
                <p className="text-xs text-muted-foreground">NBC 余额</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-primary">{formatNbc(balance)}</p>
              </div>
              <div className="p-1.5">
                <Link
                  href="/wallet"
                  onClick={() => setMenu(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                >
                  <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> 钱包中心</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent">
                  <Copy className="h-4 w-4" /> 复制地址
                </button>
                <button
                  onClick={() => { disconnect(); setMenu(false) }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" /> 断开连接
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
      >
        <Wallet className="h-4 w-4" />
        连接钱包
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !signing && setOpen(false)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-lg font-semibold">连接钱包</h3>
                <p className="text-sm text-muted-foreground">选择一个钱包以继续</p>
              </div>
              <button onClick={() => !signing && setOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            {signing ? (
              <div className="flex flex-col items-center gap-4 p-10 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <span className="absolute inline-flex h-16 w-16 rounded-full bg-primary/20 animate-pulse-ring" />
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">请在钱包中确认签名</p>
                  <p className="mt-1 text-sm text-muted-foreground">签名仅用于验证身份，不会产生任何费用</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {WALLETS.map((w) => (
                  <button
                    key={w.name}
                    onClick={handleSelect}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {w.name}
                        {w.tag && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">{w.tag}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{w.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                <p className="px-1 pt-2 text-center text-xs text-muted-foreground">
                  连接即代表同意服务条款。无需注册，签名即登录。
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
