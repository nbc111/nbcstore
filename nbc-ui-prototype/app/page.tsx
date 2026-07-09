import Link from "next/link"
import Image from "next/image"
import { ArrowRight, ShieldCheck, Zap, Wallet, Fingerprint } from "lucide-react"
import { ProductGrid } from "@/components/product-grid"
import { PRODUCTS } from "@/lib/data"
import { NbcPrice } from "@/components/nbc-price"

const FEATURES = [
  { icon: Wallet, title: "连接即购", desc: "无需注册账号，连接钱包一键开买" },
  { icon: Fingerprint, title: "签名支付", desc: "钱包签名确认，私钥永不离开设备" },
  { icon: Zap, title: "秒级到账", desc: "NBC 内部流转，结算即时完成" },
  { icon: ShieldCheck, title: "资产托管", desc: "半托管模式 + 审计日志，安心可查" },
]

export default function HomePage() {
  const featured = PRODUCTS[0]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              无注册 · 单商户加密商城
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              连接钱包，
              <br />
              用 <span className="text-primary">NBC</span> 买下一切
            </h1>
            <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
              浏览硬件钱包、矿机与数字藏品，商品以 NBC 标价。结算时钱包签名确认，余额即时扣减，全程无需注册。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="#products"
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
              >
                开始购物 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/wallet"
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium transition-colors hover:border-primary/50"
              >
                查看钱包中心
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-8">
              {[
                { k: "5,500+", v: "支持币种" },
                { k: "38k", v: "累计订单" },
                { k: "1 NBC", v: "= ¥0.01" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="font-mono text-2xl font-semibold">{s.k}</p>
                  <p className="text-xs text-muted-foreground">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Featured product card */}
          <div className="relative">
            <div className="glow-primary relative overflow-hidden rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">今日精选</span>
                <span className="font-mono text-xs text-muted-foreground">#{featured.id}</span>
              </div>
              <div className="relative mx-auto my-4 aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-secondary/40">
                <Image src={featured.image} alt={featured.name} fill className="object-cover" sizes="400px" priority />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{featured.name}</h3>
                  <p className="text-sm text-muted-foreground">{featured.tagline}</p>
                </div>
                <NbcPrice cny={featured.priceCny} size="md" className="items-end text-right" />
              </div>
              <Link
                href={`/product/${featured.id}`}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-95"
              >
                立即查看 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 py-8 pr-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <ProductGrid />
    </div>
  )
}
