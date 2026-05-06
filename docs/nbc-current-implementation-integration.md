# NBC 钱包模块无缝接入定义（基于当前仓库实现）

> 目标：不是重新设计一套理想系统，而是基于当前 `nbcstore` 仓库里的 EverShop 实现方式，定义一版可以平滑落地、尽量不破坏现有流程的 NBC 集成方案。

---

## 1. 当前仓库的真实实现基线

结合当前代码，先明确几个不能忽略的事实：

### 1.1 仓库当前还是标准 EverShop 结构

- 根目录已经是 EverShop monorepo，核心代码在 `packages/evershop`
- 根 `package.json` 已开启 `workspaces: ["packages/*", "extensions/*"]`
- 当前仓库里还没有业务级 `extensions/` 目录
- 当前仓库里也还没有业务级 `themes/` 目录
- 当前仓库里也没有 `config/` 目录，后续启用扩展时需要补 `config/default.json`

### 1.2 顾客体系当前强依赖 `customer`

当前前台登录、账户页、订单历史、购物车绑定都建立在以下约定上：

- 登录成功后写入 `session.customerID`
- `request.getCurrentCustomer()` 从 `request.locals.customer` 取当前顾客
- JWT 里的顾客载荷也是 `customer`
- `cart.customer_id`、`order.customer_id` 直接关联核心 `customer.customer_id`

这意味着：

- 第一版不能直接抛弃 `customer` 表
- 也不适合把“钱包地址”直接硬塞进现有所有核心逻辑
- 最稳妥方式是做“钱包身份 -> EverShop customer”的桥接

### 1.3 购物车和结算当前支持 guest

当前实现里：

- `myCart` 按 `session sid` 查购物车
- 已登录用户会把 `customer_id` 写入购物车
- 未登录用户也能创建购物车和发起 checkout
- `checkout()` 时如果存在 `currentCustomer`，才把 `customer.id/email/fullName` 写入订单

这意味着：

- 不能把全站直接改成“必须先钱包登录才能逛”
- 更合理的是只对 `nbc_wallet` 支付方式要求钱包身份

### 1.4 支付方式当前是“注册式接入”

现有 Stripe / PayPal / COD 都不是改 checkout 核心，而是：

- 用 `registerPaymentMethod()` 把支付方式注册进系统
- 在前台通过 `checkoutFormAfter` 注入对应支付组件
- 订单先创建，再由各支付方式完成后续支付确认
- 支付状态通过 `oms.order.paymentStatus` 和 `updatePaymentStatus()` 管理

这意味着 NBC 最合适的接入姿势是：

- 作为一个新的 payment method 接入
- 不要重写 checkout 核心流程
- 不要直接篡改 `orderCreator.ts`

---

## 2. 无缝接入的核心决策

### 2.1 第一阶段不移除 `customer`，做钱包登录桥接

推荐方案：

1. 用户使用钱包签名登录
2. 后端校验签名
3. 按钱包地址查找 NBC 绑定记录
4. 若不存在，则自动创建一个“影子 customer”
5. 登录态仍然落到 `session.customerID` 和现有 customer JWT

这样可以直接复用：

- `request.getCurrentCustomer()`
- `/account`
- `currentCustomer`
- `order.customer_id`
- 购物车与订单历史

### 2.2 第一阶段不改成“全站钱包唯一身份”

第一阶段建议：

- 保留原有 Email/Password 登录能力
- 新增 Wallet Login
- NBC 支付方式只对钱包已绑定用户开放

原因：

- 当前 checkout、account、customer middleware 都默认存在 customer 语义
- 直接去掉 customer 会牵一发而动全身
- 先做兼容式桥接，后面再决定是否演进到 wallet-only storefront

### 2.3 NBC 支付按“现有支付方式模型”接入

推荐支付链路：

1. 结算页选择 `nbc_wallet`
2. 先走当前 `checkout()` 创建订单
3. 订单创建成功后，调用 NBC capture API
4. NBC capture API 完成：
   - 行锁读取钱包
   - 校验余额
   - 扣减余额
   - 写交易流水
   - 写订单 NBC 使用记录
   - 更新订单支付状态
   - 触发 `order_placed`

这样能与现有 Stripe / PayPal 模式保持一致：

- 订单先创建
- 支付后确认
- 支付失败时订单保留为待支付或失败态

### 2.4 第一阶段不把链上扣款塞进下单事务

不建议第一版把 NBC 扣款硬塞进 `createOrder()` 的事务里，原因：

- 当前核心设计就是“订单创建”和“支付确认”分段
- 支付失败后保留订单，符合现有平台认知
- 更容易做重试、补偿和错误可视化

建议：

- `createOrder()` 只负责落订单
- `capture` API 专门负责 NBC 钱包扣款

---

## 3. 与当前实现对齐后的数据模型

文档里原先大量使用 UUID 作为跨系统主键，但当前 EverShop 核心表的对接方式是：

- 内部主键多为 `INT IDENTITY`
- 对外公开字段一般另带 `uuid`

所以 NBC 表建议也遵循同样风格。

### 3.1 建议新增表

#### `nbc_wallet`

用途：

- 钱包身份
- 平台账本余额
- 与 `customer` 的绑定

建议字段：

```sql
CREATE TABLE "nbc_wallet" (
  "wallet_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customer_id" INT NOT NULL,
  "wallet_address" varchar(128) NOT NULL,
  "chain_id" INT DEFAULT NULL,
  "balance" numeric(36,0) NOT NULL DEFAULT 0,
  "frozen_balance" numeric(36,0) NOT NULL DEFAULT 0,
  "status" smallint NOT NULL DEFAULT 1,
  "last_login_at" TIMESTAMPTZ DEFAULT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NBC_WALLET_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "NBC_WALLET_CUSTOMER_ID_UNIQUE" UNIQUE ("customer_id"),
  CONSTRAINT "NBC_WALLET_ADDRESS_UNIQUE" UNIQUE ("wallet_address"),
  CONSTRAINT "FK_NBC_WALLET_CUSTOMER" FOREIGN KEY ("customer_id")
    REFERENCES "customer" ("customer_id") ON DELETE CASCADE,
  CONSTRAINT "CHK_NBC_WALLET_BALANCE" CHECK ("balance" >= 0),
  CONSTRAINT "CHK_NBC_WALLET_FROZEN_BALANCE" CHECK ("frozen_balance" >= 0)
);
```

#### `nbc_wallet_transaction`

用途：

- 充值
- 扣款
- 退款
- 调账

建议字段：

```sql
CREATE TABLE "nbc_wallet_transaction" (
  "wallet_tx_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "wallet_id" INT NOT NULL,
  "order_id" INT DEFAULT NULL,
  "transaction_type" varchar(32) NOT NULL,
  "amount" numeric(36,0) NOT NULL,
  "balance_before" numeric(36,0) NOT NULL,
  "balance_after" numeric(36,0) NOT NULL,
  "exchange_rate" numeric(20,8) DEFAULT NULL,
  "cny_amount" decimal(12,4) DEFAULT NULL,
  "reference" varchar(128) DEFAULT NULL,
  "status" varchar(32) NOT NULL,
  "metadata" jsonb DEFAULT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NBC_WALLET_TX_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_NBC_WALLET_TX_WALLET" FOREIGN KEY ("wallet_id")
    REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE,
  CONSTRAINT "FK_NBC_WALLET_TX_ORDER" FOREIGN KEY ("order_id")
    REFERENCES "order" ("order_id") ON DELETE SET NULL
);
```

#### `nbc_order_usage`

用途：

- 记录某个订单实际用了多少 NBC
- 锁定下单时汇率

建议字段：

```sql
CREATE TABLE "nbc_order_usage" (
  "usage_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" INT NOT NULL,
  "wallet_id" INT NOT NULL,
  "nbc_amount" numeric(36,0) NOT NULL,
  "exchange_rate" numeric(20,8) NOT NULL,
  "cny_amount" decimal(12,4) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NBC_ORDER_USAGE_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "NBC_ORDER_USAGE_ORDER_UNIQUE" UNIQUE ("order_id"),
  CONSTRAINT "FK_NBC_ORDER_USAGE_ORDER" FOREIGN KEY ("order_id")
    REFERENCES "order" ("order_id") ON DELETE CASCADE,
  CONSTRAINT "FK_NBC_ORDER_USAGE_WALLET" FOREIGN KEY ("wallet_id")
    REFERENCES "nbc_wallet" ("wallet_id") ON DELETE CASCADE
);
```

#### `nbc_exchange_rate`

用途：

- 保存平台账本使用的 NBC 汇率

#### `nbc_wallet_auth_nonce`

用途：

- 保存钱包登录 nonce
- 控制过期时间和单次使用

### 3.2 为什么不建议继续沿用文档里的 UUID-only 设计

因为当前系统的核心关联都是：

- `customer.customer_id`
- `cart.cart_id`
- `order.order_id`

如果 NBC 模块自己坚持 UUID-only：

- 查询 join 会变绕
- hook 到核心订单时转换成本更高
- 管理后台联表会不自然

所以建议：

- 内部关联对齐 EverShop 的 `INT` 主键
- 对外接口和前端展示继续返回 `uuid`

---

## 4. 认证桥接定义

### 4.1 目标

钱包登录成功后，系统内部仍然得到一个标准 EverShop customer 登录态。

### 4.2 推荐接口

#### `POST /api/nbcWallet/auth/request`

输入：

```json
{
  "walletAddress": "0x..."
}
```

输出：

```json
{
  "data": {
    "walletAddress": "0x...",
    "nonce": "random-string",
    "message": "Sign this message to login..."
  }
}
```

#### `POST /api/nbcWallet/auth/verify`

输入：

```json
{
  "walletAddress": "0x...",
  "signature": "0x...",
  "nonce": "random-string"
}
```

输出建议兼容当前前台会话模式：

```json
{
  "data": {
    "sid": "<session-id>",
    "customer": {
      "uuid": "...",
      "email": "wallet_0xabc...@nbc.local",
      "fullName": "0xabc...def"
    },
    "wallet": {
      "address": "0x..."
    }
  }
}
```

如需 API token，再补一个 token 版接口：

- `POST /api/nbcWallet/auth/token`

### 4.3 与当前 customer 体系的桥接方式

校验签名成功后：

1. 查 `nbc_wallet.wallet_address`
2. 若存在，取出 `customer_id`
3. 若不存在：
   - 新建 `customer`
   - 自动生成占位 email，如 `wallet_<lowercaseAddress>@nbc.local`
   - `full_name` 存短地址展示值
   - 再创建 `nbc_wallet`
4. 设置 `request.session.customerID`
5. 设置 `request.locals.customer`

这样以下逻辑无需推翻：

- `request.getCurrentCustomer()`
- `myCart`
- `/account`
- `currentCustomer`
- `order.customer_id`

### 4.4 为什么不建议第一版直接把钱包地址塞进 session

因为当前大量代码只认：

- `session.customerID`
- `locals.customer.customer_id`

如果直接改成 `session.walletAddress`：

- 账户页失效
- 订单历史失效
- 购物车绑定失效
- customer GraphQL 失效

---

## 5. NBC 支付接入定义

### 5.1 支付方式编码

统一使用：

```text
nbc_wallet
```

### 5.2 支付状态定义

参考 Stripe / PayPal 的做法，在扩展 `bootstrap.ts` 里向 `oms` 注册：

- `nbc_pending`
- `nbc_paid`
- `nbc_failed`
- `nbc_refunded`
- `nbc_partial_refunded`

并补 `psoMapping`。

### 5.3 前台支付行为

前台应按现有支付组件方式接入：

- 在 `pages/frontStore/checkout/NbcWallet.tsx` 注册 payment component
- 通过 `checkoutFormAfter` 挂载

推荐行为：

1. 用户选中 `nbc_wallet`
2. 点下单按钮时先执行现有 `checkout()`
3. 订单创建成功后拿到 `order.uuid`
4. 调用 `/api/nbcWallet/orders/:orderUuid/capture`
5. capture 成功后跳转成功页

### 5.4 capture API 的职责

`POST /api/nbcWallet/orders/:order_uuid/capture`

职责：

- 校验订单存在且 `payment_method = 'nbc_wallet'`
- 校验当前 customer 与订单 customer 一致
- 幂等判断，避免重复扣款
- 行锁读取 `nbc_wallet`
- 校验可用余额
- 扣减余额
- 写 `nbc_wallet_transaction`
- 写 `nbc_order_usage`
- 更新 `order.payment_status`
- 触发 `order_placed`

### 5.5 为什么不直接在 `registerPaymentMethod().validator()` 里做用户级控制

因为当前 `validator()` 是全局可用性判断，不带 request/customer 上下文。

所以：

- 是否启用 `nbc_wallet` 可以在 validator 里判断
- 是否允许当前用户真正支付，必须在 checkout/capture 阶段再次校验

### 5.6 guest checkout 的兼容策略

建议第一阶段规则：

- guest 仍可浏览、加购、走其他支付方式
- 只有 `nbc_wallet` 支付要求先完成钱包登录

后端兜底：

- 若 `payment_method === 'nbc_wallet'` 且没有 `currentCustomer`
- 或没有对应 `nbc_wallet`
- 则阻止下单或阻止 capture

---

## 6. GraphQL 与前端数据定义修正

原先文档里 `Wallet.balance: Int!` 这类设计不适合当前实现，原因有两个：

1. GraphQL `Int` 是 32 位，不适合钱包余额
2. NBC 如果要兼容链上最小单位，金额会远超 `Int`

### 6.1 推荐 GraphQL 字段

```graphql
type NbcWallet {
  walletId: ID!
  uuid: String!
  walletAddress: String!
  balance: String!
  frozenBalance: String!
  availableBalance: String!
  balanceDisplay: String!
  currency: String!
}

type NbcWalletTransaction {
  transactionId: ID!
  uuid: String!
  transactionType: String!
  amount: String!
  balanceBefore: String!
  balanceAfter: String!
  cnyAmount: Float
  createdAt: Date!
}

extend type Query {
  currentNbcWallet: NbcWallet
  currentNbcWalletTransactions(page: Int, limit: Int): [NbcWalletTransaction!]!
}
```

结论：

- 精确金额一律返回 `String`
- 仅展示型金额才用 `Float`

---

## 7. 推荐扩展目录

基于当前代码，第一版建议直接建立：

```text
extensions/nbc-wallet/
  package.json
  tsconfig.json
  src/
    bootstrap.ts
    api/
      authRequest/
        route.json
        [bodyParser]request.ts
      authVerify/
        route.json
        [bodyParser]verify.ts
      captureNbcOrder/
        route.json
        [bodyParser]capture.ts
      refundNbcOrder/
        route.json
        [bodyParser]refund.ts
      getWalletBalance/
        route.json
        getBalance.ts
    graphql/
      types/
        NbcWallet/
          NbcWallet.graphql
          NbcWallet.resolvers.ts
        extend/
          Order.graphql
          Order.resolvers.ts
    services/
      auth/
        verifyWalletSignature.ts
        upsertWalletCustomer.ts
      wallet/
        getWalletByCustomerId.ts
        captureOrderPayment.ts
        refundOrderPayment.ts
        formatNbcAmount.ts
    migration/
      Version-1.0.0.js
    pages/
      frontStore/
        checkout/
          NbcWallet.tsx
      frontStore/
        all/
          WalletBadge.tsx
```

---

## 8. 第一阶段明确不做的事

为了保证无缝接入，第一阶段建议先不做下面这些高耦合改造：

- 不直接删除 `customer` 登录体系
- 不直接重写 `/account/login` 页面
- 不直接把核心 checkout 改成钱包专属流程
- 不在第一版引入链上实时扣款
- 不在第一版支持多钱包绑定同一 customer
- 不在第一版支持匿名钱包余额长期持久化

---

## 9. 实施顺序

### Phase 1

- 建 `extensions/nbc-wallet`
- 补 `config/default.json`
- 建 migration
- 跑通钱包登录桥接

### Phase 2

- 注册 `nbc_wallet` payment method
- 接入 checkout 前台支付组件
- 完成 capture / refund

### Phase 3

- GraphQL 扩展
- 钱包余额与流水页面
- 管理后台余额调账

### Phase 4

- 登录页主题化替换
- wallet-only 体验收敛
- 链上充值监听与归集

---

## 10. 最终建议

当前仓库要“无缝衔接”，最关键的不是先写链上逻辑，而是先统一这条原则：

> 钱包是新的登录入口和支付资金来源，但在 EverShop 内部，第一阶段仍然通过 `customer`、`cart.customer_id`、`order.customer_id` 来承接现有业务链路。

只有这样，才能真正做到：

- 不推翻当前 account / order / cart
- 不重写 checkout 核心
- 不破坏 Stripe / PayPal / COD 现有模式
- 让 NBC 模块以扩展方式自然插入当前系统

