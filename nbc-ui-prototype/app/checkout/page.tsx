"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Wallet, Fingerprint, ShieldCheck, Check, ChevronLeft, CircleCheck, AlertCircle, Copy } from "lucide-react"
import { useStore } from "@/lib/store"
import { cnyToNbc, formatCny, formatNbc } from "@/lib/data"

type Phase = "form" | "signing" | "success"

export default function CheckoutPage() {
  const { cart, cartTotalCny, connected, address, balance, connect, clearCart } = useStore()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("form")
  const [orderId] = useState(() => "NBC-2026-" + Math.floor(1000 + Math.random() * 9000))

  const totalNbc = cnyToNbc(cartTotalCny)
  const enough = balance >= totalNbc
  const remaining = balance - totalNbc

  function handlePay() {
    if (!connected) {
      connect()
      return
    }
    setPhase("signing")
    setTimeout(() => {
      setPhase("success")
    }, 2600)
  }

  if (cart.length === 0 && phase !== "success") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">购物车是空的</h1>
        <Link href="/#products" className="mt-4 inline-block rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
          去逛逛
        </Link>
      </div>
    )
  }

  if (phase === "success") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <CircleCheck className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">支付成功</h1>
        <p className="mt-2 text-muted-foreground">NBC 已从钱包扣除，订单已提交商家发货</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-left">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">订单号</span>
            <span className="flex items-center gap-2 font-mono text-sm">{orderId} <Copy className="h-3.5 w-3.5 text-muted-foreground" /></span>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">支付金额</span>
              <span className="font-mono font-semibold text-primary">{formatNbc(totalNbc)} NBC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">交易哈希</span>
              <span className="font-mono text-xs">0x9a3f…c72e</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">钱包余额</span>
              <span className="font-mono">{formatNbc(remaining)} NBC</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/wallet" onClick={() => clearCart()} className="flex-1 rounded-full border border-border bg-card py-3 text-sm font-medium hover:border-primary/50">
            查看订单
          </Link>
          <Link href="/#products" onClick={() => clearCart()} className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
            继续购物
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/cart" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> 返回购物车
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">结算</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Shipping */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">收货信息</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="收货人" placeholder="请输入姓名" />
              <Field label="手机号" placeholder="用于物流通知" />
              <div className="sm:col-span-2">
                <Field label="收货地址" placeholder="省 / 市 / 区 / 详细地址" />
              </div>
            </div>
          </section>

          {/* Payment method */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">支付方式</h2>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">NBC 钱包支付</p>
                <p className="text-xs text-muted-foreground">
                  {connected ? <>已连接 · <span className="font-mono">{address}</span></> : "尚未连接钱包"}
                </p>
              </div>
              <Check className="h-5 w-5 text-primary" />
            </div>

            {connected && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
                <span className="text-muted-foreground">钱包余额</span>
                <span className={`font-mono font-semibold ${enough ? "text-foreground" : "text-destructive"}`}>
                  {formatNbc(balance)} NBC
                </span>
              </div>
            )}

            {connected && !enough && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> 余额不足，请先充值 NBC
              </div>
            )}
          </section>

          {/* Signature notice */}
          <section className="flex items-start gap-3 rounded-2xl border border-border bg-card p-6">
            <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-medium">签名即支付</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                点击支付后，钱包会弹出签名请求。签名用于授权本次扣款，私钥不会离开你的设备，全程无 Gas 费用。
              </p>
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">订单明细</h2>
            <div className="mt-4 space-y-3">
              {cart.map((line) => (
                <div key={line.product.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary/40">
                    <Image src={line.product.image} alt={line.product.name} fill className="object-cover" sizes="48px" />
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {line.qty}
                    </span>
                  </div>
                  <p className="line-clamp-1 flex-1 text-sm">{line.product.name}</p>
                  <span className="font-mono text-sm">{formatNbc(cnyToNbc(line.product.priceCny * line.qty))}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>商品小计</span>
                <span className="font-mono">{formatNbc(totalNbc)} NBC</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>运费</span>
                <span className="text-primary">免运费</span>
              </div>
              <div className="flex items-end justify-between pt-2">
                <span className="font-medium">应付</span>
                <div className="text-right">
                  <p className="font-mono text-2xl font-semibold text-primary">{formatNbc(totalNbc)}<span className="ml-1 text-sm text-primary/70">NBC</span></p>
                  <p className="text-xs text-muted-foreground">≈ ¥{formatCny(cartTotalCny)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={connected && !enough}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connected ? <><Fingerprint className="h-4 w-4" /> 签名支付</> : <><Wallet className="h-4 w-4" /> 连接钱包支付</>}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 交易加密 · 审计可查
            </p>
          </div>
        </div>
      </div>

      {/* Signing overlay */}
      {phase === "signing" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/20 animate-pulse-ring" />
              <Fingerprint className="h-9 w-9 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">等待钱包签名…</h3>
            <p className="mt-2 text-sm text-muted-foreground">请在钱包弹窗中确认，授权扣除</p>
            <p className="mt-4 font-mono text-2xl font-semibold text-primary">{formatNbc(totalNbc)} NBC</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> 正在验证签名
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
      />
    </label>
  )
}
