# NBC 商城系统 — 多 Agent 协作项目实施方案

> 综合汇总 Agent-A（架构）、Agent-B（前端）、Agent-C（后端）三方研究成果  
> 生成日期：2026-04-26

---

## 一、项目概述

### 1.1 业务目标
将 **EverShop** 开源电商系统改造为支持 **NBC 代币钱包**直接支付的**无注册单商户商城**：
- 用户无需注册账号，连接钱包即可购买商品
- 商品以 NBC 标价，结算时自动兑换
- 管理员端负责上架商品、设置价格、管理订单

### 1.2 技术选型结论

| 项目 | 选型 |
|------|------|
| **基础系统** | EverShop（evershopcommerce/evershop） |
| **技术栈** | TypeScript + Node.js + React + GraphQL + PostgreSQL |
| **许可证** | GPL v3 |
| **架构特点** | 模块化单体（Modular Monolith），扩展通过 `extensions/` 目录插入，不改核心代码 |
| **钱包模式** | 半托管模式（平台代管余额，内部流转不上链，充值才上链确认） |
| **区块链交互** | ethers.js v6 + ERC-20（假设 NBC 为标准代币） |
| **后端框架** | NestJS（与 EverShop 的 Node.js 保持一致） |

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户端（EverShop Frontend）                │
│   连接钱包 → 浏览商品 → 加入购物车 → 结算签名 → NBC 支付     │
└─────────────────────────────┬───────────────────────────────┘
                              │ GraphQL / REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     EverShop 后端                            │
│   ┌──────────────────┐    ┌──────────────────────────────┐ │
│   │ 原有模块（不变）  │    │ NBC 钱包扩展（新增）          │ │
│   │ catalog           │    │ extensions/nbcWallet/         │ │
│   │ checkout          │    │ - API（余额/兑换/退款）       │ │
│   │ order             │    │ - GraphQL 类型扩展            │ │
│   │ payment           │    │ - Migration（5张新表）        │ │
│   └──────────────────┘    │ - Services（业务逻辑）         │ │
│                           └──────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ PostgreSQL  │     │  Redis      │     │  区块链节点  │
  │ (EverShop + │     │ (缓存/锁)   │     │  (ETH/BSC)  │
  │  NBC 新表)  │     └─────────────┘     └──────┬──────┘
  └─────────────┘                                   │
         ▲                                    ┌─────┴─────┐
         │                                    │ NBC 代币  │
         └────────────────────────────────────│  合约     │
                                              └───────────┘
```

### 2.2 改造后的用户购物流程

```
1. 用户访问商城 → Header 显示"连接钱包"按钮
2. 点击连接 → MetaMask 弹出 → 签名授权
3. 后端验证签名 → JWT Token → 登录成功
4. 浏览商品 → 每个商品显示 [¥99.00 / 9900 NBC]
5. 加入购物车 / 立即购买 → 结算页
6. 选择"NBC 钱包支付" → 钱包签名确认
7. 后端自动扣除 NBC 余额 → 订单完成
8. 管理员在后台看到新订单 → 发货
```

---

## 三、数据库设计

### 3.1 新增 5 张表

| 表名 | 用途 |
|------|------|
| `nbc_wallet` | 用户钱包（地址、余额、冻结余额） |
| `nbc_transaction` | NBC 流水记录（充值/消费/退款） |
| `nbc_exchange_rate` | NBC→CNY 汇率配置 |
| `product_nbc_config` | 商品 NBC 专属折扣配置 |
| `order_nbc_usage` | 订单 NBC 使用记录 |

### 3.2 核心表结构

```sql
-- 钱包表
CREATE TABLE nbc_wallet (
    wallet_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id    UUID NULL,                          -- 关联注册用户
    anonymous_id    VARCHAR(64) NULL,                   -- 匿名访客ID
    balance         BIGINT NOT NULL DEFAULT 0,           -- NBC 余额（整数）
    frozen_balance BIGINT NOT NULL DEFAULT 0,           -- 冻结余额
    currency       VARCHAR(8) DEFAULT 'NBC',
    status         SMALLINT DEFAULT 1,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 交易记录表
CREATE TABLE nbc_transaction (
    transaction_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id      UUID NOT NULL REFERENCES nbc_wallet(wallet_id),
    order_id       UUID NULL,
    type           VARCHAR(32) NOT NULL,               -- credit/debit/refund/adjust
    amount         BIGINT NOT NULL,
    balance_before BIGINT NOT NULL,
    balance_after  BIGINT NOT NULL,
    cny_amount    DECIMAL(12,4) NULL,
    exchange_rate  DECIMAL(10,6) NULL,
    description   VARCHAR(255) NULL,
    status        SMALLINT DEFAULT 1,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 汇率配置表
CREATE TABLE nbc_exchange_rate (
    rate_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_key   VARCHAR(32) UNIQUE NOT NULL DEFAULT 'NBC_TO_CNY',
    rate_value DECIMAL(12,6) NOT NULL,                -- 如 0.01（1 NBC = 0.01元）
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 四、API 设计

### 4.1 REST API 端点

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/nbcWallet/create` | public | 创建/获取钱包 |
| GET | `/api/nbcWallet/balance` | auth | 查询余额 |
| POST | `/api/nbcWallet/redeem` | auth | 兑换 NBC（扣款） |
| POST | `/api/nbcWallet/refund` | auth | 退款退还 NBC |
| POST | `/api/nbcWallet/admin/adjust` | admin | 管理员调整余额 |
| GET | `/api/nbcWallet/transactions` | auth | 查询流水记录 |
| GET | `/api/nbcWallet/exchangeRate` | public | 获取汇率 |

### 4.2 钱包连接 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/wallet/connect` | 获取 nonce |
| POST | `/api/auth/wallet/verify` | 验证签名，获取 JWT |

---

## 五、核心业务逻辑

### 5.1 NBC 兑换规则

```
商品价格：¥99.00
兑换规则：price_cny * 100（向下取整）
NBC 消耗量：9900 NBC

汇率：1 NBC = 0.01 元（即 100 NBC = 1 元）
```

### 5.2 订单状态机

```
CREATED → PENDING → PAID → SHIPPED → COMPLETED
   │          │
   │          └── 30分钟超时 → CANCELLED
   │          └── 交易失败 → FAILED（可重试3次）
   └── 用户取消 → CANCELLED
```

### 5.3 扣款事务流程

```typescript
// 伪代码：redeem 核心逻辑
async function redeemNbc(orderId, walletAddress, nbcAmount) {
  const conn = await getConnection();
  await conn.query("BEGIN");

  // 1. 行锁查询钱包
  const wallet = await SELECT().forUpdate().where("customer_id", address).load(conn);

  // 2. 验证余额
  if (wallet.balance < nbcAmount) throw "余额不足";

  // 3. 扣减余额 + 记录流水（在同一事务中）
  await UPDATE("nbc_wallet").set({ balance: newBalance }).execute(conn);
  await INSERT("nbc_transaction").values({...}).execute(conn);

  await conn.query("COMMIT");
}
```

---

## 六、前端改造方案

### 6.1 页面改造清单

| 页面 | 改动级别 | 改造内容 |
|------|---------|---------|
| 登录页 | 🔴 大改 | 完全重构为"连接钱包"页 |
| Header | 🔵 小改 | 登录按钮 → 钱包地址显示 |
| 商品列表/详情 | 🔵 小改 | 增加 NBC 价格展示 |
| 购物车 | 🟡 中改 | localStorage 持久化 + 匿名/认证合并 |
| 结算页 | 🟡 中改 | 新增签名确认区、NBC 支付选项 |
| 用户中心 | 🟡 中改 | 改为钱包地址 + 订单历史 |

### 6.2 钱包连接流程

```
连接钱包 → MetaMask 授权 → 获取地址 → 后端验证签名 → JWT Token → 登录完成
```

### 6.3 技术选型

- 钱包 SDK：`@metamask/sdk` + wagmi/viem
- 状态管理：WalletContext + Apollo Cache
- Session：JWT (httpOnly Cookie) + localStorage (购物车)

---

## 七、实施计划

### 7.1 工作量估算

| 阶段 | 时间 | 内容 |
|------|------|------|
| **Phase 1 - MVP** | 2 周 | 钱包连接 + 登录页重构 + 基础下单 + NBC 扣款 |
| **Phase 2 - 完善** | 1 周 | 购物车持久化 + 多钱包支持 + 订单历史 |
| **Phase 3 - 优化** | 1 周 | 移动端适配 + 错误处理完善 + Gas 优化 |

**总工作量：约 42 人天**（前端 30 天 + 后端 12 天）

### 7.2 多 Agent 协作分工

| Agent | 角色 | 负责模块 |
|-------|------|---------|
| **Agent-A** | 架构师 | EverShop 扩展架构、NBC 模块设计、数据库 schema |
| **Agent-B** | 前端开发 | 用户端页面改造、钱包连接组件、结算流程 |
| **Agent-C** | 后端开发 | NestJS 钱包服务、区块链交互、订单状态机 |

---

## 八、技术风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| 用户无钱包插件 | 转化率下降 | 预留手机号登录降级方案 |
| 链上交易失败 | 订单无法完成 | 失败重试 + 定时补偿任务 |
| 并发余额超扣 | 资损风险 | 乐观锁 + 行级锁 + 数据库 CHECK 约束 |
| 汇率波动 | 计价不准 | 兑换时锁定汇率，记录到交易流水 |
| 私钥泄露 | 资产被盗 | HD Wallet + Vault/KMS + 审计日志 |

---

## 九、关键文件路径

| 文件 | 说明 |
|------|------|
| `memory/agent-a-architecture.md` | Agent-A 架构详细方案 |
| `memory/agent-b-frontend.md` | Agent-B 前端改造详细方案 |
| `memory/agent-c-backend.md` | Agent-C 后端集成详细方案 |
| `memory/2026-04-26-ecommerce-research.md` | 调研阶段笔记 |

---

> 本文档为综合实施方案，Agent-A/B/C 的详细技术方案请参考各自的 memory 文件。
