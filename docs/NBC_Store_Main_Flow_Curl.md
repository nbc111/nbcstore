# NBC 商城主流程 Curl 接口测试文档

最后一次基于测试环境验证日期：2026-05-19

测试环境基础地址：

```bash
BASE="http://156.251.17.96:3000"
```

本文档整理商城主流程相关接口的 curl 调用与关键返回，覆盖：

- 商品列表
- 钱包签名登录
- 钱包余额准备
- 我的购物车
- 联系人、收货地址、账单地址
- 配送方式、支付方式
- 创建订单
- NBC 钱包扣款
- 查询余额与交易流水

注意：本文档中的 curl 都是基于真实测试环境跑过的。为了能完整走通下单和 NBC 支付，测试过程中新增了一个测试配送区域和固定运费方法：

- 配送区域：`Curl Test US Zone ...`
- 配送方式：`Curl Test Flat Rate ...`
- 固定运费：`5.00`
- 适用地区：`US / CA`

## 1. 前置变量

```bash
BASE="http://156.251.17.96:3000"
TMP_DIR="/tmp/nbc-store-main-flow-curl-test"
mkdir -p "$TMP_DIR"
```

## 2. 查询商品列表

### Curl

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { products(filters: [{key: \"page\", operation: eq, value: \"1\"}, {key: \"limit\", operation: eq, value: \"5\"}]) { items { productId sku name url } total } }"
  }' \
  "$BASE/api/graphql" \
  -o "$TMP_DIR/01-products.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/01-products.json"
```

### 关键返回

```json
{
  "data": {
    "products": {
      "items": [
        {
          "productId": 15,
          "sku": "THERMO-005-YEL",
          "name": "Stainless Steel Thermos - Yellow",
          "url": "/accessories/stainless-steel-thermos-yellow"
        }
      ],
      "total": 15
    }
  }
}
```

本次主流程使用的 SKU：

```bash
SKU="THERMO-005-YEL"
```

### 注意点

当前测试环境查询 `ProductCollection.currentPage` 会返回 500：

```json
{
  "error": {
    "status": 500,
    "message": "Cannot return null for non-nullable field ProductCollection.currentPage."
  }
}
```

所以主流程商品列表只查询 `items` 和 `total`，没有查询 `currentPage`。

## 3. 生成临时钱包

### Curl 前置脚本

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
CUSTOMER_COOKIE="$TMP_DIR/customer-cookies.txt"
ADMIN_COOKIE="$TMP_DIR/admin-cookies.txt"
```

说明：这是测试钱包，只用于测试环境签名登录。

## 4. 请求钱包签名参数

### Curl

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\"}" \
  "$BASE/api/nbcWallet/auth/request" \
  -o "$TMP_DIR/02-wallet-auth-request.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/02-wallet-auth-request.json"
```

### 关键返回

```json
{
  "data": {
    "walletAddress": "0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3",
    "nonce": "nonce",
    "message": "Sign this message to authenticate with NBC Store.\n\nNonce: nonce",
    "expiresAt": "2026-05-19T12:57:22.218Z"
  }
}
```

## 5. 钱包签名并登录

### 生成签名

```bash
MESSAGE="$(jq -r '.data.message' "$TMP_DIR/02-wallet-auth-request.json")"
NONCE="$(jq -r '.data.nonce' "$TMP_DIR/02-wallet-auth-request.json")"

SIG="$(MESSAGE="$MESSAGE" PRIV="$PRIV" node --input-type=module - <<'NODE'
import { Wallet } from 'ethers';

const wallet = new Wallet(process.env.PRIV);
console.log(await wallet.signMessage(process.env.MESSAGE));
NODE
)"
```

### Curl

```bash
curl -sS \
  -c "$CUSTOMER_COOKIE" \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}" \
  "$BASE/api/nbcWallet/auth/verify" \
  -o "$TMP_DIR/03-wallet-auth-verify.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/03-wallet-auth-verify.json"
```

### 关键返回

```json
{
  "data": {
    "sid": "8IukUwPsqdP0GAVedV2Nc6anL7HYEKvm",
    "customer": {
      "customerId": 4,
      "uuid": "a0e21021-e3d1-4079-8bc1-d456d1f0b51d",
      "email": "wallet_0xed8e...@nbc.local",
      "fullName": "0xed8e...d5a3"
    },
    "wallet": {
      "address": "0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3"
    }
  }
}
```

## 6. 后台登录

测试环境当前没有配置后台 JWT secret，因此后台私有接口使用 session cookie 登录方式。

### Curl

```bash
curl -sS \
  -c "$ADMIN_COOKIE" \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123456"}' \
  "$BASE/admin/user/login" \
  -o "$TMP_DIR/04-admin-login.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/04-admin-login.json"
```

### 关键返回

```json
{
  "data": {
    "sid": "..."
  }
}
```

## 7. 后台给测试钱包加款

为了让 NBC 支付能成功，先给临时测试钱包加一笔测试余额。

### Curl

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"type\":\"credit\",\"amount\":999999,\"reason\":\"main flow mine cart test balance\",\"reference\":\"main-flow-mine-$(date +%s)\"}" \
  "$BASE/api/admin/nbcWallet/adjust" \
  -o "$TMP_DIR/05-wallet-adjust.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/05-wallet-adjust.json"
```

### 关键返回

```json
{
  "data": {
    "walletId": 4,
    "customerId": 4,
    "transactionType": "admin_credit",
    "amount": 999999,
    "balanceBefore": 0,
    "balanceAfter": 999999
  }
}
```

## 8. 查询加款后钱包余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/06-wallet-balance-before.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/06-wallet-balance-before.json"
```

### 关键返回

```json
{
  "data": {
    "wallet": {
      "balance": 999999,
      "availableBalance": 999999,
      "currency": "NBC",
      "exchangeRate": 0.01,
      "cnyValue": 9999.99
    }
  }
}
```

## 9. 加入我的购物车

必须使用 `/api/cart/mine/items` 创建“我的购物车”，这样购物车会绑定当前钱包登录客户。不要用匿名的 `POST /api/carts` 走 NBC 支付，否则订单 `customer_id` 可能为空，后续扣款会失败。

### Curl

```bash
curl -sS \
  -c "$CUSTOMER_COOKIE" \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"sku\":\"$SKU\",\"qty\":1}" \
  "$BASE/api/cart/mine/items" \
  -o "$TMP_DIR/07-add-mine-item.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/07-add-mine-item.json"

CART_ID="$(jq -r '.data.cartId' "$TMP_DIR/07-add-mine-item.json")"
```

### 关键返回

```json
{
  "data": {
    "item": {
      "product_sku": "THERMO-005-YEL",
      "product_name": "Stainless Steel Thermos - Yellow",
      "qty": 1,
      "final_price": 35,
      "line_total": 35
    },
    "count": 1,
    "cartId": "b0c52bb718414f959481737d064c4bbd"
  }
}
```

## 10. 写入联系人邮箱

### Curl

```bash
EMAIL="mainflow-mine-$(date +%s)@example.com"

curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" \
  "$BASE/api/carts/$CART_ID/contacts" \
  -o "$TMP_DIR/08-add-contact.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/08-add-contact.json"
```

### 关键返回

```json
{
  "data": {
    "email": "mainflow-mine-1779194906@example.com"
  }
}
```

## 11. 写入收货地址

### Curl

```bash
ADDRESS='{"full_name":"Curl Mine User","telephone":"13800138000","address_1":"1 Test Street","address_2":"Suite 100","city":"Los Angeles","province":"CA","country":"US","postcode":"90001"}'

curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"shipping\",\"address\":$ADDRESS}" \
  "$BASE/api/carts/$CART_ID/addresses" \
  -o "$TMP_DIR/09-add-shipping-address.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/09-add-shipping-address.json"
```

### 关键返回

```json
{
  "data": {
    "full_name": "Curl Mine User",
    "country": "US",
    "province": "CA",
    "city": "Los Angeles",
    "address_1": "1 Test Street",
    "postcode": "90001"
  }
}
```

## 12. 写入账单地址

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"billing\",\"address\":$ADDRESS}" \
  "$BASE/api/carts/$CART_ID/addresses" \
  -o "$TMP_DIR/10-add-billing-address.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/10-add-billing-address.json"
```

### 关键返回

```json
{
  "data": {
    "full_name": "Curl Mine User",
    "country": "US",
    "province": "CA",
    "city": "Los Angeles",
    "address_1": "1 Test Street",
    "postcode": "90001"
  }
}
```

## 13. 查询购物车可用配送和支付方式

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query { cart(id: \\\"$CART_ID\\\") { uuid customerId customerEmail totalQty grandTotal { value text } availableShippingMethods(country: \\\"US\\\", province: \\\"CA\\\", postcode: \\\"90001\\\") { code name cost { value text } } availablePaymentMethods { code name } } }\"}" \
  "$BASE/api/graphql" \
  -o "$TMP_DIR/11-cart-methods.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/11-cart-methods.json"

SHIP_CODE="$(jq -r '.data.cart.availableShippingMethods[0].code' "$TMP_DIR/11-cart-methods.json")"
```

### 关键返回

```json
{
  "data": {
    "cart": {
      "customerId": 4,
      "customerEmail": "mainflow-mine-1779194906@example.com",
      "totalQty": 1,
      "grandTotal": {
        "value": 35,
        "text": "$35.00"
      },
      "availableShippingMethods": [
        {
          "code": "f2f370d1-82b7-4e28-b902-1f523bef9629",
          "name": "Curl Test Flat Rate 1779194794",
          "cost": {
            "value": 5,
            "text": "$5.00"
          }
        }
      ],
      "availablePaymentMethods": [
        {
          "code": "nbc_wallet",
          "name": "NBC Wallet"
        }
      ]
    }
  }
}
```

## 14. 设置配送方式

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"method_code\":\"$SHIP_CODE\"}" \
  "$BASE/api/carts/$CART_ID/shippingMethods" \
  -o "$TMP_DIR/12-add-shipping-method.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/12-add-shipping-method.json"
```

### 关键返回

```json
{
  "data": {
    "method": {
      "code": "f2f370d1-82b7-4e28-b902-1f523bef9629"
    }
  }
}
```

## 15. 设置支付方式为 NBC Wallet

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"method_code":"nbc_wallet","method_name":"NBC Wallet"}' \
  "$BASE/api/carts/$CART_ID/paymentMethods" \
  -o "$TMP_DIR/13-add-payment-method.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/13-add-payment-method.json"
```

### 关键返回

```json
{
  "data": {
    "method": {
      "code": "nbc_wallet",
      "name": "NBC Wallet"
    }
  }
}
```

## 16. 创建订单

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"cart_id\":\"$CART_ID\"}" \
  "$BASE/api/orders" \
  -o "$TMP_DIR/14-create-order.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/14-create-order.json"

ORDER_UUID="$(jq -r '.data.uuid' "$TMP_DIR/14-create-order.json")"
```

### 关键返回

```json
{
  "data": {
    "order_id": 2,
    "uuid": "64ecd28e-ecfa-4d08-bb7e-8a49c5de8a8c",
    "order_number": "10002",
    "status": "new",
    "customer_id": 4,
    "customer_email": "mainflow-mine-1779194906@example.com",
    "sub_total": "35.0000",
    "shipping_fee_incl_tax": "5.0000",
    "grand_total": "40.0000",
    "shipping_method_name": "Curl Test Flat Rate 1779194794",
    "payment_method": "nbc_wallet",
    "payment_method_name": "NBC Wallet",
    "payment_status": "pending",
    "shipment_status": "pending"
  }
}
```

## 17. NBC 钱包支付扣款

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"order_uuid\":\"$ORDER_UUID\"}" \
  "$BASE/api/nbcWallet/orders/capture" \
  -o "$TMP_DIR/15-nbc-capture.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/15-nbc-capture.json"
```

### 关键返回

```json
{
  "data": {
    "orderUuid": "64ecd28e-ecfa-4d08-bb7e-8a49c5de8a8c",
    "orderId": 2,
    "nbcAmount": 4000,
    "cnyAmount": 40,
    "exchangeRate": 0.01,
    "balanceAfter": 995999
  }
}
```

说明：

- 订单总额为 `40.00`。
- 汇率 `NBC_TO_CNY = 0.01`。
- 扣款数量：`40 / 0.01 = 4000 NBC`。

## 18. 查询支付后钱包余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/16-wallet-balance-after.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/16-wallet-balance-after.json"
```

### 关键返回

```json
{
  "data": {
    "wallet": {
      "balance": 995999,
      "availableBalance": 995999,
      "currency": "NBC",
      "exchangeRate": 0.01,
      "cnyValue": 9959.99
    }
  }
}
```

## 19. 查询钱包交易流水

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?limit=5" \
  -o "$TMP_DIR/17-wallet-transactions.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/17-wallet-transactions.json"
```

### 关键返回

```json
{
  "data": {
    "items": [
      {
        "transactionType": "debit",
        "amount": 4000,
        "balanceBefore": 999999,
        "balanceAfter": 995999,
        "exchangeRate": 0.01,
        "cnyAmount": 40,
        "reference": "64ecd28e-ecfa-4d08-bb7e-8a49c5de8a8c",
        "status": "completed",
        "metadata": {
          "source": "order_capture"
        }
      },
      {
        "transactionType": "admin_credit",
        "amount": 999999,
        "balanceBefore": 0,
        "balanceAfter": 999999,
        "status": "completed"
      }
    ],
    "total": 2
  }
}
```

## 20. 环境初始化：创建测试配送区域和配送方式

如果 `availableShippingMethods` 返回空数组，说明测试环境还没有可用配送区域。可以使用下面 curl 创建测试配送配置。

### 创建配送区域

```bash
ZONE_NAME="Curl Test US Zone $(date +%s)"

curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$ZONE_NAME\",\"country\":\"US\",\"provinces\":[\"CA\"]}" \
  "$BASE/api/shippingZones" \
  -o "$TMP_DIR/create-shipping-zone.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/create-shipping-zone.json"

ZONE_ID="$(jq -r '.data.uuid' "$TMP_DIR/create-shipping-zone.json")"
```

### 创建配送方式

```bash
METHOD_NAME="Curl Test Flat Rate $(date +%s)"

curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$METHOD_NAME\"}" \
  "$BASE/api/shippingMethods" \
  -o "$TMP_DIR/create-shipping-method.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/create-shipping-method.json"

METHOD_ID="$(jq -r '.data.uuid' "$TMP_DIR/create-shipping-method.json")"
```

### 绑定配送区域和配送方式

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"method_id\":\"$METHOD_ID\",\"calculation_type\":\"flat_rate\",\"condition_type\":\"none\",\"cost\":\"5.00\",\"is_enabled\":1}" \
  "$BASE/api/shippingZones/$ZONE_ID/methods" \
  -o "$TMP_DIR/add-zone-method.json" \
  -w "HTTP %{http_code}\n"

jq . "$TMP_DIR/add-zone-method.json"
```

### 关键返回

```json
{
  "data": {
    "is_enabled": true,
    "cost": "5.0000",
    "condition_type": null
  }
}
```

## 21. 已发现问题与注意事项

### 21.1 商品列表 currentPage 字段异常

查询 `products.currentPage` 时，测试环境返回：

```json
{
  "error": {
    "status": 500,
    "message": "Cannot return null for non-nullable field ProductCollection.currentPage."
  }
}
```

建议后续修复 `ProductCollection.currentPage` resolver 或 schema 定义。

### 21.2 匿名购物车订单无法完成 NBC capture

如果使用 `POST /api/carts` 创建购物车，即使带了客户 cookie，当前返回订单里的 `customer_id` 仍可能是 `null`。这种订单调用 NBC capture 会返回：

```json
{
  "error": {
    "status": 500,
    "message": "Order does not belong to current customer"
  }
}
```

因此 NBC 钱包支付主流程需要使用：

```bash
POST /api/cart/mine/items
```

来创建绑定当前客户的“我的购物车”。

### 21.3 测试环境初始没有配送方式

测试环境一开始 `allowedCountries` 为空，购物车查询 `availableShippingMethods` 也为空。需要先创建配送区域和配送方式，否则创建订单会返回：

```json
{
  "error": {
    "message": "We do not ship to this address",
    "status": 400
  }
}
```

## 22. 本次验证结论

已真实通过 curl 跑通：

- 商品查询：`200`
- 钱包签名参数：`200`
- 钱包签名登录：`200`
- 后台登录：`200`
- 后台钱包加款：`200`
- 我的购物车加商品：`200`
- 写入联系人：`200`
- 写入收货地址：`200`
- 写入账单地址：`200`
- 查询可用配送/支付方式：`200`
- 设置配送方式：`200`
- 设置 NBC 钱包支付方式：`200`
- 创建订单：`200`
- NBC 钱包扣款：`200`
- 查询扣款后余额：`200`
- 查询交易流水：`200`
