# NBC 商城主流程 Curl 接口测试文档

最后一次基于测试环境验证日期：2026-05-19

测试环境基础地址：

```bash
BASE="http://156.251.17.96:3000"
```

说明：本文档中的“返回值”均来自真实 curl 调用后保存的原始 JSON 文件，目录为：

```bash
/tmp/nbc-store-main-flow-curl-test-mine
```

测试过程中使用的是临时测试钱包。文档不记录测试钱包私钥，只记录接口真实返回。

## 1. 查询商品列表

### Curl

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d '{"query":"query { products(filters: [{key: \"page\", operation: eq, value: \"1\"}, {key: \"limit\", operation: eq, value: \"5\"}]) { items { productId sku name url } total } }"}' \
  "$BASE/api/graphql" \
  -o "$TMP_DIR/01-products.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

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
        },
        {
          "productId": 14,
          "sku": "THERMO-005-BLK",
          "name": "Stainless Steel Thermos - Black",
          "url": "/accessories/stainless-steel-thermos-black"
        },
        {
          "productId": 13,
          "sku": "THERMO-005-WHT",
          "name": "Stainless Steel Thermos - White",
          "url": "/accessories/stainless-steel-thermos-white"
        },
        {
          "productId": 12,
          "sku": "VASE-004-YEL",
          "name": "Modern Ceramic Vase - Green",
          "url": "/accessories/modern-ceramic-vase-green"
        },
        {
          "productId": 11,
          "sku": "VASE-004-BLK",
          "name": "Modern Ceramic Vase - Black",
          "url": "/accessories/modern-ceramic-vase-black"
        }
      ],
      "total": 15
    }
  }
}
```

本次主流程选用商品：

```bash
SKU="THERMO-005-YEL"
```

## 2. 请求钱包签名参数

### Curl

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\"}" \
  "$BASE/api/nbcWallet/auth/request" \
  -o "$TMP_DIR/02-wallet-auth-request.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "walletAddress": "0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3",
    "nonce": "1161cee04aa04dee48c2b7434a024cfb",
    "message": "Sign this message to authenticate with NBC Store.\n\nNonce: 1161cee04aa04dee48c2b7434a024cfb",
    "expiresAt": "2026-05-19T12:58:24.389Z"
  }
}
```

## 3. 钱包签名并登录

### 签名生成

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
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "sid": "s1RvVVHTLVYLwEjEcRPibZihPqJmKh0J",
    "customer": {
      "customerId": 4,
      "uuid": "4681c60e-a1cd-40e4-86fa-1d0897bde21d",
      "email": "wallet_0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3@nbc.local",
      "fullName": "0xed8e...d5a3"
    },
    "wallet": {
      "address": "0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3"
    }
  }
}
```

## 4. 后台登录

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
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "sid": "2Xdmd5ullUmAqQQG-OpX-4tikfKmXjkF"
  }
}
```

## 5. 后台给测试钱包加款

### Curl

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"type\":\"credit\",\"amount\":999999,\"reason\":\"main flow mine cart test balance\",\"reference\":\"main-flow-mine-1779194905\"}" \
  "$BASE/api/admin/nbcWallet/adjust" \
  -o "$TMP_DIR/05-wallet-adjust.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "walletId": 4,
    "customerId": 4,
    "walletAddress": "0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3",
    "transactionId": 4,
    "transactionType": "admin_credit",
    "amount": 999999,
    "balanceBefore": 0,
    "balanceAfter": 999999,
    "reason": "main flow mine cart test balance",
    "reference": "main-flow-mine-1779194905"
  }
}
```

## 6. 查询加款后钱包余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/06-wallet-balance-before.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "wallet": {
      "walletId": 4,
      "uuid": "82d122b1-bd3a-45ce-86e0-67b1f9084b04",
      "customerId": 4,
      "walletAddress": "0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3",
      "chainId": null,
      "balance": 999999,
      "frozenBalance": 0,
      "availableBalance": 999999,
      "currency": "NBC",
      "status": 1,
      "exchangeRate": 0.01,
      "cnyValue": 9999.99,
      "availableCnyValue": 9999.99,
      "lastLoginAt": "2026-05-19T12:48:24.860Z",
      "createdAt": "2026-05-19T12:48:24.768Z",
      "updatedAt": "2026-05-19T12:48:26.500Z"
    }
  }
}
```

## 7. 加入我的购物车

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
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "item": {
      "uuid": "e3514ed4-7100-444d-a81f-8a0815c0f495",
      "product_id": 15,
      "productUrl": "/accessories/stainless-steel-thermos-yellow",
      "product_uuid": "aaa2f6fd-3ad4-436c-a7e6-ccfba28ff4d7",
      "product_sku": "THERMO-005-YEL",
      "group_id": 2,
      "category_id": 4,
      "product_name": "Stainless Steel Thermos - Yellow",
      "thumbnail": "/assets/catalog/8744/6622/thermos-yellow.jpg",
      "product_weight": 350,
      "no_shipping_required": false,
      "tax_class_id": null,
      "qty": 1,
      "variant_group_id": 5,
      "variant_options": "[{\"attribute_code\":\"color\",\"attribute_name\":\"Color\",\"attribute_id\":1,\"option_id\":3,\"option_text\":\"Yellow\"}]",
      "tax_percent": 0,
      "product_price": 35,
      "product_price_incl_tax": 35,
      "tax_amount_before_discount": 0,
      "final_price": 35,
      "final_price_incl_tax": 35,
      "line_total": 35,
      "line_total_incl_tax": 35,
      "discount_amount": 0,
      "tax_amount": 0,
      "line_total_with_discount": 35,
      "line_total_with_discount_incl_tax": 35,
      "errors": {}
    },
    "count": 1,
    "cartId": "b0c52bb718414f959481737d064c4bbd"
  }
}
```

后续使用：

```bash
CART_ID="b0c52bb718414f959481737d064c4bbd"
```

## 8. 写入联系人邮箱

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"email":"mainflow-mine-1779194906@example.com"}' \
  "$BASE/api/carts/$CART_ID/contacts" \
  -o "$TMP_DIR/08-add-contact.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "email": "mainflow-mine-1779194906@example.com"
  }
}
```

## 9. 写入收货地址

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
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "cart_address_id": 5,
    "uuid": "8299e14b-455d-4d1a-a196-cec99cd6b691",
    "full_name": "Curl Mine User",
    "postcode": "90001",
    "telephone": "13800138000",
    "country": "US",
    "province": "CA",
    "city": "Los Angeles",
    "address_1": "1 Test Street",
    "address_2": "Suite 100"
  }
}
```

## 10. 写入账单地址

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"billing\",\"address\":$ADDRESS}" \
  "$BASE/api/carts/$CART_ID/addresses" \
  -o "$TMP_DIR/10-add-billing-address.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "cart_address_id": 6,
    "uuid": "82a4b539-85b7-45e7-9993-4fb6b422470e",
    "full_name": "Curl Mine User",
    "postcode": "90001",
    "telephone": "13800138000",
    "country": "US",
    "province": "CA",
    "city": "Los Angeles",
    "address_1": "1 Test Street",
    "address_2": "Suite 100"
  }
}
```

## 11. 查询购物车可用配送和支付方式

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query { cart(id: \\\"$CART_ID\\\") { uuid customerId customerEmail totalQty grandTotal { value text } availableShippingMethods(country: \\\"US\\\", province: \\\"CA\\\", postcode: \\\"90001\\\") { code name cost { value text } } availablePaymentMethods { code name } } }\"}" \
  "$BASE/api/graphql" \
  -o "$TMP_DIR/11-cart-methods.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "cart": {
      "uuid": "b0c52bb7-1841-4f95-9481-737d064c4bbd",
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

后续使用：

```bash
SHIP_CODE="f2f370d1-82b7-4e28-b902-1f523bef9629"
```

## 12. 设置配送方式

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"method_code\":\"$SHIP_CODE\"}" \
  "$BASE/api/carts/$CART_ID/shippingMethods" \
  -o "$TMP_DIR/12-add-shipping-method.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "method": {
      "code": "f2f370d1-82b7-4e28-b902-1f523bef9629"
    }
  }
}
```

## 13. 设置支付方式为 NBC Wallet

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"method_code":"nbc_wallet","method_name":"NBC Wallet"}' \
  "$BASE/api/carts/$CART_ID/paymentMethods" \
  -o "$TMP_DIR/13-add-payment-method.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

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

## 14. 创建订单

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"cart_id\":\"$CART_ID\"}" \
  "$BASE/api/orders" \
  -o "$TMP_DIR/14-create-order.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "order_id": 2,
    "uuid": "64ecd28e-ecfa-4d08-bb7e-8a49c5de8a8c",
    "integration_order_id": null,
    "sid": "s1RvVVHTLVYLwEjEcRPibZihPqJmKh0J",
    "order_number": "10002",
    "status": "new",
    "cart_id": 3,
    "currency": "USD",
    "customer_id": 4,
    "customer_email": "mainflow-mine-1779194906@example.com",
    "customer_full_name": "0xed8e...d5a3",
    "user_ip": null,
    "user_agent": null,
    "coupon": null,
    "shipping_fee_excl_tax": "5.0000",
    "shipping_fee_incl_tax": "5.0000",
    "discount_amount": "0.0000",
    "sub_total": "35.0000",
    "sub_total_incl_tax": "35.0000",
    "sub_total_with_discount": "35.0000",
    "sub_total_with_discount_incl_tax": "35.0000",
    "total_qty": 1,
    "total_weight": "350.0000",
    "tax_amount": "0.0000",
    "tax_amount_before_discount": "0.0000",
    "shipping_tax_amount": "0.0000",
    "shipping_note": null,
    "grand_total": "40.0000",
    "shipping_method": "f2f370d1-82b7-4e28-b902-1f523bef9629",
    "shipping_method_name": "Curl Test Flat Rate 1779194794",
    "shipping_address_id": 3,
    "payment_method": "nbc_wallet",
    "payment_method_name": "NBC Wallet",
    "billing_address_id": 4,
    "shipment_status": "pending",
    "payment_status": "pending",
    "created_at": "2026-05-19T12:48:26.850Z",
    "updated_at": "2026-05-19T12:48:26.850Z",
    "total_tax_amount": "0.0000",
    "no_shipping_required": false,
    "items": [
      {
        "order_item_id": 2,
        "uuid": "b5264f3e-e23d-45fc-a0d2-350acb04eba1",
        "order_item_order_id": 2,
        "product_id": 15,
        "referer": null,
        "product_sku": "THERMO-005-YEL",
        "product_name": "Stainless Steel Thermos - Yellow",
        "thumbnail": "/assets/catalog/8744/6622/thermos-yellow.jpg",
        "product_weight": "350.0000",
        "product_price": "35.0000",
        "product_price_incl_tax": "35.0000",
        "qty": 1,
        "final_price": "35.0000",
        "final_price_incl_tax": "35.0000",
        "tax_percent": "0.0000",
        "tax_amount": "0.0000",
        "tax_amount_before_discount": "0.0000",
        "discount_amount": "0.0000",
        "line_total": "35.0000",
        "line_total_with_discount": "35.0000",
        "line_total_incl_tax": "35.0000",
        "line_total_with_discount_incl_tax": "35.0000",
        "variant_group_id": 5,
        "variant_options": "[{\"attribute_code\":\"color\",\"attribute_name\":\"Color\",\"attribute_id\":1,\"option_id\":3,\"option_text\":\"Yellow\"}]",
        "product_custom_options": null,
        "requested_data": null,
        "no_shipping_required": false
      }
    ],
    "shipping_address": {
      "order_address_id": 3,
      "uuid": "423ff0d3-f570-4522-9334-050157b3e533",
      "full_name": "Curl Mine User",
      "postcode": "90001",
      "telephone": "13800138000",
      "country": "US",
      "province": "CA",
      "city": "Los Angeles",
      "address_1": "1 Test Street",
      "address_2": "Suite 100"
    },
    "billing_address": {
      "order_address_id": 4,
      "uuid": "a43ead4d-dd96-4722-b59f-4810da6de49b",
      "full_name": "Curl Mine User",
      "postcode": "90001",
      "telephone": "13800138000",
      "country": "US",
      "province": "CA",
      "city": "Los Angeles",
      "address_1": "1 Test Street",
      "address_2": "Suite 100"
    },
    "links": [
      {
        "rel": "edit",
        "href": "/admin/order/edit/64ecd28e-ecfa-4d08-bb7e-8a49c5de8a8c",
        "action": "GET",
        "types": [
          "text/xml"
        ]
      }
    ]
  }
}
```

后续使用：

```bash
ORDER_UUID="64ecd28e-ecfa-4d08-bb7e-8a49c5de8a8c"
```

## 15. NBC 钱包支付扣款

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"order_uuid\":\"$ORDER_UUID\"}" \
  "$BASE/api/nbcWallet/orders/capture" \
  -o "$TMP_DIR/15-nbc-capture.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

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

## 16. 查询支付后钱包余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/16-wallet-balance-after.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "wallet": {
      "walletId": 4,
      "uuid": "82d122b1-bd3a-45ce-86e0-67b1f9084b04",
      "customerId": 4,
      "walletAddress": "0xed8e5531f2abe5d67b57c8cf6ed90d8d3876d5a3",
      "chainId": null,
      "balance": 995999,
      "frozenBalance": 0,
      "availableBalance": 995999,
      "currency": "NBC",
      "status": 1,
      "exchangeRate": 0.01,
      "cnyValue": 9959.99,
      "availableCnyValue": 9959.99,
      "lastLoginAt": "2026-05-19T12:48:24.860Z",
      "createdAt": "2026-05-19T12:48:24.768Z",
      "updatedAt": "2026-05-19T12:48:31.108Z"
    }
  }
}
```

## 17. 查询钱包交易流水

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?limit=5" \
  -o "$TMP_DIR/17-wallet-transactions.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "items": [
      {
        "walletTxId": 5,
        "uuid": "108169ff-440e-4cc4-8673-02246368d578",
        "walletId": 4,
        "orderId": 2,
        "orderUuid": "64ecd28e-ecfa-4d08-bb7e-8a49c5de8a8c",
        "orderNumber": "10002",
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
        },
        "createdAt": "2026-05-19T12:48:31.108Z"
      },
      {
        "walletTxId": 4,
        "uuid": "7214cd6f-79da-4ed8-b870-cbed2e59f787",
        "walletId": 4,
        "orderId": null,
        "orderUuid": null,
        "orderNumber": null,
        "transactionType": "admin_credit",
        "amount": 999999,
        "balanceBefore": 0,
        "balanceAfter": 999999,
        "exchangeRate": null,
        "cnyAmount": null,
        "reference": "main-flow-mine-1779194905",
        "status": "completed",
        "metadata": {
          "reason": "main flow mine cart test balance",
          "source": "admin_adjustment",
          "performed_by": "admin:62d4756c-82bf-440c-8caf-57d28897b069"
        },
        "createdAt": "2026-05-19T12:48:26.500Z"
      }
    ],
    "currentPage": 1,
    "pageSize": 5,
    "total": 2
  }
}
```

## 18. 实测注意事项

### 18.1 商品列表 currentPage 字段异常

真实测试中，如果 GraphQL 查询 `products.currentPage`，接口返回：

```json
{
  "error": {
    "status": 500,
    "message": "Cannot return null for non-nullable field ProductCollection.currentPage."
  }
}
```

因此本文主流程查询商品时没有请求 `currentPage` 字段。

### 18.2 匿名购物车订单无法完成 NBC capture

真实测试中，如果使用 `POST /api/carts` 创建匿名购物车，订单会出现 `customer_id = null`，随后调用 NBC capture 返回：

```json
{
  "error": {
    "status": 500,
    "message": "Order does not belong to current customer"
  }
}
```

因此 NBC 钱包支付主流程必须使用：

```bash
POST /api/cart/mine/items
```

来创建绑定当前客户的“我的购物车”。

### 18.3 配送方式前置条件

真实测试中，测试环境一开始没有可用配送方式，创建订单会返回：

```json
{
  "error": {
    "message": "We do not ship to this address",
    "status": 400
  }
}
```

已通过后台接口创建测试配送区域和配送方式后，主流程才完整跑通。

## 19. 本次真实验证结论

以下接口均已通过真实 curl 调用验证为 `200`：

- `POST /api/graphql` 商品列表
- `POST /api/nbcWallet/auth/request`
- `POST /api/nbcWallet/auth/verify`
- `POST /admin/user/login`
- `POST /api/admin/nbcWallet/adjust`
- `GET /api/nbcWallet/balance`
- `POST /api/cart/mine/items`
- `POST /api/carts/:cart_id/contacts`
- `POST /api/carts/:cart_id/addresses`
- `POST /api/graphql` 查询购物车配送/支付方式
- `POST /api/carts/:cart_id/shippingMethods`
- `POST /api/carts/:cart_id/paymentMethods`
- `POST /api/orders`
- `POST /api/nbcWallet/orders/capture`
- `GET /api/nbcWallet/transactions`

## 20. NBC 链上入金开启与闭环验证

本节验证日期：2026-06-16

测试环境：

```bash
BASE="http://156.251.17.96:3000"
TMP_DIR="/tmp/nbc-native-deposit-curl-1781575055"
ADMIN_COOKIE="$TMP_DIR/admin.cookie"
CUSTOMER_COOKIE="$TMP_DIR/customer.cookie"
```

### 20.1 当前线上链上入金配置

服务器当前配置读取结果：

```json
{
  "enabled": 1,
  "rpcUrl": "https://rpc.nbcex.com",
  "chainId": 1281,
  "assetType": "native",
  "tokenAddress": "",
  "treasuryAddress": "",
  "startBlock": 3347083,
  "confirmations": 0,
  "depositMode": "hd"
}
```

NBC RPC 节点连通性验证：

```bash
curl -sS --max-time 10 \
  -H "content-type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  https://rpc.nbcex.com

curl -sS --max-time 10 \
  -H "content-type: application/json" \
  --data '{"jsonrpc":"2.0","id":2,"method":"eth_blockNumber","params":[]}' \
  https://rpc.nbcex.com
```

真实返回：

```json
{"jsonrpc":"2.0","id":1,"result":"0x501"}
{"jsonrpc":"2.0","id":2,"result":"0x32e1c1"}
```

说明：

- `0x501` 对应十进制 `1281`，与当前 `chainId` 配置一致。
- RPC 可用，链上入金已开启为 native + HD 模式。

### 20.2 用户钱包签名登录

### Curl

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\"}" \
  "$BASE/api/nbcWallet/auth/request" \
  -o "$TMP_DIR/01-auth-request.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

```bash
curl -sS \
  -c "$CUSTOMER_COOKIE" \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}" \
  "$BASE/api/nbcWallet/auth/verify" \
  -o "$TMP_DIR/02-auth-verify.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "sid": "已返回",
    "customer": {
      "customerId": 5,
      "email": "wallet_0xcd57255bd0ec4c0ebde9441d411f9d45561bd3fd@nbc.local",
      "fullName": "0xcd57...d3fd"
    },
    "wallet": {
      "address": "0xcd57255bd0ec4c0ebde9441d411f9d45561bd3fd"
    }
  }
}
```

### 20.3 分配 BIP44 HD 充值地址

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -X POST \
  "$BASE/api/nbcWallet/deposit-address" \
  -o "$TMP_DIR/03-deposit-address.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "mode": "hd",
    "walletId": 5,
    "customerId": 5,
    "depositAddress": "0xf241e143f1dfda0f81e9ac48e271765834fe36c7",
    "addressIndex": 0,
    "chainId": 1281,
    "tokenAddress": ""
  }
}
```

### 20.4 查询入金前钱包余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/04-balance-before.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "walletId": 5,
  "walletAddress": "0xcd57255bd0ec4c0ebde9441d411f9d45561bd3fd",
  "depositAddress": "0xf241e143f1dfda0f81e9ac48e271765834fe36c7",
  "addressIndex": 0,
  "balance": 0,
  "availableBalance": 0
}
```

### 20.5 后台登录并手动触发 native 扫链

### Curl

```bash
curl -sS \
  -c "$ADMIN_COOKIE" \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123456"}' \
  "$BASE/admin/user/login" \
  -o "$TMP_DIR/05-admin-login.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -X POST \
  "$BASE/api/admin/nbcWallet/onchain/process" \
  -o "$TMP_DIR/06-onchain-process.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "enabled": true,
    "fromBlock": 3347083,
    "toBlock": 3347098,
    "latestBlock": 3347098,
    "processed": 0,
    "settled": 0
  }
}
```

### 20.6 查询链上入金流水

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?transactionType=onchain_deposit&limit=5" \
  -o "$TMP_DIR/07-onchain-transactions.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "items": [],
    "currentPage": 1,
    "pageSize": 5,
    "total": 0
  }
}
```

### 20.7 充值后再次触发扫链

测试转账信息：

```json
{
  "blockNumber": 3347798,
  "txHash": "0x8a1652290be20f418209e8c434402962fd81e51509701e1f0efb46445d75a805",
  "from": "0x931f3600a299fd9b24cefb3bff79388d19804bea",
  "to": "0xf241e143f1dfda0f81e9ac48e271765834fe36c7",
  "value": "100.0 NBC"
}
```

### Curl

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -X POST \
  "$BASE/api/admin/nbcWallet/onchain/process" \
  -o "$TMP_DIR/08-onchain-process-after-transfer.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "enabled": true,
    "fromBlock": 3347149,
    "toBlock": 3347871,
    "latestBlock": 3347871,
    "processed": 1,
    "settled": 1
  }
}
```

### 20.8 查询入金后余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/09-balance-after-transfer.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "walletId": 5,
  "walletAddress": "0xcd57255bd0ec4c0ebde9441d411f9d45561bd3fd",
  "depositAddress": "0xf241e143f1dfda0f81e9ac48e271765834fe36c7",
  "addressIndex": 0,
  "balance": 100,
  "availableBalance": 100
}
```

### 20.9 查询入金流水

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?transactionType=onchain_deposit&limit=10" \
  -o "$TMP_DIR/10-onchain-transactions-after-transfer.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "walletTxId": 6,
  "uuid": "2059916a-c3a5-4410-907d-44e9544ba674",
  "walletId": 5,
  "orderId": null,
  "orderUuid": null,
  "orderNumber": null,
  "transactionType": "onchain_deposit",
  "amount": 100,
  "balanceBefore": 0,
  "balanceAfter": 100,
  "exchangeRate": null,
  "cnyAmount": null,
  "reference": "0x8a1652290be20f418209e8c434402962fd81e51509701e1f0efb46445d75a805",
  "status": "completed",
  "metadata": {
    "source": "onchain_deposit",
    "chain_id": 1281,
    "log_index": 0,
    "block_number": 3347798,
    "token_address": "native:NBC"
  },
  "createdAt": "2026-06-16T03:28:01.535Z"
}
```

### 20.10 当前结论

已完成完整闭环：

- NBC Chain RPC 连通性验证。
- 原生币 native 入金代码部署。
- `enabled=1`、`assetType=native`、`deposit.mode=hd` 已在测试环境开启。
- BIP44 HD 充值地址已通过真实 curl 分配成功，地址为 `0xf241e143f1dfda0f81e9ac48e271765834fe36c7`。
- 向充值地址转入 `100 NBC` 后，手动扫链返回 `processed=1`、`settled=1`。
- 商城钱包余额从 `0` 增加到 `100`。
- `onchain_deposit` 流水生成，`reference` 为链上交易哈希。

## 21. NBC 原生币出金闭环验证

本节验证日期：2026-06-16

测试环境：

```bash
BASE="http://156.251.17.96:3000"
TMP_DIR="/tmp/nbc-native-withdrawal-curl-1781613795"
CUSTOMER_COOKIE="$TMP_DIR/customer.cookie"
ADMIN_COOKIE="$TMP_DIR/admin.cookie"
ADDR="0x7ee9c236ffdb4057c90d448a21b52b2e253ce611"
```

出金测试 treasury：

```json
{
  "treasuryAddress": "0xd54482180fbb5fe3735a508f5abcff4f5390a3d5",
  "fundedTx": "0x111e055be8d010fb1084a8c84b396961f0d73942742bb6c03934134d6a433f4f",
  "fundedAmount": "20 NBC"
}
```

说明：本次测试使用单独生成的出金 treasury 钱包，并配置 `NBC_WALLET_TREASURY_PRIVATE_KEY`；NBC 为 native 原生币，出金链上转账使用 `signer.sendTransaction({ to, value })`。

### 21.1 用户钱包签名登录

### Curl

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\"}" \
  "$BASE/api/nbcWallet/auth/request" \
  -o "$TMP_DIR/01-auth-request.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

```bash
curl -sS \
  -c "$CUSTOMER_COOKIE" \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}" \
  "$BASE/api/nbcWallet/auth/verify" \
  -o "$TMP_DIR/02-auth-verify.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 21.2 后台给测试钱包加内部余额

### Curl

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"type\":\"credit\",\"amount\":50,\"reason\":\"native withdrawal curl test\",\"reference\":\"withdraw-curl-1781613796\"}" \
  "$BASE/api/admin/nbcWallet/adjust" \
  -o "$TMP_DIR/04-admin-credit.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "walletId": 6,
    "customerId": 6,
    "walletAddress": "0x7ee9c236ffdb4057c90d448a21b52b2e253ce611",
    "transactionId": 7,
    "transactionType": "admin_credit",
    "amount": 50,
    "balanceBefore": 0,
    "balanceAfter": 50,
    "reason": "native withdrawal curl test",
    "reference": "withdraw-curl-1781613796"
  }
}
```

### 21.3 查询出金前内部余额和链上余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/05-balance-before.json" \
  -w "HTTP %{http_code}\n"

curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/onchain/balance?walletAddress=$ADDR" \
  -o "$TMP_DIR/06-onchain-before.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "walletBalance": {
    "balance": 50,
    "frozenBalance": 0,
    "availableBalance": 50
  },
  "onchainBalance": {
    "balance": 0,
    "balanceRaw": "0",
    "source": "native",
    "chainId": 1281,
    "tokenAddress": null
  }
}
```

### 21.4 用户申请出金

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"amount":5}' \
  "$BASE/api/nbcWallet/withdraw" \
  -o "$TMP_DIR/07-withdraw-request.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "withdrawalId": 1,
    "amount": 5,
    "walletAddress": "0x7ee9c236ffdb4057c90d448a21b52b2e253ce611",
    "frozenBalance": 5
  }
}
```

随后查询出金列表取得 `withdrawal_uuid`：

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/withdrawals?limit=1" \
  -o "$TMP_DIR/08-withdrawals-after-request.json" \
  -w "HTTP %{http_code}\n"
```

取得：

```bash
WITHDRAW_UUID="214dc8c5-388f-4acc-adb9-557aef42ed40"
```

### 21.5 后台审批出金

### Curl

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"withdrawal_uuid\":\"$WITHDRAW_UUID\"}" \
  "$BASE/api/admin/nbcWallet/withdrawals/approve" \
  -o "$TMP_DIR/09-withdraw-approve.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "withdrawalUuid": "214dc8c5-388f-4acc-adb9-557aef42ed40",
    "withdrawalId": 1,
    "walletId": 6,
    "customerId": 6,
    "amount": 5,
    "walletAddress": "0x7ee9c236ffdb4057c90d448a21b52b2e253ce611",
    "status": "approved",
    "approvedBy": "admin:62d4756c-82bf-440c-8caf-57d28897b069",
    "alreadyApproved": false
  }
}
```

### 21.6 后台处理链上出金

### Curl

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"withdrawal_uuid\":\"$WITHDRAW_UUID\"}" \
  "$BASE/api/admin/nbcWallet/withdrawals/process" \
  -o "$TMP_DIR/10-withdraw-process.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "withdrawalUuid": "214dc8c5-388f-4acc-adb9-557aef42ed40",
    "status": "completed",
    "txHash": "0x18e9da7e3c2d7df8cbb1c8d5f08012bbb3a359cb5444c07641e0702508a87134",
    "balanceAfter": 45,
    "frozenBalance": 0
  }
}
```

### 21.7 查询出金后余额

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/11-balance-after.json" \
  -w "HTTP %{http_code}\n"

curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/onchain/balance?walletAddress=$ADDR" \
  -o "$TMP_DIR/12-onchain-after.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "walletBalance": {
    "balance": 45,
    "frozenBalance": 0,
    "availableBalance": 45
  },
  "onchainBalance": {
    "balance": 5,
    "balanceRaw": "5000000000000000000",
    "source": "native",
    "chainId": 1281,
    "tokenAddress": null
  }
}
```

### 21.8 查询出金记录与钱包流水

### Curl

```bash
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/withdrawals?limit=5" \
  -o "$TMP_DIR/13-withdrawals-final.json" \
  -w "HTTP %{http_code}\n"

curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?limit=10" \
  -o "$TMP_DIR/14-transactions-final.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "withdrawal": {
    "withdrawalId": 1,
    "uuid": "214dc8c5-388f-4acc-adb9-557aef42ed40",
    "walletId": 6,
    "customerId": 6,
    "walletAddress": "0x7ee9c236ffdb4057c90d448a21b52b2e253ce611",
    "chainId": 1281,
    "tokenAddress": "native:NBC",
    "amount": 5,
    "txHash": "0x18e9da7e3c2d7df8cbb1c8d5f08012bbb3a359cb5444c07641e0702508a87134",
    "walletTxId": 8,
    "status": "completed"
  },
  "transaction": {
    "walletTxId": 8,
    "transactionType": "withdrawal",
    "amount": -5,
    "balanceBefore": 50,
    "balanceAfter": 45,
    "reference": "214dc8c5-388f-4acc-adb9-557aef42ed40",
    "status": "completed",
    "metadata": {
      "source": "onchain_withdrawal",
      "tx_hash": "0x18e9da7e3c2d7df8cbb1c8d5f08012bbb3a359cb5444c07641e0702508a87134",
      "asset_type": "native",
      "performed_by": "admin:62d4756c-82bf-440c-8caf-57d28897b069"
    }
  }
}
```

### 21.9 当前结论

已完成 NBC 原生币出金完整闭环：

- 用户内部余额加款：`50 NBC`。
- 用户申请出金：`5 NBC`，冻结余额变为 `5`。
- 后台审批成功：`requested -> approved`。
- 后台链上处理成功：`approved -> completed`。
- 内部余额从 `50` 扣减到 `45`，冻结余额回到 `0`。
- 用户链上原生 NBC 余额从 `0` 增加到 `5`。
- 出金记录和钱包流水均生成，链上交易哈希为 `0x18e9da7e3c2d7df8cbb1c8d5f08012bbb3a359cb5444c07641e0702508a87134`。
