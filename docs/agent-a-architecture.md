# EverShop NBC 钱包模块集成设计方案

> **Agent-A 架构输出** | 深度分析 EverShop 模块系统 + NBC 钱包兑换模块架构方案
> 研究完成时间：2026-04-26

---

## 一、EverShop 架构核心要点（研究摘要）

### 1.1 核心设计理念
- **模块化单体（Modular Monolith）**：单应用 + 内部分离模块，兼顾简洁性与灵活性
- **API 驱动**：前后端通信统一走 GraphQL + REST API
- **一切皆模块**：核心功能（catalog/checkout）和自定义扩展均遵循统一模块结构
- **可扩展优先**：通过扩展点、事件系统 Hook 现有功能，不修改核心代码

### 1.2 请求生命周期
```
HTTP Request → Middleware Pipeline → Router → Controller/Resolver
  → Service（业务逻辑）→ PostgreSQL → Response
```

### 1.3 扩展（Extension）目录结构
```
extensions/
└── vendor_nbcWallet/            ← 自定义模块根目录
    ├── dist/                     ← 编译输出（生产环境必须有）
    └── src/
        ├── api/                  ← REST API 端点（路由 + 中间件链）
        │   └── wallet/...        ← 按功能子目录组织
        │       ├── route.json    ← 路由定义
        │       ├── [auth]balance.js       ← 中间件：余额查询
        │       └── [auth]redeem.js        ← 中间件：兑换扣款
        ├── graphql/              ← GraphQL 类型定义 + Resolvers
        │   └── types/
        │       └── Wallet/
        │           ├── Wallet.graphql
        │           └── Wallet.resolvers.ts
        ├── pages/                ← React 页面组件
        │   ├── admin/            ← 管理后台
        │   └── frontStore/       ← 前台店铺
        ├── migration/            ← 数据库迁移脚本
        │   └── Version_1.0.0.ts
        ├── services/             ← 业务逻辑服务层
        │   └── WalletService.ts
        ├── jobs/                ← 定时任务（可选）
        └── bootstrap.ts          ← 模块初始化入口
```

### 1.4 关键机制

| 机制 | 说明 |
|---|---|
| **Middleware 链式处理** | API 请求经由多个中间件顺序处理，文件名格式 `[prev]curr.js` |
| **Migration 脚本** | 模块安装时自动执行，接收 `PoolClient`，用于建表/初始化数据 |
| **GraphQL 扩展** | 在 `graphql/types/` 下新建目录，`.graphql` 定义类型，`*.resolvers.ts` 定义解析器 |
| **Bootstrap** | 应用启动时执行，适合注册事件订阅、初始化配置 |
| **NPM Workspace** | 根目录 `package.json` 声明 `workspaces: ["extensions/*"]`，扩展可独立管理依赖 |

### 1.5 激活方式
在 `config/production.json`（或 `config/default.json`）中添加：
```json
{
  "system": {
    "extensions": [
      {
        "name": "vendor_nbcWallet",
        "resolve": "extensions/vendor_nbcWallet",
        "enabled": true,
        "priority": 10
      }
    ]
  }
}
```
修改后需执行 `npm run build` 重建。

---

## 二、NBC 钱包模块架构方案

### 2.1 业务目标
NBC（内购积分/虚拟货币）钱包兑换模块实现：
- 用户匿名/注册账户的钱包余额管理
- NBC 与人民币（CNY）双向兑换
- 商品页展示 NBC 消耗量
- 结算时使用 NBC 抵扣部分或全部订单金额
- 兑换记录可查询

### 2.2 NBC 与人民币兑换规则（预设）
> 以下为示例规则，实际业务可配置调整

| 参数 | 值 | 说明 |
|---|---|---|
| `NBC_TO_CNY_RATE` | `0.01` | 1 NBC = 0.01 元（即 100 NBC = 1 元） |
| 每件商品 NBC 消耗 | `Math.floor(price_cny * 100)` | 人民币价格 × 100 向下取整 |
| 最低兑换门槛 | 100 NBC | 账户余额不足时不可兑换 |
| 允许部分兑换 | ✅ | NBC 余额不足全额时，剩余部分需其他支付方式补足 |

---

## 三、📁 推荐的文件目录结构

```
extensions/
└── nbcWallet/
    ├── dist/
    ├── src/
    │   ├── api/
    │   │   ├── getWalletBalance/
    │   │   │   ├── route.json
    │   │   │   └── [auth]getBalance.js
    │   │   ├── walletBalanceUpdate/           ← 管理员调整余额
    │   │   │   ├── route.json
    │   │   │   └── [admin]updateBalance.js
    │   │   ├── redeemNbc/
    │   │   │   ├── route.json
    │   │   │   └── [auth]redeemNbc.js
    │   │   ├── refundNbc/                   ← 退款时退还 NBC
    │   │   │   ├── route.json
    │   │   │   └── [auth]refundNbc.js
    │   │   ├── nbcExchangeRate/             ← 查询汇率
    │   │   │   ├── route.json
    │   │   │   └── getExchangeRate.js
    │   │   └── createWallet/               ← 创建匿名/注册钱包
    │   │       ├── route.json
    │   │       └── createWallet.js
    │   ├── graphql/
    │   │   └── types/
    │   │       ├── Wallet/
    │   │       │   ├── Wallet.graphql
    │   │       │   └── Wallet.resolvers.ts
    │   │       ├── NbcTransaction/
    │   │       │   ├── NbcTransaction.graphql
    │   │       │   └── NbcTransaction.resolvers.ts
    │   │       └── extend/
    │   │           └── Order.graphql        ← 扩展 Order 类型（添加 nbc_used）
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   └── nbcWallet/
    │   │   │       ├── WalletList.tsx       ← 后台钱包列表
    │   │   │       ├── WalletDetail.tsx     ← 后台钱包详情/余额调整
    │   │   │       └── route.json
    │   │   └── frontStore/
    │   │       └── account/
    │   │           └── wallet/
    │   │               ├── WalletBalance.tsx
    │   │               ├── TransactionHistory.tsx
    │   │               └── route.json
    │   ├── migration/
    │   │   ├── Version_1.0.0.ts             ← 初始建表
    │   │   └── Version_1.1.0.ts             ← 未来扩展字段
    │   ├── services/
    │   │   ├── WalletService.ts             ← 钱包核心业务逻辑
    │   │   ├── NbcCalculator.ts             ← NBC 消耗量计算逻辑
    │   │   └── NbcExchangeService.ts        ← 汇率兑换逻辑
    │   ├── listeners/                        ← 事件监听（订单完成/退款）
    │   │   ├── orderCreated.ts
    │   │   ├── orderRefunded.ts
    │   │   └── bootstrap.ts
    │   └── bootstrap.ts
    ├── package.json
    └── tsconfig.json
```

---

## 四、🗄️ 数据库 Schema 设计

### 4.1 核心表结构

```sql
-- =============================================
-- 表1：NBC 钱包账户表
-- =============================================
CREATE TABLE nbc_wallet (
    wallet_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      UUID        NULL,                        -- 关联 registered 用户（可为 NULL 表示匿名）
    anonymous_id     VARCHAR(64) NULL,                        -- 匿名访客 ID（如 sessionId/cookie）
    balance          BIGINT      NOT NULL DEFAULT 0,           -- NBC 余额（整数，最小单位 1 NBC）
    frozen_balance   BIGINT      NOT NULL DEFAULT 0,           -- 冻结余额（兑换锁定中）
    currency         VARCHAR(8)  NOT NULL DEFAULT 'NBC',
    status           SMALLINT    NOT NULL DEFAULT 1,           -- 1=active, 0=inactive
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_wallet UNIQUE (customer_id),
    CONSTRAINT uq_anonymous_wallet UNIQUE (anonymous_id),
    CONSTRAINT chk_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT chk_frozen_non_negative CHECK (frozen_balance >= 0)
);

-- =============================================
-- 表2：NBC 交易记录表
-- =============================================
CREATE TABLE nbc_transaction (
    transaction_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id        UUID         NOT NULL REFERENCES nbc_wallet(wallet_id),
    order_id         UUID         NULL,                        -- 关联订单（退款时可能为空）
    type             VARCHAR(32)  NOT NULL,                    -- credit/debit/freeze/unfreeze/refund/adjust
    amount           BIGINT       NOT NULL,                   -- NBC 数量（正数）
    balance_before   BIGINT       NOT NULL,                   -- 变动前余额
    balance_after    BIGINT       NOT NULL,                   -- 变动后余额
    cny_amount      DECIMAL(12,4) NULL,                       -- 对应人民币金额（用于消费记录）
    exchange_rate    DECIMAL(10,6) NULL,                      -- 交易时的兑换汇率
    description      VARCHAR(255) NULL,                        -- 交易描述
    status           SMALLINT     NOT NULL DEFAULT 1,         -- 1=completed, 0=pending, -1=cancelled
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nbc_tx_wallet ON nbc_transaction(wallet_id);
CREATE INDEX idx_nbc_tx_order  ON nbc_transaction(order_id);
CREATE INDEX idx_nbc_tx_created ON nbc_transaction(created_at DESC);

-- =============================================
-- 表3：NBC 汇率配置表
-- =============================================
CREATE TABLE nbc_exchange_rate (
    rate_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_key      VARCHAR(32)  NOT NULL UNIQUE DEFAULT 'NBC_TO_CNY',
    rate_value    DECIMAL(12,6) NOT NULL,                      -- 汇率值，如 0.01
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================
-- 表4：商品 NBC 折扣配置表（可选）
-- =============================================
CREATE TABLE product_nbc_config (
    config_id      UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID     NOT NULL REFERENCES product(product_id),
    nbc_discount_percent DECIMAL(5,2) NULL,   -- NBC 专属折扣百分比（可覆盖默认规则）
    nbc_enabled    BOOLEAN  NOT NULL DEFAULT TRUE,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_nbc_config UNIQUE (product_id)
);

-- =============================================
-- 表5：订单 NBC 使用记录（Denormalized，与 order 表关联）
-- =============================================
CREATE TABLE order_nbc_usage (
    usage_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID        NOT NULL UNIQUE REFERENCES "order"(order_id),
    wallet_id       UUID        NOT NULL REFERENCES nbc_wallet(wallet_id),
    nbc_amount      BIGINT      NOT NULL,    -- 本次订单使用的 NBC 数量
    cny_saved       DECIMAL(12,4) NOT NULL,  -- 折算人民币节省金额
    exchange_rate   DECIMAL(10,6) NOT NULL,  -- 兑换时汇率
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 与 EverShop 现有表的关联

| 新表字段 | 关联现有表 | 关联方式 |
|---|---|---|
| `product_nbc_config.product_id` | `product.product_id` | FK，关联商品 |
| `order_nbc_usage.order_id` | `order.order_id` | FK，关联订单 |
| `nbc_transaction.order_id` | `order.order_id` | FK，关联交易（可空） |
| `nbc_wallet.customer_id` | `customer.customer_id` | FK，关联注册用户 |

---

## 五、🔌 API 设计（关键端点）

### 5.1 REST API 端点

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| `POST` | `/api/nbcWallet/create` | public | 创建/获取钱包（匿名或注册用户） |
| `GET` | `/api/nbcWallet/balance` | auth | 查询当前钱包余额 |
| `POST` | `/api/nbcWallet/redeem` | auth | 结算页发起 NBC 兑换（冻结/扣减余额） |
| `POST` | `/api/nbcWallet/refund` | auth | 退款时退还 NBC |
| `POST` | `/api/nbcWallet/admin/adjust` | admin | 后台管理员调整用户余额 |
| `GET` | `/api/nbcWallet/transactions` | auth | 查询交易记录（分页） |
| `GET` | `/api/nbcWallet/exchangeRate` | public | 获取当前 NBC→CNY 汇率 |

### 5.2 API 详细设计

#### 5.2.1 `GET /api/nbcWallet/balance`

```typescript
// [auth]getBalance.js
// route.json: { "methods": ["GET"], "path": "/nbcWallet/balance", "access": "logged_in" }

import { select } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/src/lib/postgres";

export default async (request, response) => {
  const customerId = request.session.customerId;

  const wallet = await select()
    .from("nbc_wallet")
    .where("customer_id", "=", customerId)
    .load(pool);

  response.json({
    success: true,
    data: {
      walletId: wallet?.wallet_id,
      balance: wallet?.balance ?? 0,
      frozenBalance: wallet?.frozen_balance ?? 0,
      availableBalance: (wallet?.balance ?? 0) - (wallet?.frozen_balance ?? 0),
      currency: "NBC"
    }
  });
};
```

#### 5.2.2 `POST /api/nbcWallet/redeem`

```typescript
// [auth]redeemNbc.js
// route.json: { "methods": ["POST"], "path": "/nbcWallet/redeem", "access": "logged_in" }

import { select, update } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/src/lib/postgres";
import { getConnection } from "@evershop/evershop/src/lib/postgres";
import { NbcCalculator } from "../../services/NbcCalculator";

export default async (request, response) => {
  const { orderId, nbcAmount } = request.body;
  const customerId = request.session.customerId;

  const conn = await getConnection();
  await conn.query("BEGIN");

  try {
    // 1. 获取钱包
    const wallet = await select()
      .from("nbc_wallet")
      .where("customer_id", "=", customerId)
      .forUpdate()  // 行锁
      .load(conn);

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    const availableBalance = wallet.balance - wallet.frozen_balance;
    if (nbcAmount > availableBalance) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // 2. 获取汇率
    const rate = await select()
      .from("nbc_exchange_rate")
      .where("rate_key", "=", "NBC_TO_CNY")
      .load(conn);
    const exchangeRate = parseFloat(rate?.rate_value ?? "0.01");

    // 3. 计算 CNY 等值
    const cnyAmount = nbcAmount * exchangeRate;

    // 4. 扣减余额
    const newBalance = wallet.balance - nbcAmount;
    await update("nbc_wallet")
      .set({ balance: newBalance, updated_at: new Date() })
      .where("wallet_id", "=", wallet.wallet_id)
      .execute(conn);

    // 5. 记录交易
    await conn.query(
      `INSERT INTO nbc_transaction
        (transaction_id, wallet_id, order_id, type, amount, balance_before, balance_after, cny_amount, exchange_rate, description, status)
       VALUES (gen_random_uuid(), $1, $2, 'debit', $3, $4, $5, $6, $7, $8, 1)`,
      [wallet.wallet_id, orderId, nbcAmount, wallet.balance, newBalance, cnyAmount, exchangeRate, `Order payment - ${orderId}`]
    );

    // 6. 记录订单使用
    await conn.query(
      `INSERT INTO order_nbc_usage
        (usage_id, order_id, wallet_id, nbc_amount, cny_saved, exchange_rate, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
      [orderId, wallet.wallet_id, nbcAmount, cnyAmount, exchangeRate]
    );

    await conn.query("COMMIT");

    response.json({
      success: true,
      data: {
        nbcDeducted: nbcAmount,
        cnySaved: cnyAmount,
        exchangeRate,
        newBalance
      }
    });
  } catch (error) {
    await conn.query("ROLLBACK");
    response.json({ success: false, message: error.message });
  }
};
```

#### 5.2.3 `POST /api/nbcWallet/refund`

```typescript
// 退款时触发 NBC 回退
export default async (request, response) => {
  const { orderId, reason } = request.body;

  // 查询 order_nbc_usage 获取原始 NBC 数量
  const usage = await select()
    .from("order_nbc_usage")
    .where("order_id", "=", orderId)
    .load(pool);

  if (!usage) {
    return response.json({ success: false, message: "No NBC usage found for this order" });
  }

  // 退还 NBC：增加余额 + 记录 transaction
  // ... (类似 redeem 的逆向逻辑)
};
```

### 5.3 GraphQL 类型扩展

#### 扩展 Order 类型（添加 NBC 使用信息）
```graphql
# src/graphql/types/extend/Order.graphql

extend type Order {
  nbcUsed: NbcUsage
}
```

```typescript
// Order.resolvers.ts 新增
Order: {
  nbcUsed: async (order, _, { pool }) => {
    return await select()
      .from("order_nbc_usage")
      .where("order_id", "=", order.orderId)
      .load(pool);
  }
}
```

#### 新增 Wallet 查询
```graphql
# src/graphql/types/Wallet/Wallet.graphql

type Wallet {
  walletId: ID!
  balance: Int!
  frozenBalance: Int!
  availableBalance: Int!
  currency: String!
}

type NbcTransaction {
  transactionId: ID!
  type: String!
  amount: Int!
  balanceBefore: Int!
  balanceAfter: Int!
  cnyAmount: Float
  exchangeRate: Float
  description: String
  createdAt: String!
}

extend type Query {
  wallet: Wallet
  nbcTransactions(limit: Int, page: Int): [NbcTransaction!]!
}

extend type Mutation {
  redeemNbc(orderId: ID!, nbcAmount: Int!): RedeemResult!
}
```

---

## 六、💱 NBC 兑换核心逻辑流程

### 6.1 商品页展示 NBC 消耗量

```typescript
// services/NbcCalculator.ts

const NBC_TO_CNY_RATE = 0.01; // 从数据库 nbc_exchange_rate 表动态读取

export class NbcCalculator {
  /**
   * 根据商品人民币价格计算 NBC 消耗量
   * 规则：price_cny * 100（向下取整）
   * 例：¥99.00 → 9900 NBC
   *     ¥9.90  → 990  NBC
   */
  static calculateNbcAmount(priceCny: number): number {
    return Math.floor(priceCny * 100);
  }

  /**
   * 根据 NBC 数量计算等值人民币
   * 用于结算页展示节省金额
   */
  static calculateCnyAmount(nbcAmount: number, rate?: number): number {
    const exchangeRate = rate ?? NBC_TO_CNY_RATE;
    return nbcAmount * exchangeRate;
  }

  /**
   * 智能兑换：用户选择使用 NBC，系统自动计算最优兑换量
   * 策略：优先用尽余额（不超过订单总额等值 NBC）
   */
  static calculateOptimalRedeem(
    walletBalance: number,
    walletFrozen: number,
    orderTotalCny: number,
    rate: number
  ): { nbcAmount: number; cnySaved: number } {
    const available = walletBalance - walletFrozen;
    const maxNbcForOrder = Math.floor(orderTotalCny / rate);
    const nbcAmount = Math.min(available, maxNbcForOrder);
    const cnySaved = nbcAmount * rate;
    return { nbcAmount, cnySaved };
  }
}
```

### 6.2 结算流程中的 NBC 抵扣时序

```
[用户点击"结算"]
        │
        ▼
① 查询用户钱包余额 (GET /api/nbcWallet/balance)
        │
        ▼
② 商品页/购物车展示每个商品 NBC 消耗量
   NbcCalculator.calculateNbcAmount(price_cny)
        │
        ▼
③ 用户选择"使用 NBC 抵扣" → 勾选框
        │
        ▼
④ 结算确认页调用 [POST /api/nbcWallet/redeem]
   - 扣减钱包余额 (debit)
   - 冻结余额不变（已直接扣减）
   - 记录 nbc_transaction (type='debit')
   - 记录 order_nbc_usage
        │
        ▼
⑤ 订单实际支付金额 = 原总额 - CNY节省
   → 剩余金额走 Stripe/其他支付方式
        │
        ▼
⑥ 订单完成后，transaction 状态置为 completed
        │
        ▼
[退款场景]
⑦ [POST /api/nbcWallet/refund]
   - 查询 order_nbc_usage 原始 NBC
   - 增加钱包余额 (credit)
   - 记录 nbc_transaction (type='refund')
```

---

## 七、⚠️ 风险点与注意事项

### 7.1 事务安全
- **原子性扣款**：余额更新 + 交易记录必须在同一数据库事务中完成（使用 `BEGIN/COMMIT/ROLLBACK`）
- **并发控制**：使用 `SELECT ... FOR UPDATE` 行锁，防止同一钱包并发兑换导致余额超扣
- **幂等性**：`redeem` API 应支持通过 order_id 做幂等检查，已兑换的订单不可重复扣款

### 7.2 数据一致性
- **订单关联**：所有 NBC 扣款必须关联 order_id，退款时按 order_id 追溯原始交易
- **汇率锁定**：兑换时汇率应记录在 transaction 中（即使后续汇率调整，历史记录不变）
- **余额校验**：数据库层加 `CHECK (balance >= 0)` 约束，防止业务逻辑漏洞

### 7.3 性能考虑
- **索引**：wallet_id、order_id、created_at 加索引，避免大表全表扫描
- **分页**：交易记录查询必须分页（建议每页 20 条）
- **异步处理**：大批量 NBC 赠送（如运营活动）建议通过 `jobs/` 定时任务异步处理

### 7.4 安全性
- **权限控制**：所有涉及余额变动的 API 必须 `access: "logged_in"`，管理接口加 `admin` 角色校验
- **防注入**：使用 `@evershop/postgres-query-builder` 参数化查询，不拼接 SQL 字符串
- **金额边界**：NBC 余额用 BIGINT 整数存储，避免浮点精度问题；前端展示时除以 100

### 7.5 兼容性
- **核心模块依赖**：NBC 兑换依赖 `order` 表存在，需在 Migration 中检查 `order` 表是否存在后再建外键
- **升级路径**：每次新增字段走独立 Migration 版本号（如 Version_1.1.0），不可覆盖旧迁移
- **跨模块交互**：建议通过 EverShop 事件系统（如 `order.created`）触发自动兑换，避免硬依赖其他模块

### 7.6 匿名用户处理
- 匿名用户使用 Session/Cookie 中的 `anonymous_id` 创建钱包
- 匿名钱包余额不持久化（会话结束后丢失），建议引导用户注册后再使用
- 结算时匿名用户须登录或绑定账户

### 7.7 前端集成
- 购物车页/结算页需在支付方式列表中新增 "NBC 钱包" 选项（参考 Stripe 支付集成模式）
- 商品详情页在价格旁边展示 NBC 等值消耗量（使用 GraphQL 扩展 Product 类型）
- React 组件放在 `pages/frontStore/` 下，通过 `layout.areaId` 插入到对应页面区域

---

## 八、实施建议路线图

| 阶段 | 内容 | 优先级 |
|---|---|---|
| **Phase 1** | 基础架构：模块目录 + 数据库 Migration + 钱包创建/余额查询 API | P0 |
| **Phase 2** | 兑换核心：redeem/refund API + 事务处理 + 汇率配置表 | P0 |
| **Phase 3** | GraphQL 扩展：Wallet 类型 + Order 扩展 + 商品页 NBC 展示 | P1 |
| **Phase 4** | 前端页面：钱包余额组件 + 交易历史 + 管理后台 | P1 |
| **Phase 5** | 事件集成：order.created/order.refunded 事件监听自动触发 | P2 |
| **Phase 6** | 运营功能：管理员批量调整余额、NBC 充值活动 | P2 |

---

> 本文档为技术架构设计稿，具体实现需根据实际 NBC 业务规则（汇率、门槛、业务场景）进行调整。核心原则：**不修改 EverShop 核心代码，所有定制通过 Extension 扩展实现**。
