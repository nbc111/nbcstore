# NBC 钱包后端集成方案

> 适用场景：EverShop 电商系统 + NBC 代币支付  
> 版本：v1.0 | 日期：2026-04-26  
> 作者：Agent-C（后端与集成专家）

---

## 1. NBC 代币接口说明

### 1.1 代币基本信息（假设）

假设 NBC 为 ERC-20 代币，部署在某条兼容 EVM 的链上（类比 Ethereum / BSC / Polygon）。

| 参数 | 值 |
|------|-----|
| 代币标准 | ERC-20 |
| 合约地址 | `0x...`（部署时配置） |
| 小数位数 | 18（标准） |
| 符号 | NBC |

### 1.2 合约方法

通过区块链节点的 JSON-RPC 接口调用：

```
# 查询余额
eth_call → balanceOf(address) → uint256

# 用户发起转账（用户侧操作，由用户钱包签名）
eth_sendTransaction → transfer(address to, uint256 amount)

# 商户/平台代付（需要授权 + 平台签名）
eth_sendTransaction → transferFrom(address from, address to, uint256 amount)
```

### 1.3 RPC 接口

使用标准 JSON-RPC 2.0，对接节点服务：

```
POST https://<node-rpc-url>
Headers: Content-Type: application/json

# 余额查询
{
  "jsonrpc": "2.0",
  "method": "eth_call",
  "params": [{
    "to": "0xNBC_CONTRACT_ADDRESS",
    "data": "0x70a08231000000000000000000000000<user_address_without_0x>"
  }, "latest"],
  "id": 1
}

# 发送交易（需私钥签名）
{
  "jsonrpc": "2.0",
  "method": "eth_sendTransaction",
  "params": [{ "to": "0x...", "data": "...", "gas": "..." }],
  "id": 1
}

# 获取交易收据（确认状态）
{
  "jsonrpc": "2.0",
  "method": "eth_getTransactionReceipt",
  "params": ["0x<tx_hash>"],
  "id": 1
}

# 获取区块高度（判断确认数）
{
  "jsonrpc": "2.0",
  "method": "eth_blockNumber",
  "params": [],
  "id": 1
}
```

---

## 2. 钱包服务架构

### 2.1 托管 vs 非托管对比

| 维度 | 非托管（用户自己掌控私钥） | 托管（平台代管余额） |
|------|--------------------------|-------------------|
| 用户体验 | 需连接 MetaMask 等钱包 | 直接用钱包地址，无需插件 |
| 安全责任 | 用户自持，平台无资产风险 | 平台持有资产，有安全风险 |
| 实现复杂度 | 高（需签名服务） | 低 |
| 适合场景 | DeFi / Web3 原生应用 | 电商 / 常规业务 |

### 2.2 推荐方案：**半托管模式**

EverShop 场景下推荐**半托管模式**，即：

- **用户侧**：用户使用钱包地址作为身份标识（无需注册），余额存储在**平台数据库**，由平台代管
- **底层资产**：平台持有用户链上地址的私钥（或通过 HD Wallet 管理）
- **充值**：用户通过链上转账（从自己的外部钱包）充值到平台地址
- **支付**：平台内部余额流转，无需每次上链

**原因**：
1. 电商场景下用户体验优先，不能要求每个买家都懂 Web3
2. 平台可控制支付流程、支持退款、订单取消等业务逻辑
3. 充值时上链确认，消除"假转账"
4. 内部流转不上链，大幅降低 Gas 成本和等待时间

```
┌─────────────────────────────────────────────────────┐
│                    用户端                            │
│   [钱包地址 A] ── 链上转账 ──→ [平台收款地址 P]     │
│                                     │               │
└─────────────────────────────────────│───────────────┘
                                      │ 链上确认后
                                      ▼
┌─────────────────────────────────────────────────────┐
│                   平台后端                           │
│                                                     │
│  数据库余额表  ←── 链上事件同步（充值）             │
│                                                     │
│  [用户 A 余额: 500 NBC]  ←  平台 HD Wallet 管理    │
│  [用户 B 余额: 120 NBC]                             │
│                                                     │
│  内部流转（数据库事务）→ 无需上链                   │
│  出金 / 提现 ──→ 构造链上交易 → 签名 → 广播       │
└─────────────────────────────────────────────────────┘
```

### 2.3 商户收款钱包设计

- 使用 **HD Wallet（分层确定性钱包）**，通过一个种子短语派生出所有用户的钱包地址
- 每次用户充值时，显示**唯一收款地址**（避免地址混淆）
- 定时轮询扫描链上交易，发现充值后更新用户本地余额
- 管理员可设置归集阈值，超过阈值的余额自动归集到冷钱包

```
种子短语 (Seed Phrase)
        │
        ▼
    HD Node
   /   |   \
用户地址1  用户地址2  用户地址3 ...
(充值地址)  (充值地址)  (充值地址)
```

---

## 3. 核心兑换逻辑流程

### 3.1 整体流程

```
用户浏览商品 → 添加购物车/立即购买
        │
        ▼
计算 NBC 价格（商品标价 × NBC/USD 汇率）
        │
        ▼
验证用户 NBC 余额（数据库查询）
        │ 余额不足 → 提示充值
        ▼
预锁定余额（冻结，乐观锁）
        │
        ▼
创建链上归集交易（如需归集到主账户）
        │ 或：内部流转无需上链
        ▼
更新本地余额（扣除 + 记录流水）
        │
        ▼
创建订单（状态：已支付）
        │
        ▼
通知管理员（新订单提醒）
        │
        ▼
用户收到订单确认
```

### 3.2 关键代码逻辑（伪代码）

```typescript
// 订单支付核心逻辑
async function processPayment(orderId: string, userAddress: string, nbcAmount: string) {
  const user = await getUserByWallet(userAddress);
  const order = await getOrder(orderId);

  // 1. 汇率换算（商品人民币价 × NBC/USD 汇率）
  const nbcPrice = calculateNBCPrice(order.totalPrice, currentRate);

  // 2. 数据库事务：验证余额 + 预扣款
  const result = await db.transaction(async (tx) => {
    const freshUser = await tx.users.findOne({ address: userAddress });
    
    if (freshUser.balance < nbcPrice) {
      throw new InsufficientBalanceError('NBC余额不足');
    }

    // 乐观锁：防止并发扣款
    const updated = await tx.users.update({
      where: { address: userAddress, balance: freshUser.balance },
      data: {
        balance: freshUser.balance - nbcPrice,
        frozenBalance: freshUser.frozenBalance + nbcPrice,
        version: freshUser.version + 1,  // 乐观锁版本号
      }
    });

    if (updated.count === 0) {
      throw new ConcurrentUpdateError('余额已被其他操作修改');
    }

    // 3. 创建内部转账流水（内部流转，不上链）
    await tx.walletTx.create({
      data: {
        txHash: generateInternalTxHash(),
        fromAddress: userAddress,
        toAddress: SYSTEM_WALLET,
        amount: nbcPrice,
        type: 'PAYMENT',
        orderId: orderId,
        status: 'CONFIRMED',
      }
    });

    return updated;
  });

  // 4. 更新订单状态
  await updateOrder(orderId, { status: 'PAID', nbcAmount, paidAt: new Date() });

  // 5. 通知管理员
  await notifyAdmin(`新订单 ${orderId}，支付 ${nbcPrice} NBC`);

  return { success: true, txHash: result.txHash };
}
```

### 3.3 充值（链上确认）流程

```typescript
// 监听链上充值事件
async function handleDeposit(from: string, amount: string, txHash: string, blockNumber: number) {
  // 1. 防重放：检查 txHash 是否已处理
  const existing = await db.walletTx.findOne({ txHash });
  if (existing) return; // 已处理

  // 2. 等待确认（建议 12 个区块确认，~3 分钟）
  const currentBlock = await web3.eth.getBlockNumber();
  const confirmations = currentBlock - blockNumber;
  
  if (confirmations < REQUIRED_CONFIRMATIONS) {
    await scheduleRecheck(txHash, delayMs: 15000);
    return;
  }

  // 3. 链上验证：再次确认合约余额变动
  const onChainBalance = await nbcContract.balanceOf(from);

  // 4. 写入本地余额
  await db.transaction(async (tx) => {
    let user = await tx.users.findOne({ address: from });
    if (!user) {
      user = await tx.users.create({ address: from, balance: 0, frozenBalance: 0 });
    }

    await tx.users.update({
      where: { address: from },
      data: { balance: user.balance + BigInt(amount) }
    });

    await tx.walletTx.create({
      data: {
        txHash,
        fromAddress: from,
        toAddress: SYSTEM_WALLET,
        amount: BigInt(amount),
        type: 'DEPOSIT',
        status: 'CONFIRMED',
        blockNumber,
        confirmations,
      }
    });
  });
}
```

---

## 4. 订单状态机设计

### 4.1 状态定义

```
┌──────────┐    创建订单     ┌──────────┐   链上确认    ┌──────────┐
│  CREATED │ ─────────────→ │ PENDING  │ ───────────→ │  PAID    │
│  (草稿)  │                │ (待支付)  │              │ (已支付)  │
└──────────┘                └──────────┘              └──────────┘
      │                          │                         │
      │ 超时取消                  │ 支付失败                 │ 商家发货
      │ (30分钟)                 │ (交易回滚)              ▼
      ▼                         ▼                   ┌──────────┐
┌──────────┐              ┌──────────┐   完成      │COMPLETED │
│ CANCELLED│              │  FAILED  │ ─────────→ │ (完成)    │
│  (已取消) │              │  (失败)   │              └──────────┘
└──────────┘              └──────────┘
                                │
                                │ 可重试
                                ▼
                          ┌──────────┐
                          │ RETRYING  │
                          │  (重试中)  │
                          └──────────┘
```

### 4.2 状态流转表

| 当前状态 | 触发事件 | 目标状态 | 动作 |
|---------|---------|---------|------|
| CREATED | 用户发起支付 | PENDING | 冻结余额，生成支付地址 |
| PENDING | 链上交易确认（≥12块） | PAID | 解冻余额，确认收款，创建订单 |
| PENDING | 链上交易失败 | FAILED | 回滚冻结余额，记录错误 |
| PENDING | 支付超时（30分钟） | CANCELLED | 解冻余额，关闭订单 |
| PENDING | 用户主动取消 | CANCELLED | 解冻余额 |
| FAILED | 重试机制触发 | RETRYING | 重试链上操作 |
| RETRYING | 重试成功 | PAID | 同上 |
| RETRYING | 重试耗尽（3次） | FAILED | 标记为终态，通知用户 |
| PAID | 商家确认发货 | SHIPPED | 更新物流信息 |
| SHIPPED | 买家确认收货 | COMPLETED | 完成交易 |
| SHIPPED | 超时未确认（14天） | COMPLETED | 自动完成 |

### 4.3 超时自动取消（定时任务）

```typescript
// 每分钟执行一次
cron.schedule('* * * * *', async () => {
  const expiredOrders = await db.orders.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: subMinutes(new Date(), 30) }
    }
  });

  for (const order of expiredOrders) {
    await db.transaction(async (tx) => {
      // 解冻余额
      const user = await tx.users.findOne({ address: order.userAddress });
      await tx.users.update({
        where: { address: order.userAddress },
        data: {
          balance: user.balance + order.frozenAmount,
          frozenBalance: user.frozenBalance - order.frozenAmount,
        }
      });

      await tx.orders.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelReason: 'PAYMENT_TIMEOUT' }
      });
    });
  }
});
```

---

## 5. 安全方案

### 5.1 防止双花攻击

**场景**：同一笔余额被并发用于两个订单。

**解决方案**：
1. **乐观锁 + 数据库事务**
   ```sql
   UPDATE users 
   SET balance = balance - ?, frozen_balance = frozen_balance + ?, version = version + 1
   WHERE address = ? AND balance >= ? AND version = ?;
   ```
   只有 `version` 匹配的请求才能更新成功，并发请求自动失败回滚。

2. **唯一索引约束**
   - 链上 `txHash + eventIndex` 建立唯一索引，防止同一笔充值被重复入账
   - 内部交易流水使用全局唯一 ID

3. **轮询间隔限制**
   - 同一钱包地址的链上事件轮询，间隔不小于 5 秒

### 5.2 余额并发扣款

使用 PostgreSQL 行级锁：
```typescript
await db.$queryRaw`
  SELECT * FROM users WHERE address = ${address} FOR UPDATE
`;
// 锁定该行，后续修改必须等待事务提交
```

配合乐观锁（version 字段）双重保障。

### 5.3 私钥安全管理

| 层级 | 方案 |
|------|------|
| 生成 | 使用 MPC/TSS 或硬件钱包（Ledger）生成 HD 种子 |
| 存储 | 种子短语加密存储在 Vault（HashiCorp Vault / AWS KMS） |
| 访问 | 后端服务通过 Vault Agent Sidecar 获取私钥，私钥不出内存 |
| 签名 | 签名操作在独立Signer服务中执行，网络隔离 |
| 监控 | 所有签名操作记录审计日志，异常告警 |
| 归集 | 大额归集需多签审批（M-of-N） |

### 5.4 其他安全措施

- **RPC 节点安全**：使用付费 RPC（Infura / Alchemy）避免公共节点限制；对节点 URL 加白名单
- **Gas 限制**：所有交易设置合理的 Gas 上限，防止无限消耗
- **金额精度**：使用 `BigInt`（或 JavaScript `big.js`），避免浮点数精度问题
- **充值监听**：使用多个 RPC 节点交叉验证，避免单点漏报
- **API 鉴权**：前端请求携带钱包签名（Sign-In with Ethereum），验证消息归属

---

## 6. 推荐技术选型

### 6.1 区块链交互

| 库 | 适用场景 | 说明 |
|----|---------|------|
| **ethers.js v6** | 首选 | 轻量、TypeScript 原生、支持 HDWallet |
| **web3.js** | 兼容旧项目 | 功能全面，体积较大 |
| **viem** | 追求性能和类型安全 | 轻量级，比 ethers 更现代 |

**推荐**：使用 `ethers.js v6`

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = ethers.HDWalletWallet.fromMnemonic(MNEMONIC);
const signer = wallet.connect(provider);
const nbcContract = new ethers.Contract(NBC_ADDRESS, ERC20_ABI, signer);

// 查询余额
const balance = await nbcContract.balanceOf(userAddress);

// 发送归集交易（平台侧）
const tx = await nbcContract.transfer(toAddress, amount);
await tx.wait(12); // 等待12个区块确认
```

### 6.2 后端框架

| 框架 | 说明 |
|------|------|
| **Node.js + NestJS** | 推荐，分层架构、内置 DI、装饰器丰富 |
| **Node.js + Fastify** | 高性能，轻量级 |
| **Go + Gin** | 高并发场景，性能优异 |

**推荐**：Node.js + NestJS（EverShop 本身是 Node.js 项目，保持统一技术栈）

### 6.3 数据库

| 选项 | 说明 |
|------|------|
| **PostgreSQL** | 首选，支持事务、乐观锁、行级锁 |
| **Redis** | 缓存余额热点数据、分布式锁（Redlock） |

### 6.4 辅助工具

| 工具 | 用途 |
|------|------|
| **TypeORM / Prisma** | ORM（TypeScript） |
| **BullMQ** | 任务队列（充值确认、重试、通知） |
| **ioredis** | Redis 客户端 |
| **node-cron** | 定时任务（超时检查、归集轮询） |
| **axios** | HTTP 客户端（调用 RPC） |
| **dotenv** | 环境变量管理 |

### 6.5 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    前端 (EverShop)                    │
│         钱包地址登录 + 购物车 + 结算页面             │
└────────────────────────┬────────────────────────────┘
                         │ REST API / WebSocket
                         ▼
┌─────────────────────────────────────────────────────┐
│                  NestJS 后端服务                    │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │
│  │WalletAPI│  │OrderAPI │  │DepositWatcher       │ │
│  │(余额/支付)│  │(订单管理)│  │(链上事件监听)        │ │
│  └────┬────┘  └────┬────┘  └──────────┬──────────┘ │
│       │            │                  │             │
│  ┌────┴────────────┴──────────────────┴────┐      │
│  │            Wallet Service                 │      │
│  │  (余额管理 + 事务控制 + 冻结机制)          │      │
│  └─────────────────┬────────────────────────┘      │
│                    │                               │
│  ┌─────────────────┴────────────────────────┐      │
│  │           Blockchain Service              │      │
│  │  (ethers.js / 交易签名 / RPC调用)         │      │
│  └───────────────────────────────────────────┘      │
└────────────────────────┬────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │PostgreSQL│   │  Redis   │   │  RPC节点 │
    │(主数据库) │   │(缓存/锁) │   │(ETH/BSC) │
    └──────────┘   └──────────┘   └──────────┘
```

---

## 7. 数据模型

### 7.1 核心表结构（PostgreSQL）

```sql
-- 用户钱包表
CREATE TABLE wallet_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   VARCHAR(64) UNIQUE NOT NULL,
  balance         NUMERIC(36, 0) NOT NULL DEFAULT 0,   -- NBC 余额（最小单位）
  frozen_balance  NUMERIC(36, 0) NOT NULL DEFAULT 0,   -- 冻结余额
  version         INTEGER NOT NULL DEFAULT 0,         -- 乐观锁版本
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 钱包流水表
CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash         VARCHAR(66) UNIQUE,                  -- 链上交易hash，内部流转为null
  internal_id     VARCHAR(64) UNIQUE NOT NULL,          -- 全局唯一流水号
  from_address    VARCHAR(64) NOT NULL,
  to_address      VARCHAR(64) NOT NULL,
  amount          NUMERIC(36, 0) NOT NULL,
  type            VARCHAR(20) NOT NULL,                 -- DEPOSIT/WITHDRAWAL/PAYMENT/REFUND
  status          VARCHAR(20) NOT NULL,                -- PENDING/CONFIRMED/FAILED
  order_id        UUID REFERENCES orders(id),
  block_number    INTEGER,
  confirmations   INTEGER DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 订单表（扩展 EverShop 现有订单）
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address    VARCHAR(64) NOT NULL,
  total_price     DECIMAL(12, 2) NOT NULL,             -- 原始货币价格
  nbc_amount      NUMERIC(36, 0),                     -- NBC 支付金额
  nbc_rate        DECIMAL(20, 8),                     -- 支付时汇率
  status          VARCHAR(20) NOT NULL DEFAULT 'CREATED',
  payment_id      VARCHAR(64),                         -- 支付流水号
  cancel_reason   VARCHAR(100),
  paid_at         TIMESTAMPTZ,
  shipped_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 防重放索引
CREATE UNIQUE INDEX idx_wallet_tx_hash ON wallet_transactions(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_orders_pending_timeout ON orders(status, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_wallet_user_address ON wallet_users(wallet_address);
```

---

## 8. 总结

| 模块 | 推荐方案 |
|------|---------|
| 代币标准 | ERC-20（假设），18位精度 |
| 钱包模式 | 半托管（平台代管余额 + HD Wallet 收款） |
| 链上交互 | ethers.js v6 + 节点 RPC |
| 余额同步 | 链上充值监听（≥12确认）；内部流转数据库事务 |
| 订单状态机 | 6个状态 + 定时超时取消 |
| 并发安全 | 乐观锁（version）+ 行级锁（FOR UPDATE）+ 唯一索引 |
| 私钥管理 | Vault / KMS + MPC + 审计日志 |
| 后端框架 | NestJS + PostgreSQL + Redis + BullMQ |
