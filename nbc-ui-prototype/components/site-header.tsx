"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Search, Menu, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { WalletConnect } from "./wallet-connect"
import { useState } from "react"

const NAV = [
  { href: "/", label: "商城首页" },
  { href: "/#products", label: "全部商品" },
  { href: "/wallet", label: "钱包中心" },
]

export function SiteHeader() {
  const { cartCount } = useStore()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[#0c0d10]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary">
            <span className="font-mono text-[13px] font-black tracking-tighter text-primary-foreground">N</span>
            <span className="absolute inset-0 shimmer rounded-lg" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            NBC<span className="text-primary">Shop</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-8 hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => {
            const active = item.href === pathname
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Search */}
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 lg:flex">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            placeholder="搜索商品…"
            className="w-44 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Cart */}
        <Link
          href="/cart"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary/40"
          aria-label={`购物车 ${cartCount > 0 ? `(${cartCount})` : ""}`}
        >
          <ShoppingBag className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {cartCount}
            </span>
          )}
        </Link>

        {/* Wallet */}
        <div className="hidden sm:block">
          <WalletConnect />
        </div>

        {/* Mobile menu toggle */}
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="菜单"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t border-border bg-card/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-border pt-3 sm:hidden">
              <WalletConnect />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
