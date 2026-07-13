# NBC 商城后端安全加固清单

## 高优先级

1. 管理后台必须启用强密码与登录保护
   - 当前后台账号可直接重置，缺少 2FA、登录失败限流、IP 白名单。
   - 建议：管理员密码策略、登录失败锁定、2FA、后台路径访问 IP 白名单。

2. [已完成] 提现私钥必须从配置文件迁移到密钥管理
   - 已完成：代码已禁止从 config 读取 `treasuryPrivateKey`，只允许通过 `NBC_WALLET_TREASURY_PRIVATE_KEY` 环境变量提供。
   - 建议：禁止把私钥写入仓库、备份包、PM2 dump。

3. [已完成] 提现流程增加二次确认和风控阈值
   - 已有审核制，但“审核通过”和“打款”仍可由同一后台账号完成。
   - 建议：大额提现双人审批、每日总额限额、单地址频率限制、异常地址黑名单。

4. [已完成] 钱包登录 nonce 加固
   - 需要确认 nonce 单次使用、过期、域名绑定、chainId 绑定都强制校验。
   - 建议：签名消息包含 domain、chainId、nonce、过期时间、用途；使用后立即失效。

5. [已完成] 入金扫链幂等与回滚保护
   - 已有 `(chain_id, tx_hash, log_index)` 唯一约束。
   - 建议：对 native 转账用稳定 log_index 替代 transactionIndex 风险；重组确认数生产环境不要为 0。

6. [已完成] API 限流
   - 登录、提现、入金地址、链上余额查询目前应增加 rate limit。
   - 建议：按 IP + customer_id + wallet_address 做限流，错误响应统一。

## 中优先级

1. 邮箱绑定必须验证码确认
   - 本次新增邮箱绑定资料表，但 `email_verified_at` 仍为 NULL。
   - 建议：发验证码或魔术链接，验证后才允许重要通知和敏感操作提醒。

2. 通知可靠性
   - 本次新增通知队列，满足 10 条或 5 分钟批量发送。
   - 建议：失败重试、退避、死信队列、后台可查看发送状态。

3. 多资产账本一致性
   - 新增 `nbc_wallet_asset_balance`，NBC 仍兼容旧余额字段。
   - 建议：后续把订单支付、退款、后台调账也迁移到资产维度，避免长期双写。

4. 后台操作审计
   - 已有部分 audit log。
   - 建议：所有审核/驳回/打款/调账记录管理员 ID、IP、User-Agent、前后状态。

5. 数据库约束补全
   - 建议：`asset_symbol` 白名单约束、提现金额正数约束、通知状态枚举约束。

6. SSR/前端输出转义复核
   - 管理端展示 tx hash、地址、错误信息。
   - 建议：所有链上字符串只按纯文本渲染，不使用 HTML 注入。

## 低优先级

1. 日志脱敏
   - 不打印私钥、完整 session、授权头。
   - tx hash 和地址可保留，但用户邮箱建议部分脱敏。

2. 监控告警
   - 扫链延迟、提现 processing 超时、通知失败、余额对账差异都应告警。

3. 备份与恢复演练
   - 重点备份：wallet、asset_balance、transaction、withdrawal、onchain_deposit、notification_queue。

4. 依赖升级策略
   - 定期审查 ethers、body-parser、EverShop 依赖安全公告。

## 本次变更后的剩余风险

- 已验证 USDT 合约 `0x4E4D07268eFFB4d3507a69F64b5780Eb16551f85` 的 `decimals = 6`；生产配置需保持一致。
- 邮件服务未配置时，通知会入队但发送会失败；需要配置 EverShop email service。
- 邮箱绑定当前是“绑定/未验证”，还需要验证码流程才能算完成。
