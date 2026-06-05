# NBC 钱包集成进度与明细

最后基于当前代码检查日期：2026-06-04

> **生产环境差距、安全 Review、待完善功能（P0/P1/P2）** 见 [NBC_Wallet_Production_Review.md](./NBC_Wallet_Production_Review.md)。

## 1. 整体进度

NBC 钱包功能目前以 EverShop 扩展的方式接入，扩展目录为 `extensions/nbc-wallet`。

当前状态：后端 **商城支付主链路** 已基本完成（Curl 主流程已验证，见 [NBC_Store_Main_Flow_Curl.md](./NBC_Store_Main_Flow_Curl.md)）。扩展可注册 NBC 钱包支付、钱包签名登录、内部余额与账本、订单扣款/退款、后台调账、链上 ERC20 入金扫描、用户出金申请与后台 process/fail。**USDT 入金、邮件通知、生产级出金审核与后台 UI 尚未完成。**

前端状态：已有 checkout 支付、登录/注册钱包入口、账户页（余额、流水、出金申请）。后台出金管理页仍缺失。

## 2. 扩展注册

配置位置：`config/default.json`

- 扩展名称：`nbc-wallet`
- 扩展路径：`extensions/nbc-wallet`
- 是否启用：`true`
- 优先级：`10`

扩展启动文件：`extensions/nbc-wallet/src/bootstrap.ts`

启动时当前完成的事情：

- 注册 OMS 订单支付状态：
  - `nbc_pending`
  - `nbc_paid`
  - `nbc_failed`
  - `nbc_refunded`
  - `nbc_partial_refunded`
- 增加支付状态到订单状态的映射关系。
- 注册 EverShop 支付方式：
  - 支付方式代码：`nbc_wallet`
  - 展示名称：读取 `nbcWallet.displayName`，默认是 `NBC Wallet`
- 注册链上充值轮询任务：`nbcWalletOnchainDepositPoller`
- 注册钱包账本对账任务：`nbcWalletReconcileLedger`

## 3. 配置项

钱包配置目前在 `config/default.json` 的 `nbcWallet` 节点下。

已实现的配置字段：

- `nbcWallet.status`：控制支付方式是否启用。
- `nbcWallet.displayName`：支付方式展示名称。
- `nbcWallet.auth.nonceTtlSeconds`：签名 nonce 有效期，默认 600 秒。
- `nbcWallet.auth.messagePrefix`：钱包签名消息前缀。
- `nbcWallet.exchangeRate.NBC_TO_CNY`：NBC 到 CNY 的兜底汇率，默认 `0.01`。
- `nbcWallet.onchain.enabled`：是否启用链上充值轮询。
- `nbcWallet.onchain.rpcUrl`：JSON-RPC 节点地址。
- `nbcWallet.onchain.chainId`：链 ID。
- `nbcWallet.onchain.tokenAddress`：NBC token 合约地址。
- `nbcWallet.onchain.treasuryAddress`：收款金库地址。
- `nbcWallet.onchain.startBlock`：初始同步区块。
- `nbcWallet.onchain.confirmations`：确认区块数。
- `nbcWallet.onchain.blockBatchSize`：每次轮询最大区块范围。
- `nbcWallet.onchain.pollSchedule`：链上轮询 cron 表达式。
- `nbcWallet.reconcile.enabled`：是否启用账本对账任务。
- `nbcWallet.reconcile.schedule`：对账任务 cron 表达式。

当前默认配置中链上轮询是关闭状态：

```json
"onchain": {
  "enabled": 0
}
```

## 4. 数据库表

迁移文件：`extensions/nbc-wallet/src/migration/Version-1.0.0.ts`

已创建的数据表：

- `nbc_wallet`
  - 每个客户对应一个 NBC 钱包。
  - 存储钱包地址、链 ID、总余额、冻结余额、状态、最后登录时间。
  - 约束 `customer_id` 唯一，`wallet_address` 唯一。

- `nbc_wallet_transaction`
  - 钱包余额变化账本表。
  - 支持 `debit`、`refund`、`admin_credit`、`admin_debit`、`onchain_deposit` 等交易类型。
  - 存储变更前余额、变更后余额、可选订单关联、汇率、CNY 金额、业务引用、状态、元数据。

- `nbc_order_usage`
  - 记录 EverShop 订单消耗了多少 NBC。
  - 约束一个订单只能有一条 NBC 使用记录。

- `nbc_exchange_rate`
  - 存储汇率 key 和 value。
  - 初始化写入 `NBC_TO_CNY = 0.01`。

- `nbc_wallet_auth_nonce`
  - 存储每个钱包地址当前有效的签名 nonce。
  - 记录签名消息、过期时间、使用时间。

- `nbc_onchain_deposit`
  - 记录进入金库地址的 token 转账事件。
  - 通过 `(chain_id, tx_hash, log_index)` 保证链上事件唯一。
  - 支持 `pending`、`completed`、`unmatched`、`failed` 等状态。

- `nbc_sync_state`
  - 存储链上同步游标，例如最后处理到的区块高度。

## 5. 对外 API

EverShop 会自动给扩展 API 路由增加 `/api` 前缀。代码里的 `route.json` 写的是 `/nbcWallet/auth/request`，真实 HTTP 路径是 `/api/nbcWallet/auth/request`。

### 钱包签名登录

`POST /api/nbcWallet/auth/request`

- 访问权限：public
- 请求体：`walletAddress`
- 使用 `ethers.isAddress` 校验钱包地址。
- 生成 nonce 和待签名消息。
- 写入或更新 `nbc_wallet_auth_nonce`。
- 返回钱包地址、nonce、签名消息、过期时间。

`POST /api/nbcWallet/auth/verify`

- 访问权限：public
- 请求体：`walletAddress`、`nonce`、`signature`
- 消耗未使用且未过期的 nonce。
- 使用 `ethers.verifyMessage` 校验签名。
- 查找或创建影子客户账号。
- 创建或更新 `nbc_wallet`。
- 建立前台客户 session。

### 客户钱包接口

`GET /api/nbcWallet/balance`

- 路由配置是 public，但 handler 内部要求当前客户已登录。
- 返回当前登录客户的钱包汇总。
- 包含总余额、冻结余额、可用余额、汇率、CNY 估值。

`GET /api/nbcWallet/transactions`

- 路由配置是 public，但 handler 内部要求当前客户已登录。
- 支持 `page`、`limit`、`transactionType` 查询参数。
- 返回分页 NBC 钱包账本记录。

### Checkout 支付接口

`POST /api/nbcWallet/orders/capture`

- 路由配置是 public，但 handler 内部要求当前客户已登录。
- 请求体：`order_uuid`
- 校验订单归属当前客户。
- 要求订单支付方式为 `nbc_wallet`。
- 根据订单 `grand_total` 和 `NBC_TO_CNY` 汇率计算 NBC 扣款数量。
- 扣减钱包余额。
- 写入 `nbc_wallet_transaction`，交易类型为 `debit`。
- 写入 `nbc_order_usage`。
- 更新订单支付状态为 `nbc_paid`。
- 扣款后触发订单事件。
- 幂等处理目前依赖已有 `nbc_order_usage` 和已有 `nbc_paid` 状态判断。

### 后台操作接口

`POST /api/admin/nbcWallet/adjust`

- 访问权限：后台 private。
- 支持使用以下任意一个字段定位钱包：
  - `walletId`
  - `customerId`
  - `walletAddress`
- 支持请求字段：
  - `type`：`credit` 或 `debit`
  - `amount`：正整数
  - `reason`
  - `reference`
- 在数据库事务内更新钱包余额。
- 写入 `admin_credit` 或 `admin_debit` 类型账本。

`POST /api/admin/nbcWallet/reconcile`

- 访问权限：后台 private。
- 可选请求体：`limit`
- 重新处理 `pending`、`failed`、`unmatched` 状态的链上充值记录。

`POST /api/admin/nbcWallet/onchain/process`

- 访问权限：后台 private。
- 手动触发链上充值轮询。

`POST /api/nbcWallet/orders/refund`

- 路由标记为 private。
- handler 内部额外要求后台管理员登录。
- 请求体：`order_uuid`
- 要求订单支付方式为 `nbc_wallet`。
- 查找 `nbc_order_usage`。
- 将订单消耗的 NBC 返还到钱包。
- 写入 `refund` 类型账本。
- 更新订单支付状态为 `nbc_refunded`。

## 6. 钱包客户模型

钱包首次签名登录时：

- 钱包地址会通过 `ethers.getAddress(address).toLowerCase()` 标准化。
- 系统创建一个 EverShop 影子客户。
- 影子客户邮箱格式：`wallet_<address>@nbc.local`
- 影子客户名称格式：钱包地址前 6 位和后 4 位。
- 系统生成随机密码并哈希保存；普通密码登录不是这个账号的主要入口。
- 在 `nbc_wallet` 中创建一条余额为 0 的钱包记录。

后续再次登录时：

- 加载已有钱包和客户。
- 刷新 `last_login_at`。
- 将客户 ID 写入 `request.session.customerID`。

## 7. 余额与账本规则

金额以 NBC 整数单位存储，数据库字段使用 PostgreSQL `numeric(36,0)`。

当前已实现的交易类型：

- `debit`：订单扣款。
- `refund`：订单退款。
- `admin_credit`：后台人工加款。
- `admin_debit`：后台人工扣款。
- `onchain_deposit`：链上充值入账。

余额保护：

- 数据库约束钱包余额和冻结余额不能为负数。
- 后台人工扣款会拒绝余额不足的操作。
- 订单扣款检查可用余额：`balance - frozen_balance`。
- 链上充值金额必须大于 0。

## 8. 链上充值流程

已实现服务：`processOnchainDeposits`

流程：

1. 读取链上配置。
2. 要求链上监听已启用且配置完整。
3. 使用 `ethers.JsonRpcProvider` 连接 RPC。
4. 获取最新区块高度。
5. 根据确认区块数计算安全区块高度。
6. 从 `nbc_sync_state` 读取同步游标。
7. 拉取 ERC-20 `Transfer(address,address,uint256)` 日志，其中 `to` 地址必须是金库地址。
8. 将每一条充值事件写入 `nbc_onchain_deposit`。
9. 如果能匹配到钱包，则进行入账：
   - 增加钱包余额。
   - 写入 `onchain_deposit` 类型账本。
   - 将充值记录标记为 `completed`。
10. 更新同步游标，记录最后处理区块。

如果充值来源地址没有匹配到本地钱包，记录会被标记为 `unmatched`。

## 9. 对账流程

已实现服务：`reconcileWalletLedger`

它会扫描 `nbc_onchain_deposit` 中以下状态的记录：

- `pending`
- `failed`
- `unmatched`

然后逐条调用 `settleOnchainDeposit` 重新尝试入账。这样即使链上事件首次记录时钱包还不存在，后续钱包创建后也可以通过对账任务补入账。

## 10. 前端集成

已实现前端文件：

- `extensions/nbc-wallet/src/pages/frontStore/checkout/NbcWallet.tsx`

当前行为：

- 注册 `nbc_wallet` 支付组件。
- 展示支付方式名称 `NBC Wallet`。
- 展示简短说明：`Pay directly with your NBC wallet balance.`
- 将 checkout 按钮文案改为 `Pay with NBC Wallet`。
- EverShop 创建订单后调用 `captureAPI`。
- 扣款成功后跳转到 checkout success 页面。
- 扣款失败时通过 toast 展示错误。

当前代码中还未实现：

- 钱包连接按钮。
- 签名请求/签名验证 UI。
- 钱包退出登录/切换钱包 UI。
- 钱包余额页或顶部余额展示。
- 交易流水页。
- 后台钱包管理页面。
- 后台链上充值/对账管理页面。

## 11. 部署验证情况

已在部署服务器上验证：

- PostgreSQL 迁移已创建 NBC 钱包相关表。
- `nbc_wallet` 相关表存在。
- 首页返回 `200`。
- 后台登录页返回 `200`。
- `POST /api/nbcWallet/auth/request` 返回 `200`。
- 未带客户 session 访问 `GET /api/nbcWallet/balance` 返回 `401 Customer login is required`，符合当前 handler 行为。

补充：`docs/NBC_Wallet_Curl_Test_Plan.md` 中已经通过 curl 跑过真实测试环境链路，包括签名请求、签名验证登录、查询余额、后台调账、查询流水。

## 12. 当前缺口与风险

上线前需要重点处理的问题：

- API 文档需要统一使用真实路径 `/api/...`。现有 `docs/NBC_Store_API.md` 里仍有 `/nbcWallet/auth/request` 这类未加 `/api` 前缀的路径。
- 钱包签名验证需要真实钱包签名，目前未看到自动化测试覆盖。
- 还没有专门的前端钱包连接/登录流程。
- 还没有客户侧钱包中心页面。
- 还没有后台钱包运营页面。
- 后台调账、退款、链上处理接口已存在，但还缺少运营 UI 和更细的权限控制。
- 链上监听已实现，但默认关闭，需要配置真实 RPC、token 地址、金库地址后才能用于生产或预发。
- 除 nonce 过期和一次性使用外，目前未看到额外的限流或防刷策略。
- `calculateNbcAmount` 使用 `Math.floor(cnyAmount / rate)`，业务上需要确认取整和结算规则。
- 多处服务逻辑将 `numeric(36,0)` 转成 JavaScript `Number`，超大余额可能超过安全整数范围。
- 多个 handler 直接返回 `error.message`，生产环境需要考虑错误信息暴露。
- 订单扣款后触发 `order_placed` 事件，是否符合 EverShop 原有订单生命周期语义还需要复核。

## 13. 建议下一阶段

建议第二阶段工作：

1. 修正 API 文档路径，统一补上 `/api` 前缀。
2. 增加前端钱包连接和签名登录流程。
3. 增加客户侧钱包余额与交易流水页面。
4. 增加后台钱包调账和账本查看页面。
5. 补集成测试，覆盖签名请求、签名验证、订单扣款、退款、后台调账、链上入账。
6. 复核金额精度，把不安全的 `Number` 转换改成 bigint 或 decimal-safe 处理。
7. 在预发环境配置真实链上监听并测试完整充值链路。
8. 给钱包登录接口增加限流，并收敛生产环境错误返回。
