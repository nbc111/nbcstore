"use client"

import Link from "next/link"
import Image from "next/image"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"
import { useStore } from "@/lib/store"
import { cnyToNbc, formatCny, formatNbc } from "@/lib/data"
import { NbcPrice } from "@/components/nbc-price"

export default function CartPage() {
  const { cart, updateQty, removeFromCart, cartTotalCny, cartCount } = useStore()
  const shippingCny = cart.length ? 0 : 0
  const totalCny = cartTotalCny + shippingCny

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">购物车是空的</h1>
        <p className="mt-2 text-muted-foreground">去挑几件好物，用 NBC 支付吧</p>
        <Link
          href="/#products"
          className="mt-6 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          去逛逛 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">购物车</h1>
      <p className="mt-1 text-muted-foreground">共 {cartCount} 件商品</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.map((line) => (
            <div key={line.product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
              <Link
                href={`/product/${line.product.id}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary/40"
              >
                <Image src={line.product.image} alt={line.product.name} fill className="object-cover" sizes="96px" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/product/${line.product.id}`} className="font-medium hover:text-primary">
                      {line.product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{line.product.tagline}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(line.product.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    aria-label="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div className="flex items-center rounded-full border border-border">
                    <button onClick={() => updateQty(line.product.id, line.qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent" aria-label="减少">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono text-sm">{line.qty}</span>
                    <button onClick={() => updateQty(line.product.id, line.qty + 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent" aria-label="增加">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-primary">{formatNbc(cnyToNbc(line.product.priceCny * line.qty))} <span className="text-xs text-primary/70">NBC</span></p>
                    <p className="text-xs text-muted-foreground">≈ ¥{formatCny(line.product.priceCny * line.qty)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">订单摘要</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品小计</span>
                <span className="font-mono">{formatNbc(cnyToNbc(cartTotalCny))} NBC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">运费</span>
                <span className="text-primary">免运费</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-end justify-between">
                  <span className="font-medium">合计</span>
                  <NbcPrice cny={totalCny} size="md" className="items-end text-right" />
                </div>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-95"
            >
              去结算 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/#products" className="mt-3 block text-center text-sm text-muted-foreground hover:text-foreground">
              继续购物
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
