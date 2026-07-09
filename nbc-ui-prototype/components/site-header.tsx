"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Search, Menu } from "lucide-react"
import { useStore } from "@/lib/store"
import { WalletConnect } from "./wallet-connect"
import { useState } from "react"

const NAV = [
  { href: "/", label: "商城" },
  { href: "/#products", label: "全部商品" },
  { href: "/wallet", label: "钱包中心" },
]

export function SiteHeader() {
  const { cartCount } = useStore()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
            N
          </span>
          <span className="text-lg font-semibold tracking-tight">
            NBC<span className="text-primary">Shop</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.href === pathname
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto hidden items-center rounded-full border border-border bg-card px-3 py-1.5 lg:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="搜索商品…"
            className="w-40 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Link
          href="/cart"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary/50"
          aria-label="购物车"
        >
          <ShoppingBag className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </Link>

        <div className="hidden sm:block">
          <WalletConnect />
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="菜单"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col p-4">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 sm:hidden">
              <WalletConnect />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
