# NBC Store API

Base URL follows the EverShop application host. All request and response bodies are JSON unless noted.

## Response Shape

Success:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "status": 400,
    "message": "Error message"
  }
}
```

## Wallet Auth

### Request Signature Message

`POST /nbcWallet/auth/request`

Access: public

Request:

```json
{
  "walletAddress": "0x..."
}
```

Response:

```json
{
  "data": {
    "walletAddress": "0x...",
    "nonce": "nonce",
    "message": "Sign this message to authenticate with NBC Store.\n\nNonce: nonce",
    "expiresAt": "2026-05-11T00:00:00.000Z"
  }
}
```

### Verify Signature And Login

`POST /nbcWallet/auth/verify`

Access: public

Request:

```json
{
  "walletAddress": "0x...",
  "nonce": "nonce",
  "signature": "0x..."
}
```

Response:

```json
{
  "data": {
    "sid": "session-id",
    "customer": {
      "customerId": 1,
      "uuid": "customer-uuid",
      "email": "wallet-0x...@nbc.local",
      "fullName": "NBC Wallet 0x..."
    },
    "wallet": {
      "address": "0x..."
    }
  }
}
```

## Front Store Wallet

### Wallet Balance

`GET /nbcWallet/balance`

Access: customer session required

Response:

```json
{
  "data": {
    "wallet": {
      "walletId": 1,
      "uuid": "wallet-uuid",
      "customerId": 1,
      "walletAddress": "0x...",
      "chainId": 1,
      "balance": 1000,
      "frozenBalance": 0,
      "availableBalance": 1000,
      "currency": "NBC",
      "status": 1,
      "exchangeRate": 0.01,
      "cnyValue": 10,
      "availableCnyValue": 10,
      "lastLoginAt": "2026-05-11T00:00:00.000Z",
      "createdAt": "2026-05-11T00:00:00.000Z",
      "updatedAt": "2026-05-11T00:00:00.000Z"
    }
  }
}
```

### Wallet Transactions

`GET /nbcWallet/transactions?page=1&limit=20&transactionType=onchain_deposit`

Access: customer session required

`transactionType` is optional. Common values include `debit`, `refund`, `admin_credit`, `admin_debit`, and `onchain_deposit`.

Response:

```json
{
  "data": {
    "items": [
      {
        "walletTxId": 1,
        "uuid": "transaction-uuid",
        "walletId": 1,
        "orderId": 10,
        "orderUuid": "order-uuid",
        "orderNumber": "100000001",
        "transactionType": "debit",
        "amount": 100,
        "balanceBefore": 1000,
        "balanceAfter": 900,
        "exchangeRate": 0.01,
        "cnyAmount": 1,
        "reference": "order-uuid-or-tx-hash",
        "status": "completed",
        "metadata": {},
        "createdAt": "2026-05-11T00:00:00.000Z"
      }
    ],
    "currentPage": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

## Checkout Payment

### Capture NBC Wallet Payment

`POST /nbcWallet/orders/capture`

Access: customer session required

Request:

```json
{
  "order_uuid": "order-uuid"
}
```

Response:

```json
{
  "data": {
    "orderUuid": "order-uuid",
    "orderId": 10,
    "nbcAmount": 100,
    "cnyAmount": 1,
    "exchangeRate": 0.01,
    "balanceAfter": 900
  }
}
```

## Admin Operations

Admin APIs require an authenticated EverShop admin session.

### Refund NBC Wallet Payment

`POST /nbcWallet/orders/refund`

Access: private

Request:

```json
{
  "order_uuid": "order-uuid"
}
```

Response:

```json
{
  "data": {
    "orderUuid": "order-uuid",
    "orderId": 10,
    "refunded": true,
    "nbcAmount": 100,
    "balanceAfter": 1000
  }
}
```

### Adjust Wallet Balance

`POST /admin/nbcWallet/adjust`

Access: private

Request:

```json
{
  "walletId": 1,
  "type": "credit",
  "amount": 100,
  "reason": "Manual adjustment",
  "reference": "ticket-123"
}
```

Use one of `walletId`, `customerId`, or `walletAddress`. `type` must be `credit` or `debit`.

Response:

```json
{
  "data": {
    "walletId": 1,
    "customerId": 1,
    "walletAddress": "0x...",
    "transactionId": 100,
    "transactionType": "admin_credit",
    "amount": 100,
    "balanceBefore": 1000,
    "balanceAfter": 1100,
    "reason": "Manual adjustment",
    "reference": "ticket-123"
  }
}
```

### Process On-Chain Deposits

`POST /admin/nbcWallet/onchain/process`

Access: private

This manually runs the configured ERC20 deposit poller.

Response:

```json
{
  "data": {
    "enabled": true,
    "fromBlock": 100,
    "toBlock": 200,
    "latestBlock": 212,
    "processed": 1,
    "settled": 1
  }
}
```

### Reconcile Wallet Ledger

`POST /admin/nbcWallet/reconcile`

Access: private

Request:

```json
{
  "limit": 100
}
```

Response:

```json
{
  "data": {
    "scanned": 10,
    "completed": 8,
    "unmatched": 1,
    "failed": 1
  }
}
```

## GraphQL

The extension adds:

```graphql
query {
  nbcWallet {
    walletId
    walletAddress
    balance
    frozenBalance
    availableBalance
    exchangeRate
    cnyValue
    availableCnyValue
  }

  nbcWalletTransactions(page: 1, limit: 20) {
    items {
      walletTxId
      transactionType
      amount
      balanceBefore
      balanceAfter
      status
      createdAt
    }
    total
  }
}
```

Also available on `Customer`:

```graphql
customer {
  nbcWallet { walletId balance }
  nbcWalletTransactions(page: 1, limit: 20) { total }
}
```

And on `Order`:

```graphql
order(uuid: "order-uuid") {
  nbcUsage {
    nbcAmount
    exchangeRate
    cnyAmount
  }
}
```

## Configuration

Key config values live under `nbcWallet`:

```json
{
  "status": 1,
  "displayName": "NBC Wallet",
  "auth": {
    "nonceTtlSeconds": 600,
    "messagePrefix": "Sign this message to authenticate with NBC Store."
  },
  "exchangeRate": {
    "NBC_TO_CNY": 0.01
  },
  "onchain": {
    "enabled": 0,
    "rpcUrl": "",
    "chainId": 0,
    "tokenAddress": "",
    "treasuryAddress": "",
    "startBlock": 0,
    "confirmations": 12,
    "blockBatchSize": 500,
    "pollSchedule": "*/5 * * * *"
  },
  "reconcile": {
    "enabled": 1,
    "schedule": "*/10 * * * *"
  }
}
```
