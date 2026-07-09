import { notFound } from "next/navigation"
import Link from "next/link"
import { getProduct, PRODUCTS } from "@/lib/data"
import { ProductDetail } from "@/components/product-detail"
import { ProductCard } from "@/components/product-card"

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }))
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = getProduct(id)
  if (!product) notFound()

  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)
  const fallback = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4)
  const recommend = related.length ? related : fallback

  return (
    <div>
      <ProductDetail product={product} />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">相关推荐</h2>
          <Link href="/#products" className="text-sm text-muted-foreground hover:text-foreground">
            查看全部
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {recommend.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  )
}
