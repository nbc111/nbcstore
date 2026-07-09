"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, Star, ShieldCheck, Truck, RotateCcw, Check, Wallet } from "lucide-react"
import type { Product } from "@/lib/data"
import { NbcPrice } from "./nbc-price"
import { useStore } from "@/lib/store"

export function ProductDetail({ product }: { product: Product }) {
  const { addToCart, connected, connect } = useStore()
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [active, setActive] = useState(0)
  const [added, setAdded] = useState(false)

  const thumbs = [product.image, product.image, product.image]

  function handleAdd() {
    addToCart(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  function handleBuyNow() {
    addToCart(product, qty)
    if (!connected) connect()
    router.push("/checkout")
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">商城</Link>
        <span>/</span>
        <span>{product.category}</span>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/40">
            <Image src={thumbs[active] || "/placeholder.svg"} alt={product.name} fill className="object-cover" sizes="600px" priority />
            {product.badge && (
              <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {product.badge}
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            {thumbs.map((t, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative h-20 w-20 overflow-hidden rounded-xl border bg-secondary/40 transition-colors ${
                  active === i ? "border-primary" : "border-border"
                }`}
              >
                <Image src={t || "/placeholder.svg"} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
            {product.category}
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{product.name}</h1>
          <p className="mt-2 text-muted-foreground">{product.tagline}</p>

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-primary text-primary" /> {product.rating}
            </span>
            <span>已售 {product.sold.toLocaleString()}</span>
            <span>库存 {product.stock}</span>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <NbcPrice cny={product.priceCny} size="lg" />
            <p className="mt-2 font-mono text-xs text-muted-foreground">结算时按当前汇率锁定 · 1 NBC = ¥0.01</p>
          </div>

          {/* Qty */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">数量</span>
            <div className="flex items-center rounded-full border border-border bg-card">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent" aria-label="减少">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-mono text-sm">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent" aria-label="增加">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:border-primary/50"
            >
              {added ? <><Check className="h-4 w-4 text-primary" /> 已加入</> : <>加入购物车</>}
            </button>
            <button
              onClick={handleBuyNow}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-95"
            >
              <Wallet className="h-4 w-4" /> NBC 立即购买
            </button>
          </div>

          {/* Trust */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, t: "正品保障" },
              { icon: Truck, t: "顺丰包邮" },
              { icon: RotateCcw, t: "7 天无理由" },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
                <x.icon className="h-4 w-4 text-primary" /> {x.t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description + specs */}
      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold">商品详情</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">{product.description}</p>
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium">为什么用 NBC 支付？</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {["连接钱包即可下单，无需注册与实名", "签名即授权，私钥永不离开你的设备", "余额内部流转，结算即时到账"].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {li}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold">规格参数</h2>
          <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {product.specs.map((s) => (
              <div key={s.label} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
