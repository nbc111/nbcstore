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

本节验证日期：2026-06-15

测试环境：

```bash
BASE="http://156.251.17.96:3000"
TMP_DIR="/tmp/nbc-onchain-curl-check-1781529160"
ADMIN_COOKIE="$TMP_DIR/admin.cookie"
```

### 20.1 当前线上链上入金配置

服务器当前配置读取结果：

```json
{
  "enabled": 0,
  "rpcUrl": "https://rpc.nbcex.com",
  "chainId": 1281,
  "tokenAddress": "",
  "treasuryAddress": "",
  "startBlock": 0,
  "confirmations": 12,
  "depositMode": "treasury"
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
- RPC 可用，但链上入金业务配置尚未开启。

### 20.2 后台登录

### Curl

```bash
curl -sS \
  -c "$ADMIN_COOKIE" \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123456"}' \
  "$BASE/admin/user/login" \
  -o "$TMP_DIR/01-admin-login.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`200`

### 真实返回

```json
{
  "data": {
    "sid": "R67Q0vVZ5AiIFEJqOPziALxhuFpYhhFl"
  }
}
```

### 20.3 手动触发链上入金扫描

### Curl

```bash
curl -sS \
  -b "$ADMIN_COOKIE" \
  -X POST \
  "$BASE/api/admin/nbcWallet/onchain/process" \
  -o "$TMP_DIR/02-onchain-process.json" \
  -w "HTTP %{http_code}\n"
```

HTTP 状态：`500`

### 真实返回

```json
{
  "error": {
    "status": 500,
    "message": "NBC on-chain listener is disabled"
  }
}
```

### 20.4 当前结论

本次没有完成“链上真实转账 -> 扫链 -> 商城余额增加 -> 钱包流水生成”的完整闭环，原因是测试环境缺少并未开启以下配置：

```json
{
  "nbcWallet": {
    "onchain": {
      "enabled": 1,
      "tokenAddress": "需要提供 NBC ERC20 合约地址",
      "treasuryAddress": "需要提供测试网收款地址",
      "startBlock": "建议设置为测试转账前区块"
    }
  }
}
```

当前代码扫描的是 ERC20 `Transfer(address indexed from, address indexed to, uint256 value)` 日志，因此 `tokenAddress` 必须是 NBC token 合约地址。如果 NBC 是链原生币而不是 ERC20 token，则需要新增 native transfer 入金扫描逻辑，不能仅靠当前 `tokenAddress` 配置完成。

### 20.5 配置完成后的闭环验证脚本

配置 `enabled=1`、`tokenAddress`、`treasuryAddress` 并重启服务后，按以下步骤验证：

```bash
BASE="http://156.251.17.96:3000"
TMP_DIR="/tmp/nbc-onchain-curl-test-$(date +%s)"
ADMIN_COOKIE="$TMP_DIR/admin.cookie"
CUSTOMER_COOKIE="$TMP_DIR/customer.cookie"
mkdir -p "$TMP_DIR"

# 1. 后台登录
curl -sS \
  -c "$ADMIN_COOKIE" \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123456"}' \
  "$BASE/admin/user/login" \
  -o "$TMP_DIR/01-admin-login.json" \
  -w "HTTP %{http_code}\n"

# 2. 用户钱包签名登录
# ADDR/PRIV 需替换为测试钱包地址和私钥，私钥不要写入文档或提交。
curl -sS \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\"}" \
  "$BASE/api/nbcWallet/auth/request" \
  -o "$TMP_DIR/02-auth-request.json" \
  -w "HTTP %{http_code}\n"

MESSAGE="$(jq -r '.data.message' "$TMP_DIR/02-auth-request.json")"
NONCE="$(jq -r '.data.nonce' "$TMP_DIR/02-auth-request.json")"
SIG="$(MESSAGE="$MESSAGE" PRIV="$PRIV" node --input-type=module - <<'NODE'
import { Wallet } from 'ethers';
const wallet = new Wallet(process.env.PRIV);
console.log(await wallet.signMessage(process.env.MESSAGE));
NODE
)"

curl -sS \
  -c "$CUSTOMER_COOKIE" \
  -b "$CUSTOMER_COOKIE" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$ADDR\",\"nonce\":\"$NONCE\",\"signature\":\"$SIG\"}" \
  "$BASE/api/nbcWallet/auth/verify" \
  -o "$TMP_DIR/03-auth-verify.json" \
  -w "HTTP %{http_code}\n"

# 3. 查询入金前余额
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/04-balance-before.json" \
  -w "HTTP %{http_code}\n"

# 4. 从测试钱包向 treasuryAddress 转入 NBC token
# 这里需要使用测试网钱包或区块浏览器完成真实 ERC20 transfer，并记录 TX_HASH。

# 5. 手动触发扫链
curl -sS \
  -b "$ADMIN_COOKIE" \
  -X POST \
  "$BASE/api/admin/nbcWallet/onchain/process" \
  -o "$TMP_DIR/05-onchain-process.json" \
  -w "HTTP %{http_code}\n"

# 6. 查询入金后余额
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/balance" \
  -o "$TMP_DIR/06-balance-after.json" \
  -w "HTTP %{http_code}\n"

# 7. 查询链上入金流水
curl -sS \
  -b "$CUSTOMER_COOKIE" \
  "$BASE/api/nbcWallet/transactions?transactionType=onchain_deposit&limit=10" \
  -o "$TMP_DIR/07-onchain-transactions.json" \
  -w "HTTP %{http_code}\n"
```

预期闭环结果：

- `05-onchain-process.json` 返回 `processed >= 1` 且 `settled >= 1`。
- `06-balance-after.json` 中 `balance` 大于 `04-balance-before.json`。
- `07-onchain-transactions.json` 出现 `transactionType = onchain_deposit`，`reference` 为链上交易哈希。
