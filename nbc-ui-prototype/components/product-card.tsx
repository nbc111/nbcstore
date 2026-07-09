"use client"

import Link from "next/link"
import Image from "next/image"
import { Plus, Star } from "lucide-react"
import type { Product } from "@/lib/data"
import { NbcPrice } from "./nbc-price"
import { useStore } from "@/lib/store"

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore()

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
      <Link href={`/product/${product.id}`} className="relative block aspect-square overflow-hidden bg-secondary/40">
        <Image
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            {product.badge}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full border border-border bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground backdrop-blur">
          {product.category}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.id}`}>
          <h3 className="line-clamp-1 font-medium transition-colors group-hover:text-primary">{product.name}</h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{product.tagline}</p>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {product.rating}
          </span>
          <span>已售 {product.sold.toLocaleString()}</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <NbcPrice cny={product.priceCny} size="md" />
          <button
            onClick={() => addToCart(product)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-90"
            aria-label={`加入购物车 ${product.name}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
