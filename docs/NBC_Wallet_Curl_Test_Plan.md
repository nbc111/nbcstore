# NBC 钱包 Curl 测试文档

最后一次基于测试环境验证日期：2026-05-18

测试环境基础地址：

```bash
BASE="http://156.251.17.96:3000"
```

本文档用于通过真实 HTTP 请求验证当前 NBC 钱包集成情况。大部分请求都直接使用 `curl`；钱包签名步骤需要用一小段 Node.js + `ethers` 生成签名，因为 `curl` 本身不能完成 EIP-191 消息签名。

## 1. 前置条件

在项目根目录执行，确保当前项目已经安装了 `ethers`：

```bash
cd /Users/vincent/IdeaProjects/nbcstore
```

需要本地具备以下工具：

```bash
node -v
jq --version
curl --version
```

创建临时目录，用来保存 cookie 和接口响应：

```bash
TMP_DIR="/tmp/nbc-wallet-curl-test"
mkdir -p "$TMP_DIR"
```

## 2. 生成临时测试钱包

这个钱包只用于测试签名登录，不要使用生产钱包。

```bash
node --input-type=module - <<'NODE' > "$TMP_DIR/wallet.json"
import { Wallet } from 'ethers';

const wallet = Wallet.createRandom();
console.log(JSON.stringify({
  address: wallet.address,
  privateKey: wallet.privateKey
}, null, 2));
NODE

ADDR="$(jq -r '.address' "$TMP_DIR/wallet.json")"
PRIV="$(jq -r '.privateKey' "$TMP_DIR/wallet.json")"
echo "$ADDR"
```

预期结果：

- 输出一个有效 EVM 钱包地址。
- 不要提交或分享 `wallet.json`，里面包含测试私钥。

## 3. 请求钱包签名参数

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\"}" \
  "$BASE/api/nbcWallet/auth/request" \
  -o "$TMP_DIR/auth-request.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/auth-request.json"
```

预期 HTTP 状态码：`200`

预期响应结构：

```json
{
  "data": {
    "walletAddress": "0x...",
    "nonce": "...",
    "message": "Sign this message to authenticate with NBC Store.\n\nNonce: ...",
    "expiresAt": "..."
  }
}
```

2026-05-18 实测结果：

- HTTP 状态码：`200`
- `walletAddress` 会被标准化成小写地址。
- 正常返回 nonce 和待签名 message。

## 4. 对消息进行签名

```bash
MESSAGE="$(jq -r '.data.message' "$TMP_DIR/auth-request.json")"
NONCE="$(jq -r '.data.nonce' "$TMP_DIR/auth-request.json")"

SIG="$(MESSAGE="$MESSAGE" PRIV="$PRIV" node --input-type=module - <<'NODE'
import { Wallet } from 'ethers';

const wallet = new Wallet(process.env.PRIV);
console.log(await wallet.signMessage(process.env.MESSAGE));
NODE
)"

echo "$SIG"
```

预期结果：

- 输出一个 `0x...` 格式的签名。

## 5. 校验签名并建立客户 Session

```bash
CUSTOMER_COOKIE="$TMP_DIR/customer-cookies.txt"

curl -sS \
  -c "$CUSTOMER_COOKIE" \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}" \
  "$BASE/api/nbcWallet/auth/verify" \
  -o "$TMP_DIR/auth-verify.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/auth-verify.json"
```

预期 HTTP 状态码：`200`

预期行为：

- 查找或创建影子客户。
- 查找或创建 `nbc_wallet` 钱包记录。
- 写入前台客户 session cookie。

预期响应结构：

```json
{
  "data": {
    "sid": "...",
    "customer": {
      "customerId": 1,
      "uuid": "...",
      "email": "wallet_0x...@nbc.local",
      "fullName": "0x...."
    },
    "wallet": {
      "address": "0x..."
    }
  }
}
```

2026-05-18 实测结果：

- HTTP 状态码：`200`
- 成功创建影子客户。
- 后续查询余额和流水时，前台客户 session cookie 生效。

## 6. 使用客户 Session 查询钱包余额

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/balance-before.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/balance-before.json"
```

预期 HTTP 状态码：`200`

预期响应：

- `data.wallet.walletAddress` 与刚才签名的钱包地址一致。
- 新创建钱包初始 `balance = 0`。

2026-05-18 实测结果：

```json
{
  "balance": 0,
  "frozenBalance": 0,
  "availableBalance": 0,
  "currency": "NBC",
  "exchangeRate": 0.01
}
```

## 7. 验证客户接口会拒绝匿名请求

```bash
curl -sS \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/balance-anon.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/balance-anon.json"
```

预期 HTTP 状态码：`401`

预期响应：

```json
{
  "error": {
    "status": 401,
    "message": "Customer login is required"
  }
}
```

## 8. 验证后台调账接口会拒绝匿名请求

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"type\":\"credit\",\"amount\":100,\"reason\":\"curl unauth test\"}" \
  "$BASE/api/admin/nbcWallet/adjust" \
  -o "$TMP_DIR/adjust-unauth.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/adjust-unauth.json"
```

预期 HTTP 状态码：`401`

2026-05-18 实测结果：

```json
{
  "error": {
    "status": 401,
    "message": "Unauthorized"
  }
}
```

## 9. 使用后台 Session Cookie 登录

测试服务器当前没有配置后台 JWT secret，因此 `POST /api/user/tokens` 会返回：

```json
{
  "error": {
    "message": "JWT secret for admin is not configured",
    "status": 400
  }
}
```

所以这里使用 EverShop 后台 session 登录接口：

```bash
ADMIN_COOKIE="$TMP_DIR/admin-cookies.txt"

curl -sS \
  -c "$ADMIN_COOKIE" \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123456"}' \
  "$BASE/admin/user/login" \
  -o "$TMP_DIR/admin-login.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/admin-login.json"
```

预期 HTTP 状态码：`200`

预期响应：

```json
{
  "data": {
    "sid": "..."
  }
}
```

2026-05-18 实测结果：

- HTTP 状态码：`200`
- 后台 session cookie 可以用于访问 private 后台钱包接口。

## 10. 后台给钱包加款

```bash
REFERENCE="curl-test-session-$(date +%s)"

curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"type\":\"credit\",\"amount\":12345,\"reason\":\"curl integration test\",\"reference\":\"$REFERENCE\"}" \
  "$BASE/api/admin/nbcWallet/adjust" \
  -o "$TMP_DIR/adjust.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/adjust.json"
```

预期 HTTP 状态码：`200`

预期响应：

```json
{
  "data": {
    "walletId": 1,
    "customerId": 1,
    "walletAddress": "0x...",
    "transactionId": 1,
    "transactionType": "admin_credit",
    "amount": 12345,
    "balanceBefore": 0,
    "balanceAfter": 12345,
    "reason": "curl integration test",
    "reference": "curl-test-session-..."
  }
}
```

2026-05-18 实测结果：

- HTTP 状态码：`200`
- `transactionType = admin_credit`
- `balanceBefore = 0`
- `balanceAfter = 12345`

## 11. 加款后再次查询余额

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/balance-after.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/balance-after.json"
```

预期 HTTP 状态码：`200`

完成上面的加款后，预期余额结果：

```json
{
  "balance": 12345,
  "availableBalance": 12345,
  "cnyValue": 123.45,
  "availableCnyValue": 123.45
}
```

2026-05-18 实测结果：

- HTTP 状态码：`200`
- 余额增加到 `12345`。
- CNY 估值按汇率 `0.01` 计算。

## 12. 查询钱包交易流水

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?limit=5" \
  -o "$TMP_DIR/transactions.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/transactions.json"
```

预期 HTTP 状态码：`200`

预期结果：

- `data.total >= 1`
- 最新一条记录包含：
  - `transactionType = admin_credit`
  - `amount = 12345`
  - `status = completed`
  - `metadata.source = admin_adjustment`

2026-05-18 实测结果：

```json
{
  "transactionType": "admin_credit",
  "amount": 12345,
  "balanceBefore": 0,
  "balanceAfter": 12345,
  "status": "completed",
  "metadata": {
    "reason": "curl integration test",
    "source": "admin_adjustment",
    "performed_by": "admin:..."
  }
}
```

## 13. 可选：链上处理接口

当前默认配置里 `nbcWallet.onchain.enabled = 0`，所以如果没有配置真实 RPC、chain id、token 地址、金库地址、起始区块，手动处理链上充值预期会失败。

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$BASE/api/admin/nbcWallet/onchain/process" \
  -o "$TMP_DIR/onchain-process.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/onchain-process.json"
```

链上配置未启用时的预期：

- HTTP 状态码可能是 `500`。
- 错误信息应提示链上监听未启用。

只要测试环境没有启用链上配置，这个结果不应视为测试失败。

## 14. 可选：对账接口

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"limit":100}' \
  "$BASE/api/admin/nbcWallet/reconcile" \
  -o "$TMP_DIR/reconcile.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/reconcile.json"
```

预期 HTTP 状态码：`200`

预期响应结构：

```json
{
  "data": {
    "scanned": 0,
    "completed": 0,
    "unmatched": 0,
    "failed": 0
  }
}
```

## 15. 一键冒烟测试脚本

下面脚本会把主链路从头到尾跑一遍：

```bash
set -euo pipefail

BASE="${BASE:-http://156.251.17.96:3000}"
TMP_DIR="${TMP_DIR:-/tmp/nbc-wallet-curl-test}"
mkdir -p "$TMP_DIR"

node --input-type=module - <<'NODE' > "$TMP_DIR/wallet.json"
import { Wallet } from 'ethers';
const wallet = Wallet.createRandom();
console.log(JSON.stringify({ address: wallet.address, privateKey: wallet.privateKey }, null, 2));
NODE

ADDR="$(jq -r '.address' "$TMP_DIR/wallet.json")"
PRIV="$(jq -r '.privateKey' "$TMP_DIR/wallet.json")"
CUSTOMER_COOKIE="$TMP_DIR/customer-cookies.txt"
ADMIN_COOKIE="$TMP_DIR/admin-cookies.txt"

curl -sS -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\"}" \
  "$BASE/api/nbcWallet/auth/request" \
  -o "$TMP_DIR/auth-request.json" \
  -w "签名参数 HTTP %{http_code}\n"

MESSAGE="$(jq -r '.data.message' "$TMP_DIR/auth-request.json")"
NONCE="$(jq -r '.data.nonce' "$TMP_DIR/auth-request.json")"
SIG="$(MESSAGE="$MESSAGE" PRIV="$PRIV" node --input-type=module - <<'NODE'
import { Wallet } from 'ethers';
const wallet = new Wallet(process.env.PRIV);
console.log(await wallet.signMessage(process.env.MESSAGE));
NODE
)"

curl -sS -c "$CUSTOMER_COOKIE" -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}" \
  "$BASE/api/nbcWallet/auth/verify" \
  -o "$TMP_DIR/auth-verify.json" \
  -w "签名登录 HTTP %{http_code}\n"

curl -sS -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/balance-before.json" \
  -w "加款前余额 HTTP %{http_code}\n"

curl -sS -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"type\":\"credit\",\"amount\":100,\"reason\":\"curl unauth test\"}" \
  "$BASE/api/admin/nbcWallet/adjust" \
  -o "$TMP_DIR/adjust-unauth.json" \
  -w "匿名调账 HTTP %{http_code}\n"

curl -sS -c "$ADMIN_COOKIE" -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123456"}' \
  "$BASE/admin/user/login" \
  -o "$TMP_DIR/admin-login.json" \
  -w "后台登录 HTTP %{http_code}\n"

REFERENCE="curl-test-session-$(date +%s)"
curl -sS -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"type\":\"credit\",\"amount\":12345,\"reason\":\"curl integration test\",\"reference\":\"$REFERENCE\"}" \
  "$BASE/api/admin/nbcWallet/adjust" \
  -o "$TMP_DIR/adjust.json" \
  -w "后台加款 HTTP %{http_code}\n"

curl -sS -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/balance-after.json" \
  -w "加款后余额 HTTP %{http_code}\n"

curl -sS -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?limit=5" \
  -o "$TMP_DIR/transactions.json" \
  -w "交易流水 HTTP %{http_code}\n"

echo "钱包地址: $ADDR"
echo "加款后余额:"
jq '.data.wallet | {walletAddress, balance, availableBalance, cnyValue}' "$TMP_DIR/balance-after.json"
echo "最新流水:"
jq '.data.items[0] | {transactionType, amount, balanceBefore, balanceAfter, status, reference}' "$TMP_DIR/transactions.json"
```

## 16. 当前已验证覆盖范围

这份 curl 测试已经覆盖：

- 钱包签名参数接口。
- 钱包签名验证接口。
- 影子客户创建。
- 客户 session cookie 创建。
- 钱包余额接口。
- 钱包交易流水接口。
- 客户接口登录态校验。
- 后台接口登录态校验。
- 后台 session 登录。
- 后台钱包加款。
- 后台加款后的账本记录创建。
- 汇率值在余额 CNY 估值中的体现。

这份 curl 测试暂未覆盖：

- checkout 订单创建和 `nbc_wallet` 支付扣款。
- 退款流程。
- 真实 RPC/token 配置下的链上充值处理。
- 存在真实 pending/unmatched 充值记录时的对账流程。
- 前端钱包连接 UI，因为当前代码还没有实现这部分 UI。
