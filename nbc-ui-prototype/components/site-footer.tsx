import Link from "next/link"
import { NBC_RATE } from "@/lib/data"

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
                N
              </span>
              <span className="text-lg font-semibold">
                NBC<span className="text-primary">Shop</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              无需注册的加密商城。连接钱包，使用 NBC 代币一键签名支付。
            </p>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              当前汇率 · 1 NBC = ¥{NBC_RATE.toFixed(2)}
            </p>
          </div>

          {[
            { title: "商城", links: ["全部商品", "硬件钱包", "矿机设备", "数字藏品"] },
            { title: "支持", links: ["帮助中心", "退款政策", "物流查询", "联系我们"] },
            { title: "关于", links: ["品牌故事", "安全审计", "条款", "隐私"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-medium">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 NBCShop. 设计原型，仅供演示。</p>
          <p className="font-mono">Powered by NBC Wallet · ethers.js v6</p>
        </div>
      </div>
    </footer>
  )
}
