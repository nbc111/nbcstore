"use client"

import { useState } from "react"
import { CATEGORIES, PRODUCTS } from "@/lib/data"
import { ProductCard } from "./product-card"

export function ProductGrid() {
  const [active, setActive] = useState("全部")
  const list = active === "全部" ? PRODUCTS : PRODUCTS.filter((p) => p.category === active)

  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Marketplace</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">精选好物 · NBC 直付</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
