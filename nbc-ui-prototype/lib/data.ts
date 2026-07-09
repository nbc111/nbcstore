// NBC exchange rate: 1 NBC = 0.01 CNY  => 100 NBC = 1 CNY
export const NBC_RATE = 0.01

export function cnyToNbc(cny: number): number {
  return Math.floor(cny * (1 / NBC_RATE))
}

export function formatNbc(nbc: number): string {
  return nbc.toLocaleString("en-US")
}

export function formatCny(cny: number): string {
  return cny.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export type Product = {
  id: string
  name: string
  tagline: string
  category: string
  priceCny: number
  image: string
  rating: number
  sold: number
  stock: number
  badge?: string
  gallery: string[]
  specs: { label: string; value: string }[]
  description: string
}

export const CATEGORIES = ["全部", "硬件钱包", "矿机设备", "周边配件", "数字藏品"]

export const PRODUCTS: Product[] = [
  {
    id: "ledger-nova",
    name: "NOVA 冷钱包 Pro",
    tagline: "军工级安全芯片 · 离线签名",
    category: "硬件钱包",
    priceCny: 899,
    image: "/products/cold-wallet.png",
    rating: 4.9,
    sold: 2431,
    stock: 58,
    badge: "热销",
    gallery: ["/products/cold-wallet.png", "/products/cold-wallet-2.png", "/products/cold-wallet-3.png"],
    specs: [
      { label: "安全芯片", value: "CC EAL6+" },
      { label: "屏幕", value: "1.9\" 彩色触控" },
      { label: "连接", value: "USB-C / 蓝牙 5.2" },
      { label: "支持币种", value: "5500+" },
    ],
    description:
      "NOVA 冷钱包 Pro 采用军工级安全元件，私钥永不触网。全金属机身，支持离线签名与多链资产管理，是长期持有者的安心之选。",
  },
  {
    id: "miner-x1",
    name: "Hashline X1 静音矿机",
    tagline: "静音水冷 · 高能效比",
    category: "矿机设备",
    priceCny: 12800,
    image: "/products/miner.png",
    rating: 4.7,
    sold: 486,
    stock: 12,
    badge: "旗舰",
    gallery: ["/products/miner.png", "/products/miner-2.png", "/products/miner-3.png"],
    specs: [
      { label: "算力", value: "320 TH/s" },
      { label: "功耗", value: "3200W" },
      { label: "散热", value: "静音水冷" },
      { label: "噪音", value: "< 38 dB" },
    ],
    description:
      "Hashline X1 采用一体化水冷散热，运行噪音低于 38 分贝，可放置于家庭环境。高能效比设计，让每一度电产出更多收益。",
  },
  {
    id: "keycard-titan",
    name: "Titan 助记词钢板",
    tagline: "防火防水 · 永久备份",
    category: "周边配件",
    priceCny: 299,
    image: "/products/steel-plate.png",
    rating: 4.8,
    sold: 5210,
    stock: 240,
    gallery: ["/products/steel-plate.png", "/products/steel-plate-2.png", "/products/steel-plate-3.png"],
    specs: [
      { label: "材质", value: "304 不锈钢" },
      { label: "耐温", value: "1400°C" },
      { label: "防护", value: "防火 / 防水 / 防腐" },
      { label: "容量", value: "24 助记词" },
    ],
    description:
      "Titan 助记词钢板由 304 不锈钢冲压成型，耐高温 1400°C，抵御火灾、洪水与腐蚀。把你的助记词刻进金属，传承数十年。",
  },
  {
    id: "nft-genesis",
    name: "创世纪 · 数字藏品",
    tagline: "限量 1000 份 · 链上确权",
    category: "数字藏品",
    priceCny: 1999,
    image: "/products/nft.png",
    rating: 5.0,
    sold: 743,
    stock: 33,
    badge: "限量",
    gallery: ["/products/nft.png", "/products/nft-2.png", "/products/nft-3.png"],
    specs: [
      { label: "发行量", value: "1000 份" },
      { label: "标准", value: "ERC-721" },
      { label: "确权", value: "链上永久" },
      { label: "权益", value: "社区白名单" },
    ],
    description:
      "创世纪数字藏品全球限量 1000 份，链上永久确权。持有即解锁社区白名单权益与专属线下活动通行证。",
  },
  {
    id: "wallet-air",
    name: "AIR 轻钱包",
    tagline: "卡片形态 · NFC 一碰签名",
    category: "硬件钱包",
    priceCny: 459,
    image: "/products/card-wallet.png",
    rating: 4.6,
    sold: 3890,
    stock: 120,
    badge: "新品",
    gallery: ["/products/card-wallet.png", "/products/card-wallet-2.png", "/products/card-wallet-3.png"],
    specs: [
      { label: "厚度", value: "0.8mm" },
      { label: "连接", value: "NFC 无线" },
      { label: "供电", value: "无需电池" },
      { label: "材质", value: "PVC + 芯片" },
    ],
    description:
      "AIR 轻钱包薄如银行卡，通过 NFC 一碰即可完成签名，无需电池。放进钱包随身携带，安全与便携兼得。",
  },
  {
    id: "hub-pro",
    name: "多链管理终端",
    tagline: "7 寸大屏 · 资产总览",
    category: "矿机设备",
    priceCny: 2680,
    image: "/products/terminal.png",
    rating: 4.5,
    sold: 612,
    stock: 40,
    gallery: ["/products/terminal.png", "/products/terminal-2.png", "/products/terminal-3.png"],
    specs: [
      { label: "屏幕", value: "7\" 触控" },
      { label: "系统", value: "开源固件" },
      { label: "接口", value: "USB-C x3" },
      { label: "多链", value: "全链聚合" },
    ],
    description:
      "多链管理终端配备 7 寸触控大屏，聚合展示全链资产。开源固件确保透明可审计，是重度用户的桌面指挥中心。",
  },
  {
    id: "case-shield",
    name: "SHIELD 防护收纳盒",
    tagline: "电磁屏蔽 · 抗震收纳",
    category: "周边配件",
    priceCny: 189,
    image: "/products/case.png",
    rating: 4.7,
    sold: 4120,
    stock: 300,
    gallery: ["/products/case.png", "/products/case-2.png", "/products/case-3.png"],
    specs: [
      { label: "屏蔽", value: "法拉第层" },
      { label: "抗震", value: "EVA 内衬" },
      { label: "容纳", value: "3 设备位" },
      { label: "锁扣", value: "TSA 密码锁" },
    ],
    description:
      "SHIELD 收纳盒内置法拉第电磁屏蔽层，防止无线读取。EVA 抗震内衬与 TSA 密码锁，让你的设备旅途无忧。",
  },
  {
    id: "nft-aurora",
    name: "极光序列 · 动态藏品",
    tagline: "生成艺术 · 每份独一无二",
    category: "数字藏品",
    priceCny: 899,
    image: "/products/nft-aurora.png",
    rating: 4.9,
    sold: 1580,
    stock: 88,
    gallery: ["/products/nft-aurora.png", "/products/nft-aurora-2.png", "/products/nft-aurora-3.png"],
    specs: [
      { label: "类型", value: "生成艺术" },
      { label: "标准", value: "ERC-721" },
      { label: "唯一性", value: "参数随机" },
      { label: "动态", value: "实时渲染" },
    ],
    description:
      "极光序列由链上参数实时生成，每一份都是独一无二的动态艺术品。收藏它，拥有一段永不重复的光影。",
  },
]

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id)
}

export type Transaction = {
  id: string
  type: "credit" | "debit" | "refund"
  title: string
  amount: number
  time: string
  status: "成功" | "处理中" | "失败"
}

export const TRANSACTIONS: Transaction[] = [
  { id: "tx-1029", type: "debit", title: "购买 NOVA 冷钱包 Pro", amount: -89900, time: "2026-07-08 14:22", status: "成功" },
  { id: "tx-1028", type: "credit", title: "充值 NBC", amount: 500000, time: "2026-07-06 09:11", status: "成功" },
  { id: "tx-1027", type: "refund", title: "退款 · SHIELD 收纳盒", amount: 18900, time: "2026-07-03 18:40", status: "成功" },
  { id: "tx-1026", type: "debit", title: "购买 Titan 助记词钢板", amount: -29900, time: "2026-07-01 21:05", status: "成功" },
  { id: "tx-1025", type: "debit", title: "购买 极光序列藏品", amount: -89900, time: "2026-06-28 12:30", status: "处理中" },
  { id: "tx-1024", type: "credit", title: "充值 NBC", amount: 1000000, time: "2026-06-20 08:00", status: "成功" },
]

export type OrderItem = {
  id: string
  title: string
  date: string
  total: number
  status: "已完成" | "待发货" | "运输中"
  items: number
}

export const ORDERS: OrderItem[] = [
  { id: "NBC-2026-1029", title: "NOVA 冷钱包 Pro", date: "2026-07-08", total: 89900, status: "运输中", items: 1 },
  { id: "NBC-2026-1026", title: "Titan 助记词钢板 x2", date: "2026-07-01", total: 59800, status: "已完成", items: 2 },
  { id: "NBC-2026-1025", title: "极光序列 · 动态藏品", date: "2026-06-28", total: 89900, status: "待发货", items: 1 },
]
