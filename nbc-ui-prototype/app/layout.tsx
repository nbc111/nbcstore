import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StoreProvider } from "@/lib/store"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "NBCShop — 连接钱包，NBC 支付",
  description:
    "无需注册的单商户加密商城。连接钱包，浏览商品，使用 NBC 代币一键签名支付。",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="bg-background">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <StoreProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </StoreProvider>
      </body>
    </html>
  )
}
