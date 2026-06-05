# NBC 钱包后端 Review 与待完善功能

Review 日期：2026-06-04  
对照文档：[NBC_Store_Main_Flow_Curl.md](./NBC_Store_Main_Flow_Curl.md)、[NBC_Store_API.md](./NBC_Store_API.md)  
代码范围：`extensions/nbc-wallet`

---

## 1. 总体结论

当前钱包后端是 **「内部账本 + 商城支付」** 形态，链上入金/审核出金仅搭了骨架。

| 维度 | 评价 | 说明 |
|------|------|------|
| 商城内可用性 | ⭐⭐⭐⭐ | Curl 主流程已验证：登录 → 加款 → 下单 → capture → 流水 |
| 链上入金 | ⭐⭐ | ERC20 扫块入账代码存在，默认关闭，主流程未验证，存在精度风险 |
| USDT 入金 | ☆ | 未实现（`nbcusdt` 仅用于汇率行情） |
| 审核出金 | ⭐⭐ | 有 API 与前台申请，无后台 UI、无完整审核态、存在双花风险 |
| 邮件通知 | ☆ | 入金/出金均无邮件 |
| 生产安全 | ⭐⭐ | 登录与账本基础尚可，出金事务与密钥管理未达标 |

**与业务基本需求的对照：**

| 需求 | 现状 |
|------|------|
| 入金 NBC | 部分可用（ERC20 → 金库 + 后台手工加款；原生主链币转账未支持） |
| 入金 USDT | 未实现 |
| 出金需审核 | 半实现（`requested` → 管理员 `process`/`fail`，无独立审核态与后台页） |
| 邮件通知出入金 | 未实现 |

**粗估离生产：** 商城内支付约 70% 可用；链上出入金生产闭环约 35–40%。完整满足 NBC+USDT 入金、审核出金、邮件通知，预计还需 **1–2 个迭代（约 4–8 周，视 USDT 与风控范围而定）**。

---

## 2. 与 Curl 主流程文档的对照

[NBC_Store_Main_Flow_Curl.md](./NBC_Store_Main_Flow_Curl.md)（2026-05-19 测试环境）验证的是 **商城主流程 + 内部余额支付**，不是真实链上出入金。

| 步骤 | 接口/行为 | 与出入金关系 |
|------|-----------|----------------|
| 2–3 | 钱包签名登录 | ✅ 身份链路可用 |
| 5 | `POST /api/admin/nbcWallet/adjust` 手工加款 | ⚠️ **运营入账**，非链上入金 |
| 6–17 | 余额、购物车、下单、capture、流水 | ✅ 内部扣款可用 |

**文档未覆盖、需在测试中补全：**

- `POST /api/nbcWallet/withdraw` — 用户申请出金
- `POST /api/admin/nbcWallet/withdrawals/process` — 审核通过并链上打款
- `POST /api/admin/nbcWallet/withdrawals/fail` — 拒绝并解冻
- `POST /api/admin/nbcWallet/onchain/process` — 手动触发链上入金扫描
- 任意 USDT 相关接口（当前不存在）

---

## 3. 入金（Deposit）Review

### 3.1 已实现

| 能力 | 实现位置 | 说明 |
|------|----------|------|
| ERC20 扫块入账 | `processOnchainDeposits.ts` | 监听 `Transfer` 到 `treasuryAddress` |
| 入账结算 | `recordOnchainDeposit.ts` → `settleOnchainDeposit.ts` | 贷记内部余额，流水类型 `onchain_deposit` |
| 手工加款 | `adjustWalletBalance.ts` | 后台 `admin/nbcWallet/adjust` |
| 对账补单 | `reconcileWalletLedger.ts` + cron | 处理 `pending` / `failed` / `unmatched` |
| 链上余额查询 | `getOnchainNbcBalance.ts` | 支持 ERC20 或 native（仅查询） |

默认配置（`config/default.json`）：`onchain.enabled: 0`，`tokenAddress`、`treasuryAddress` 为空，**链上入金默认关闭**。

### 3.2 差距与风险

| 级别 | 问题 |
|------|------|
| 🔴 | **账本单位与链上 raw value 可能不一致**：商城扣款按整数 NBC（如 4000 NBC = $40），链上入账直接使用 event `value`（常为 wei），若 token 为 18 位小数，内部余额与链上金额尺度不统一 |
| 🔴 | **USDT 入金未实现**：全局仅一个 `tokenAddress`，无法同时支持 NBC 与 USDT |
| 🟠 | **原生 NBC 主链币转账不能入账**：`processOnchainDeposits` 只扫 ERC20 日志，不监听 native transfer |
| 🟠 | **未注册用户先入金**：链上先到、后登录 → 状态 `unmatched`，依赖对账或人工 |
| 🟡 | 入金成功/失败无邮件、无用户侧充值指引产品化（二维码、最小金额、确认数说明） |

---

## 4. 出金（Withdrawal）Review

### 4.1 已实现

| 步骤 | 实现 | 说明 |
|------|------|------|
| 用户申请 | `requestWithdrawal.ts` | 校验可用余额 → 增加 `frozen_balance` → `nbc_withdrawal.status = requested` |
| 管理员打款 | `processWithdrawal.ts` | 链上 `token.transfer` + 扣余额 + 解冻 + 流水 `withdrawal` |
| 管理员拒绝 | `failWithdrawal.ts` | 状态 `failed` + 解冻 |
| 前台 UI | `NbcWalletAccountSection.tsx` | 可申请出金、查看最近记录 |
| 出金地址 | 固定为绑定 `wallet_address` | 不可填任意地址（安全上合理） |

相关 API（**尚未写入 [NBC_Store_API.md](./NBC_Store_API.md)**）：

- `POST /api/nbcWallet/withdraw` — 用户申请
- `GET /api/nbcWallet/withdrawals` — 用户列表
- `POST /api/admin/nbcWallet/withdrawals/process` — 处理
- `POST /api/admin/nbcWallet/withdrawals/fail` — 拒绝

### 4.2 差距与风险

| 级别 | 问题 |
|------|------|
| 🔴 | **双花风险**：`processWithdrawal` 在 DB 事务内发链上交易；若 `tx.wait()` 成功但 DB commit 失败，回滚后状态仍为 `requested`，重试可能再次打款 |
| 🔴 | **金库私钥**：`nbcWallet.onchain.treasuryPrivateKey` 存配置文件，生产需 KMS/HSM 或独立签名服务 |
| 🟠 | **无完整审核工作流**：缺少 `approved`、`processing` 等中间态；无双人复核、限额审批 |
| 🟠 | **无后台出金管理 UI**：运营只能靠 API + `withdrawal_uuid`，无列表/筛选/批量操作 |
| 🟡 | 无单笔/日累计限额、冷却期、地址黑名单 |

---

## 5. 邮件通知

扩展内 **无** 入金/出金邮件逻辑（未集成 SendGrid/Resend，无 event hook）。

| 现状 | 影响 |
|------|------|
| 钱包用户邮箱为影子账号 `wallet_0x...@nbc.local` | 无法向真实邮箱发通知 |
| 结账联系人邮箱与钱包流水未绑定 | 即使用户填了邮箱，出入金也不通知 |

---

## 6. 安全性 Review

### 6.1 已做得较好

- 钱包登录：nonce 一次性 + 过期 + `ethers.verifyMessage`
- 支付扣款：`FOR UPDATE`、订单幂等、余额校验
- 链上入金：`(chain_id, tx_hash, log_index)` 唯一约束防重复入账
- 账本：流水含 `balance_before` / `balance_after`，有对账任务

### 6.2 待加固

| 级别 | 项 |
|------|-----|
| 🔴 | 出金链上与 DB 事务分离、幂等重试 |
| 🔴 | 金库密钥脱离明文配置 |
| 🔴 | 链上/账本单位统一与精度测试 |
| 🟠 | 后台 `adjust` 任意大额加款，缺二次确认与权限分级 |
| 🟠 | 配置中勿提交真实 `accessKey` / 私钥（`default.json` 含 market key 示例） |
| 🟡 | 入金/出金频率限制、审计日志规范 |

---

## 7. 待完善功能清单（按优先级）

### P0 — 上线前必须完成

| # | 功能 | 说明 | 建议实现要点 |
|---|------|------|----------------|
| P0-1 | **统一资产精度与单位** | 明确内部 NBC 最小单位与链上 wei 的换算规则 | 入金 settlement、出金 transfer、商城扣款共用同一套 `amount` 语义；补单元测试 |
| P0-2 | **出金防双花** | 修复 `processWithdrawal` 事务与链上顺序 | 建议：`requested → processing`（写入 `tx_hash`）→ 链上确认 → `completed`；失败可补偿；禁止 rollback 后重复打款 |
| P0-3 | **金库密钥安全** | 私钥不得落配置文件 | 环境变量 / KMS / 独立签名服务；生产禁用明文 `treasuryPrivateKey` |
| P0-4 | **开启并验证 NBC 链上入金** | 配置 `onchain.enabled`、`tokenAddress`、`treasuryAddress` | 在测试网跑通：转账 → cron/手动 process → 余额增加 → 流水；补充 Curl 用例 |
| P0-5 | **出金审核最小闭环** | 满足「出金需审核」 | 状态机：`requested → approved → processing → completed \| failed`；至少保留「人工批准」与「打款」可分离（或等价审计日志） |
| P0-6 | **后台出金管理页** | 运营可审核，不依赖裸 API | 列表（状态/时间/金额/地址）、通过/拒绝、展示 `tx_hash`、操作人 |

### P1 — 业务基本需求

| # | 功能 | 说明 | 建议实现要点 |
|---|------|------|----------------|
| P1-1 | **USDT 入金** | 支持 NBC + USDT 两种入金 | 多 token 配置或多表字段；分别扫块；内部余额分币种或统一折算（产品定） |
| P1-2 | **原生 NBC 入金**（若业务需要） | 用户转主链币到金库 | 监听 native transfer 或明确仅支持 ERC20 并在产品说明 |
| P1-3 | **邮件通知 — 入金** | 到账/失败/待确认 | 绑定真实邮箱（注册/KYC/账户设置）；模板：金额、tx、时间 |
| P1-4 | **邮件通知 — 出金** | 申请/通过/拒绝/到账 | 同上；含 `withdrawal_uuid`、链上 hash |
| P1-5 | **API 与 Curl 文档** | 出入金纳入主流程文档 | 更新 [NBC_Store_API.md](./NBC_Store_API.md)、[NBC_Store_Main_Flow_Curl.md](./NBC_Store_Main_Flow_Curl.md) |
| P1-6 | **出金风控** | 限额与审计 | 单笔/日累计上限、最小出金额、admin 操作 audit log |
| P1-7 | **未匹配入金处理** | `unmatched` 运营工具 | 后台列表 + 手工关联钱包或退款流程 |

### P2 — 体验与运维增强

| # | 功能 | 说明 |
|---|------|------|
| P2-1 | 充值产品化 | 二维码、最小金额、确认块数、充值记录页 |
| P2-2 | 监控告警 | 扫块滞后、对账失败、金库余额不足、出金失败率 |
| P2-3 | 后台 NBC 订单按钮 | Capture/Refund 按钮接入订单详情（若尚未完全接通） |
| P2-4 | 下单冻结余额 | 利用已有 `frozen_balance`，下单占额、超时释放 |
| P2-5 | 部分退款 | 按金额/行项目拆分退款 |
| P2-6 | 同步 [NBC_Wallet_Closure_Checklist.md](./NBC_Wallet_Closure_Checklist.md) | 出金能力已部分实现，旧文档「无出金」描述需更新 |

---

## 8. 建议出金状态机（目标）

```text
用户申请
  → requested      （冻结余额）
  → approved       （运营审核通过，可选步骤）
  → processing     （已提交链上 tx，写入 tx_hash，不可回滚为 requested）
  → completed      （链上确认 + 扣账完成）
  → failed         （拒绝或链上失败，解冻余额）
```

与当前实现的差异：缺少 `approved`、`processing`；`process` 一步完成审核+打款且事务设计不安全。

---

## 9. 建议测试补充（Curl / 集成）

在 [NBC_Store_Main_Flow_Curl.md](./NBC_Store_Main_Flow_Curl.md) 同级新增或扩展章节：

1. 配置开启 onchain 后，向金库转入 NBC（或测试 token）→ 触发 `onchain/process` → 查余额与 `onchain_deposit` 流水  
2. 用户 `POST /nbcWallet/withdraw` → 后台 `withdrawals/process` → 查链上 hash 与余额  
3. 拒绝路径：`withdrawals/fail` → 冻结余额恢复  
4. （USDT 实现后）USDT 入金独立用例  
5. 邮件断言（实现后）：检查发送记录或 mock

---

## 10. 相关文档

| 文档 | 关系 |
|------|------|
| [NBC_Store_Main_Flow_Curl.md](./NBC_Store_Main_Flow_Curl.md) | 已验证商城支付；未覆盖链上出入金 |
| [NBC_Store_API.md](./NBC_Store_API.md) | 缺出金 API 说明 |
| [NBC_Wallet_Integration_Progress.md](./NBC_Wallet_Integration_Progress.md) | 集成进度（部分描述早于出金实现） |
| [NBC_Wallet_Closure_Checklist.md](./NBC_Wallet_Closure_Checklist.md) | 闭环检查（§3.1 出金描述已过时，以本文为准） |

---

## 11. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-06-04 | 初版：基于代码与 Curl 主流程的后端 Review 与待完善功能清单 |
