# EverShop 前端改造方案 — 无注册钱包登录流程

> **目标**：将 EverShop 改造为无需注册、通过钱包（NBC 代币）进行身份识别和支付的电商系统。

---

## 一、前端技术栈分析

### 1.1 核心技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | **React 18 + TypeScript** | 组件化开发，类型安全 |
| 样式方案 | **TailwindCSS** | 原子化 CSS，快速定制 UI |
| 数据获取 | **GraphQL + Apollo Client** | 替代 REST，类型安全的 API 调用 |
| SSR | **服务端渲染 + Hydration** | SEO 友好，首屏加载快 |
| 状态管理 | **React Context / Apollo Cache** | AppProvider 管理全局状态 |
| 构建工具 | **Webpack + Babel** |  |
| 主题系统 | **模块化主题** | `themes/[name]/pages/` 按页面组织组件 |

### 1.2 认证架构

```
EverShop 原认证流程：
┌─────────────────────────────────────────────────────────────┐
│  用户注册 → Email + Password → 后端验证 → JWT Token         │
│  登录 → 验证凭据 → JWT Token → request.session.customerID   │
└─────────────────────────────────────────────────────────────┘

改造后目标：
┌─────────────────────────────────────────────────────────────┐
│  连接钱包 → 获取钱包地址 → 后端验证签名 → JWT Token           │
│  钱包地址作为唯一标识符 → 替换 Email/Password 流程           │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 关键目录结构

```
evershop/
├── themes/
│   └── custom-theme/           # 自定义主题
│       ├── pages/
│       │   ├── home/           # 首页
│       │   ├── cart/          # 购物车
│       │   ├── checkout/      # 结算页
│       │   ├── account/       # 用户中心
│       │   └── login/         # 登录页 → 改为"连接钱包"页
│       ├── components/
│       │   ├── Header/        # 头部（登录状态显示）
│       │   ├── ProductCard/   # 商品卡片（增加 NBC 价格）
│       │   └── WalletConnect/ # 钱包连接组件（新增）
│       └── context/
│           └── WalletContext   # 钱包状态上下文（新增）
└── packages/                  # 扩展模块
```

---

## 二、无注册流程改造设计

### 2.1 钱包连接方案推荐

**推荐方案 B：前后端联动（钱包签名 + 后端验证）**

理由：
- **纯前端方案（A）**：钱包地址可被伪造，无法防止恶意下单
- **前后端联动（B）**：后端验证签名，确保操作真实性

#### 方案 B 流程图

```
┌──────────────────────────────────────────────────────────────────┐
│                        首次访问                                   │
│                                                                  │
│  用户点击"连接钱包"                                              │
│         ↓                                                         │
│  MetaMask 弹出授权请求                                            │
│         ↓                                                         │
│  获取钱包地址 (0x...)                                            │
│         ↓                                                         │
│  后端生成随机 nonce，发送给前端                                    │
│         ↓                                                         │
│  前端用私钥对 nonce 签名 → 发送 signature + address               │
│         ↓                                                         │
│  后端验证签名，确认地址归属                                       │
│         ↓                                                         │
│  后端创建/查找用户记录，颁发 JWT Token                            │
│         ↓                                                         │
│  前端存储 Token，跳转商城                                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        后续访问                                   │
│                                                                  │
│  自动连接钱包 → 验证地址签名 → 刷新 Token → 进入商城              │
└──────────────────────────────────────────────────────────────────┘
```

#### 核心 API 设计

```typescript
// POST /api/auth/wallet/connect
// 钱包连接 - 获取 nonce
{
  "address": "0x1234..."
}

// POST /api/auth/wallet/verify
// 钱包验证 - 签名认证
{
  "address": "0x1234...",
  "signature": "0xabcd...",
  "nonce": "random-string-from-server"
}

// 响应
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "address": "0x1234...",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### 2.2 Session 管理方案

| 存储位置 | 用途 | 说明 |
|----------|------|------|
| **localStorage** | 存储钱包地址、购物车数据 | 本地持久化 |
| **JWT Token** | 用户身份凭证 | 存于 httpOnly Cookie（防 XSS） |
| **Apollo Cache** | 前端运行时状态 | UI 组件共享 |
| **Session Storage** | 临时 nonce 存储 | 页面关闭即清除 |

```typescript
// WalletContext.tsx
interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  token: string | null;
  cart: CartItem[];
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
  getCart: () => CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
}
```

### 2.3 购物车持久化方案

```
┌─────────────────────────────────────────────────────────────────┐
│                      购物车存储策略                               │
├─────────────────────────────────────────────────────────────────┤
│  未连接钱包：localStorage["cart_anonymous"]                      │
│  已连接钱包：localStorage["cart_{address}"]                      │
│                                                                  │
│  合并逻辑：                                                      │
│  1. 用户首次连接钱包 → 询问是否合并本地购物车                    │
│  2. 若合并 → 将 anonymous 购物车合并到钱包购物车                  │
│  3. 后端同步记录到数据库（用户订单历史）                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 下单与支付流程

```
┌──────────────────────────────────────────────────────────────────┐
│                        下单流程                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 用户在结算页点击"确认下单"                                   │
│         ↓                                                         │
│  2. 前端生成订单摘要（商品、价格、NBC 金额）                      │
│         ↓                                                         │
│  3. 前端请求后端生成 signedOrder 消息                            │
│         ↓                                                         │
│  4. 后端生成订单记录（状态: pending），返回待签名数据              │
│         ↓                                                         │
│  5. 用户签名确认（MetaMask 弹出）                                │
│         ↓                                                         │
│  6. 前端发送 signature + orderId 到后端                          │
│         ↓                                                         │
│  7. 后端验证签名，调用 NBC 代币合约自动扣款                       │
│         ↓                                                         │
│  8. 扣款成功 → 订单状态更新为 paid → 发货                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、关键页面改造清单

### 3.1 首页 / 商品列表页

| 改造项 | 改动量 | 说明 |
|--------|--------|------|
| Header 右上角登录按钮 → 钱包状态显示 | **小** | 替换原有 Login 链接为钱包地址或"连接钱包"按钮 |
| 商品卡片增加 NBC 价格 | **小** | 新增字段展示，多币种价格兼容 |
| 登录拦截 → 钱包连接引导 | **小** | 添加全局 Auth Guard 组件 |

```
改造前：
[登录] [注册] [购物车 3]

改造后：
[0x1234...789] [购物车 3]  或  [连接钱包] [购物车 3]
```

### 3.2 商品详情页

| 改造项 | 改动量 | 说明 |
|--------|--------|------|
| 价格区域增加 NBC 价格 | **小** | 模板调整，支持多币种显示 |
| "加入购物车"按钮行为 | **中** | 未连接钱包时 → 引导连接钱包 |
| 库存状态同步 | **小** | 已有逻辑，无需大改 |

### 3.3 购物车页

| 改造项 | 改动量 | 说明 |
|--------|--------|------|
| 购物车数据结构 | **中** | 支持匿名购物车 + 钱包购物车合并 |
| 持久化逻辑 | **中** | localStorage 存储 + 后端同步 |
| 结算按钮 | **小** | 未连接钱包时显示"请先连接钱包" |

### 3.4 结算 / 下单确认页

| 改造项 | 改动量 | 说明 |
|--------|--------|------|
| 地址信息输入 | **中** | 钱包用户可能无地址，需新增收货地址表单 |
| 钱包签名区域 | **新增** | 显示订单详情 + 签名按钮 |
| 支付状态反馈 | **新增** | MetaMask 签名等待、链上确认、支付成功/失败 |

### 3.5 用户中心 / 我的订单页

| 改造项 | 改动量 | 说明 |
|--------|--------|------|
| 页面重构 | **中** | 移除"个人信息编辑"，改为"钱包地址"展示 |
| 订单列表 | **小** | 已有订单模块，数据关联调整 |
| 收货地址管理 | **小** | 独立模块，与钱包解耦 |

### 3.6 登录页 → 连接钱包页

| 改造项 | 改动量 | 说明 |
|--------|--------|------|
| 页面完全重构 | **大** | 移除 Email/Password 表单 |
| 钱包连接组件 | **新增** | 支持 MetaMask、WalletConnect |
| 连接状态反馈 | **新增** | 连接中/成功/失败状态 UI |

---

## 四、钱包连接方案详细设计

### 4.1 技术选型

| 方案 | 库 | 优点 | 缺点 |
|------|-----|------|------|
| **A** | 原生 `window.ethereum` | 无依赖，体积小 | 需要自己处理多钱包、事件监听 |
| **B** | `@web3-react/walletconnect-connector` | 成熟方案，支持多钱包 | 包体积较大 |
| **C** | `@metamask/sdk` | MetaMask 官方，移动端友好 | 主要是 MetaMask |
| **D** | `wagmi` + `viem` | React 最佳实践，类型安全 | 学习曲线 |

**推荐：C 方案 + D 方案混合**
- 核心使用 `@metamask/sdk` 保证稳定性
- 补充 wagmi/viem 处理复杂交互和类型安全

### 4.2 钱包连接组件设计

```tsx
// components/WalletConnect/WalletConnectButton.tsx
import { MetaMaskSDK } from '@metamask/sdk';

export function WalletConnectButton() {
  const { connect, disconnect, address, isConnecting } = useWallet();

  if (isConnecting) {
    return <Button loading>连接中...</Button>;
  }

  if (address) {
    return (
      <Dropdown
        trigger={
          <Button>
            {formatAddress(address)} {/* 0x1234...5678 */}
          </Button>
        }
      >
        <DropdownItem onClick={() => navigate('/account')}>
          我的订单
        </DropdownItem>
        <DropdownItem onClick={disconnect}>
          断开连接
        </DropdownItem>
      </Dropdown>
    );
  }

  return (
    <Button onClick={connect} icon={<WalletIcon />}>
      连接钱包
    </Button>
  );
}
```

### 4.3 签名验证流程

```typescript
// hooks/useWalletAuth.ts
export function useWalletAuth() {
  const { address, provider } = useWallet();
  const [token, setToken] = useState<string | null>(null);

  const signMessage = async (message: string): Promise<string> => {
    if (!provider || !address) {
      throw new Error('钱包未连接');
    }
    const signer = provider.getSigner();
    return await signer.signMessage(message);
  };

  const authenticate = async () => {
    // 1. 获取 nonce
    const { data: nonceData } = await api.post('/auth/wallet/connect', { address });
    
    // 2. 签名
    const signature = await signMessage(nonceData.nonce);
    
    // 3. 验证并获取 token
    const { data: authData } = await api.post('/auth/wallet/verify', {
      address,
      signature,
      nonce: nonceData.nonce
    });
    
    setToken(authData.token);
    return authData;
  };

  return { token, authenticate, signMessage };
}
```

---

## 五、工作量评估

### 5.1 改动量分级

| 级别 | 改动说明 | 页面/模块 |
|------|----------|-----------|
| 🟢 **新增** | 从零开发，无历史包袱 | 钱包连接组件、签名流程、NBC 支付集成 |
| 🔵 **小改** | 少量模板调整、字段添加 | Header、价格展示、订单列表 |
| 🟡 **中改** | 逻辑调整、组件重构 | 购物车持久化、结算流程、用户中心 |
| 🔴 **大改** | 核心流程重构、架构调整 | 登录页完全重构、Session 管理重写 |

### 5.2 详细工作量评估

```
┌────────────────────────────────────────────────────────────────────┐
│                        工作量估算（人天）                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  【新增模块】                                                      │
│  ├── 钱包连接组件库（MetaMask + WalletConnect）        3 天        │
│  ├── WalletContext 状态管理               1 天                     │
│  ├── 后端钱包验证 API                       2 天                    │
│  └── NBC 支付合约集成                       3 天（依赖后端）        │
│                                                                    │
│  【页面改造】                                                      │
│  ├── 登录页 → 连接钱包页                  🔴 5 天                  │
│  ├── Header 钱包状态显示                  🔵 1 天                  │
│  ├── 商品列表/详情页 NBC 价格             🔵 2 天                  │
│  ├── 购物车持久化逻辑                     🟡 3 天                  │
│  ├── 结算页签名流程                       🟡 4 天                  │
│  ├── 用户中心重构                         🟡 3 天                  │
│  └── 订单页适配                           🔵 1 天                  │
│                                                                    │
│  【后端联动】                                                      │
│  ├── JWT Token 生成逻辑适配钱包           🟡 2 天                  │
│  ├── 订单关联钱包地址                     🔵 1 天                  │
│  └── NBC 自动扣款接口                     3 天（依赖合约）          │
│                                                                    │
│  【测试与集成】                                                    │
│  ├── 钱包连接端到端测试                   🟡 2 天                  │
│  ├── 支付流程集成测试                     🟡 3 天                  │
│  └── 多钱包兼容性测试                     🔵 2 天                  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  合计：约 42 人天                                                  │
│  前端：约 30 天 | 后端：约 12 天                                   │
└────────────────────────────────────────────────────────────────────┘
```

### 5.3 优先级排序

```
Phase 1 - MVP 最小可行版本（2 周）
  ✅ 钱包连接基础功能（MetaMask）
  ✅ 登录页 → 连接钱包页
  ✅ 基础下单流程（签名 + 扣款）
  
Phase 2 - 完善体验（1 周）
  ✅ 购物车持久化
  ✅ 多钱包支持（WalletConnect）
  ✅ 订单历史查看
  
Phase 3 - 生产优化（1 周）
  ✅ 错误处理完善
  ✅ 移动端适配
  ✅ 链上 Gas 费优化
```

---

## 六、技术风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|----------|
| 用户无 MetaMask | 转化率下降 | 预留手机号登录降级方案 |
| 链上交易失败 | 订单无法完成 | 失败重试 + 后端补偿机制 |
| 钱包地址隐私 | 用户顾虑 | 不存储链上交易历史，仅关联订单 |
| 网络切换丢失 | 支付中断 | 监听 `chainChanged` 事件，引导重新连接 |
| 合约调用 Gas 高 | 用户成本 | 显示 Gas 预估，允许用户取消 |

---

## 七、总结

本方案基于 EverShop 的 **React + GraphQL + TypeScript** 技术栈，通过以下改造实现无注册钱包登录：

1. **认证层**：用钱包签名替代 Email/Password，实现无注册登录
2. **Session 层**：JWT Token + 钱包地址双重标识
3. **购物车**：localStorage + 后端同步，支持匿名到认证的购物车迁移
4. **支付**：钱包签名确认 + NBC 合约自动扣款

核心改动集中在登录页（完全重构）和结算流程（新增签名），商品展示模块改动最小，可渐进式改造。

---

*文档版本：v1.0*
*编写日期：2026-04-26*
*作者：Agent-B（前端规划师）*
