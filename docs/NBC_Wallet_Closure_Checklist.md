# NBC Web3 钱包集成闭环检查清单

最后检查日期：2026-06-04

> **生产 Review 与待完善功能（P0/P1/P2）** 见 [NBC_Wallet_Production_Review.md](./NBC_Wallet_Production_Review.md)。

## 1. 当前结论

基于当前代码，NBC Web3 钱包集成已经完成了大部分主链路，但离生产环境仍有明显差距。

目前可以认为：

- 钱包签名登录：已接通
- 钱包账户页与余额展示：已接通
- 链上充值入账到商城余额：代码已接通（默认配置关闭，需验证精度与 Curl 用例）
- NBC 余额下单支付：已接通（见 [NBC_Store_Main_Flow_Curl.md](./NBC_Store_Main_Flow_Curl.md)）
- NBC 订单退款回商城余额：已接通
- 后台人工调账与账本对账：已接通
- 用户出金申请 + 后台 process/fail API：已接通（**无后台 UI，事务安全未达标**）

但以下能力还没有真正闭环：

- 出金审核工作流与后台管理页（生产级）
- USDT 入金、邮件通知出入金
- 链上/账本单位统一、出金防双花、密钥托管
- 后台订单页的 NBC 专属运营按钮
- 充值流程的产品化闭环
- API/Curl 文档与当前代码状态同步

---

## 2. 已闭环内容

### 2.1 钱包签名登录

当前代码已经具备完整的 Web3 钱包签名登录能力：

- 请求 nonce：`POST /api/nbcWallet/auth/request`
- 校验签名并建立客户会话：`POST /api/nbcWallet/auth/verify`
- 登录入口已经挂到前台登录页和注册页

相关代码：

- `extensions/nbc-wallet/src/api/authRequest`
- `extensions/nbc-wallet/src/api/authVerify`
- [WalletLoginEntry.tsx](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/pages/frontStore/login/WalletLoginEntry.tsx:1)
- [WalletLoginEntry.tsx](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/pages/frontStore/register/WalletLoginEntry.tsx:1)

### 2.2 钱包账户页

当前代码已经有钱包账户页组件，支持：

- 显示钱包地址
- 显示可用余额 / 总余额
- 显示 NBC 汇率
- 展示最近交易流水
- 手动刷新余额
- 展示链上充值目标地址

相关代码：

- [NbcWalletAccount.tsx](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/pages/frontStore/account/NbcWalletAccount.tsx:1)
- [NbcWalletAccountSection.tsx](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/components/NbcWalletAccountSection.tsx:39)

### 2.3 链上充值到商城余额

当前代码已经支持监听用户向金库地址转入 NBC，并入账到商城钱包余额：

- 读取链上转账日志
- 记录链上充值事件
- 匹配本地钱包
- 入账到 `nbc_wallet`
- 写入 `nbc_wallet_transaction`
- 更新同步游标

相关代码：

- [processOnchainDeposits.ts](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/services/wallet/processOnchainDeposits.ts:1)
- `extensions/nbc-wallet/src/services/wallet/recordOnchainDeposit.ts`
- `extensions/nbc-wallet/src/services/wallet/settleOnchainDeposit.ts`
- `extensions/nbc-wallet/src/crons/processOnchainDeposits.ts`

### 2.4 NBC 余额支付订单

当前代码已经支持在 checkout 选择 `nbc_wallet` 并完成余额扣款：

- checkout 页面注册 NBC 支付方式
- 校验钱包连接与余额是否充足
- 下单后自动调用 capture 接口
- 扣减钱包余额
- 写入订单 NBC 使用记录
- 更新订单支付状态为 `nbc_paid`

相关代码：

- [NbcWallet.tsx](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/pages/frontStore/checkout/NbcWallet.tsx:86)
- [captureOrderPayment.ts](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/services/wallet/captureOrderPayment.ts:1)
- `extensions/nbc-wallet/src/api/nbcWalletCapturePayment`

### 2.5 订单退款回商城余额

当前代码已经支持对 NBC 支付订单执行退款，并把 NBC 退回商城内部余额：

- 查找订单 NBC 使用记录
- 增加钱包余额
- 写入 `refund` 类型账本
- 更新订单支付状态为 `nbc_refunded`

相关代码：

- [refundOrderPayment.ts](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/services/wallet/refundOrderPayment.ts:12)
- `extensions/nbc-wallet/src/api/nbcWalletRefundPayment`

### 2.6 后台调账与对账

当前代码已经支持：

- 后台人工加款 / 扣款
- 手动触发链上充值处理
- 手动触发账本对账

相关代码：

- `extensions/nbc-wallet/src/api/nbcWalletAdminAdjust`
- `extensions/nbc-wallet/src/api/nbcWalletProcessDeposits`
- `extensions/nbc-wallet/src/api/nbcWalletReconcile`

---

## 3. 未闭环内容

### 3.1 P0：链上出金 / 提现未达生产闭环

**2026-06-04 更新：** 后端已有出金 API 与前台申请 UI，但尚未达到生产要求。详见 [NBC_Wallet_Production_Review.md](./NBC_Wallet_Production_Review.md) §4。

已实现（API 级）：

- 用户发起提现：`POST /api/nbcWallet/withdraw`（`requestWithdrawal.ts`）
- 后台打款：`POST /api/admin/nbcWallet/withdrawals/process`（链上 `transfer` + 扣账）
- 后台拒绝：`POST /api/admin/nbcWallet/withdrawals/fail`（解冻）
- 表：`nbc_withdrawal`（迁移 `Version-1.0.1.ts`）

仍缺失或未达标：

- 独立审核态（`approved` / `processing`）与后台出金列表页
- 链上成功 + DB 失败时的防双花
- 金库私钥安全托管
- 出金邮件通知与限额风控

说明：订单 **退款**（`refundOrderPayment.ts`）仍是退回商城内部余额，与 **出金**（提回链上钱包）是两条链路。

### 3.2 P0：后台订单页没有看到 NBC 专属操作按钮接入

当前后台订单页虽然预留了 `orderPaymentActions` 区域，但 `nbc-wallet` 没看到类似 Stripe / PayPal 的管理按钮组件接进去。

目前看到的是：

- 后台订单页有扩展区域：[Payment.jsx](/Users/vincent/IdeaProjects/nbcstore/packages/evershop/src/modules/oms/pages/admin/orderEdit/Payment.jsx:90)
- NBC 有 capture / refund API
- 但没有看到 admin 页面级 `CaptureButton` 或 `RefundButton` 组件

这意味着：

- 后台运营虽然“理论上可调用接口”
- 但没有形成页面操作闭环

### 3.3 P1：充值流程还不够产品化

当前充值体验更多是“技术可用”，不是“业务闭环”。

账户页现在只是展示：

- 金库地址
- 提示用户把 NBC 打到这个地址

缺少这些常见能力：

- 充值二维码
- 一键复制地址
- 充值状态提示
- 单笔充值记录页
- 到账中的状态
- 到账成功通知

相关位置：

- [NbcWalletAccountSection.tsx](/Users/vincent/IdeaProjects/nbcstore/extensions/nbc-wallet/src/components/NbcWalletAccountSection.tsx:141)

### 3.4 P1：支付失败后的用户补偿体验不完整

当前 checkout 中 NBC 支付流程是：

1. 先创建订单
2. 再调用 capture 扣款

如果 capture 失败：

- 页面会 toast 报错
- 但用户侧缺少更明确的“待支付订单后续处理入口”

这类场景通常还需要：

- 订单详情页继续支付
- 待支付订单重试支付
- 支付失败原因可见

从当前代码看，基础支付能力在，但失败补偿产品链路还不完整。

### 3.5 P2：文档状态没有跟上代码

当前已有文档仍把部分前端能力描述为“未完成”，但代码其实已经补上。

例如：

- 登录页钱包入口：已存在
- 注册页钱包入口：已存在
- 钱包账户页：已存在

这会导致排期和沟通判断偏差。

受影响文档：

- [NBC_Wallet_Integration_Progress.md](/Users/vincent/IdeaProjects/nbcstore/docs/NBC_Wallet_Integration_Progress.md:11)

---

## 4. 建议优先级

### P0：建议尽快补齐

- 用户链上出金 / 提现能力
- 后台订单页 NBC 专属 capture / refund 操作按钮

### P1：建议下一阶段补齐

- 充值流程产品化
- 支付失败后的订单重试与补偿体验

### P2：建议顺手修正

- 更新旧进度文档，让文档结论与当前代码一致

---

## 5. 一句话总结

当前 NBC Web3 钱包集成已经实现了：

- 登录
- 入金
- 余额支付
- 退款回余额
- 对账

但如果按完整业务闭环来判断，当前仍然缺：

- 真正链上出金
- 后台运营按钮闭环
- 充值与支付失败的完整产品链路
