# Module 03: Payment Integration - Complete API Documentation

## Overview

Module 03 provides comprehensive payment processing capabilities with support for 6 payment gateways, UPI payments, payment links, and seamless accounting integration.

**Base URL:** `https://api.yourplatform.com/v1`  
**Authentication:** Bearer token required for all endpoints

---

## Table of Contents

1. [Payment Processing](#payment-processing)
2. [UPI Payments](#upi-payments)
3. [Payment Links](#payment-links)
4. [Gateway Management](#gateway-management)
5. [Refunds](#refunds)
6. [Webhooks](#webhooks)
7. [Error Codes](#errorj-codes)

---

## Payment Processing

### Create Payment

```http
POST /payments
```

**Request:**
```json
{
  "amount": 10000,
  "currency": "INR",
  "gateway": "razorpay",
  "paymentMethod": "upi",
  "customerId": "cus_123",
  "invoiceId": "inv_456",
  "description": "Invoice payment",
  "metadata": {
    "order_id": "ORD-789"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "pay_abc123",
  "status": "pending",
  "amount": 10000,
  "currency": "INR",
  "gateway": "razorpay",
  "gatewayTransactionId": "rzp_xyz789",
  "paymentUrl": "https://razorpay.com/pay/xyz789",
  "expiresAt": "2024-01-15T15:30:00Z",
  "createdAt": "2024-01-15T15:00:00Z"
}
```

### Get Payment Status

```http
GET /payments/:id
```

**Response (200 OK):**
```json
{
  "id": "pay_abc123",
  "status": "completed",
  "amount": 10000,
  "currency": "INR",
  "gateway": "razorpay",
  "gatewayTransactionId": "rzp_xyz789",
  "completedAt": "2024-01-15T15:05:00Z",
  "metadata": {}
}
```

**Payment Statuses:**
- `pending` - Payment initiated
- `processing` - Gateway processing
- `completed` - Payment successful
- `failed` - Payment failed
- `expired` - Payment link expired

---

## UPI Payments

### Generate UPI QR Code

```http
POST /upi/generate-qr
```

**Request:**
```json
{
  "provider": "phonepe",
  "amount": 5000,
  "invoiceId": "inv_123",
  "vpa": "merchant@paytm",
  "name": "Merchant Name"
}
```

**Response (200 OK):**
```json
{
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0KG...",
  "upiLink": "upi://pay?pa=merchant@paytm&pn=Merchant%20Name&am=5000&cu=INR",
  "transactionId": "TXN-abc123",
  "expiresAt": "2024-01-15T15:35:00Z"
}
```

### Validate VPA

```http
GET /upi/validate-vpa?vpa=user@paytm
```

**Response (200 OK):**
```json
{
  "valid": true,
  "vpa": "user@paytm",
  "provider": "paytm",
  "name": "User Name"
}
```

### Check UPI Transaction Status

```http
GET /upi/status/:transactionId
```

**Response (200 OK):**
```json
{
  "transactionId": "TXN-abc123",
  "status": "completed",
  "amount": 5000,
  "provider": "phonepe",
  "utr": "202401151234567890",
  "completedAt": "2024-01-15T15:10:00Z"
}
```

---

## Payment Links

### Create Payment Link

```http
POST /payment-links
```

**Request:**
```json
{
  "amount": 15000,
  "currency": "INR",
  "description": "Invoice #INV-001",
  "customerEmail": "customer@example.com",
  "customerPhone": "+919876543210",
  "expiresAt": "2024-01-16T23:59:59Z",
  "maxUses": 1,
  "notifyCustomer": true
}
```

**Response (201 Created):**
```json
{
  "id": "link_abc123",
  "shortCode": "ABC12345",
  "url": "https://pay.platform.com/pay/ABC12345",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "amount": 15000,
  "status": "active",
  "expiresAt": "2024-01-16T23:59:59Z",
  "createdAt": "2024-01-15T15:00:00Z"
}
```

### Get Payment Link

```http
GET /payment-links/:shortCode
```

**Response (200 OK):**
```json
{
  "id": "link_abc123",
  "shortCode": "ABC12345",
  "amount": 15000,
  "status": "active",
  "useCount": 0,
  "maxUses": 1,
  "description": "Invoice #INV-001",
  "expiresAt": "2024-01-16T23:59:59Z"
}
```

### Process Payment via Link

```http
POST /payment-links/:shortCode/pay
```

**Request:**
```json
{
  "paymentMethod": "upi",
  "gateway": "razorpay",
  "paymentDetails": {
    "vpa": "customer@paytm"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "paymentId": "pay_xyz789",
  "transactionId": "TXN-123",
  "paymentUrl": "https://razorpay.com/pay/xyz789"
}
```

---

## Gateway Management

### List Available Gateways

```http
GET /gateways
```

**Response (200 OK):**
```json
{
  "gateways": [
    {
      "id": "razorpay",
      "name": "Razorpay",
      "type": "domestic",
      "status": "active",
      "supportedMethods": ["upi", "card", "netbanking", "wallet"],
      "supportedCurrencies": ["INR"],
      "fees": {
        "percentage": 2.0,
        "fixed": 0
      }
    },
    {
      "id": "stripe",
      "name": "Stripe",
      "type": "international",
      "status": "active",
      "supportedMethods": ["card"],
      "supportedCurrencies": ["USD", "EUR", "GBP", "INR"],
      "fees": {
        "percentage": 2.9,
        "fixed": 0.30
      }
    }
  ]
}
```

### Test Gateway Connection

```http
POST /gateways/:gatewayId/test
```

**Response (200 OK):**
```json
{
  "success": true,
  "gateway": "razorpay",
  "latencyMs": 250,
  "timestamp": "2024-01-15T15:00:00Z"
}
```

---

## Refunds

### Create Refund

```http
POST /refunds
```

**Request:**
```json
{
  "paymentId": "pay_abc123",
  "amount": 5000,
  "reason": "requested_by_customer",
  "notes": "Customer requested refund"
}
```

**Response (201 Created):**
```json
{
  "id": "ref_xyz789",
  "paymentId": "pay_abc123",
  "amount": 5000,
   "status": "processing",
  "reason": "requested_by_customer",
  "createdAt": "2024-01-15T15:00:00Z"
}
```

### Get Refund Status

```http
GET /refunds/:id
```

**Response (200 OK):**
```json
{
  "id": "ref_xyz789",
  "paymentId": "pay_abc123",
  "amount": 5000,
  "status": "completed",
  "processedAt": "2024-01-15T15:10:00Z",
  "gatewayRefundId": "rfnd_gateway123"
}
```

---

## Webhooks

### Webhook Events

All webhooks are sent via POST with JSON payload and signature verification.

**Webhook URL Format:**
```
https://yourapp.com/webhooks/payment/:gateway
```

#### Payment Success

```json
{
  "event": "payment.success",
  "timestamp": "2024-01-15T15:00:00Z",
  "data": {
    "paymentId": "pay_abc123",
    "gatewayTransactionId": "rzp_xyz789",
    "amount": 10000,
    "currency": "INR",
    "status": "completed"
  }
}
```

#### Payment Failed

```json
{
  "event": "payment.failed",
  "timestamp": "2024-01-15T15:00:00Z",
  "data": {
    "paymentId": "pay_abc123",
    "gatewayTransactionId": "rzp_xyz789",
    "status": "failed",
    "errorCode": "insufficient_funds",
    "errorMessage": "Insufficient funds"
  }
}
```

#### Refund Completed

```json
{
  "event": "refund.completed",
  "timestamp": "2024-01-15T15:00:00Z",
  "data": {
    "refundId": "ref_xyz789",
    "paymentId": "pay_abc123",
    "amount": 5000,
    "status": "completed"
  }
}
```

### Webhook Signature Verification

**Header:** `X-Webhook-Signature`

**Verification:**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  return signature === expectedSignature;
}
```

---

## Error Codes

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable

### Payment Error Codes

| Code | Description |
|------|-------------|
| `INVALID_AMOUNT` | Amount is invalid or out of range |
| `INVALID_CURRENCY` | Currency not supported |
| `GATEWAY_UNAVAILABLE` | Payment gateway is unavailable |
| `PAYMENT_EXPIRED` | Payment link has expired |
| `PAYMENT_ALREADY_USED` | Payment link already used |
| `INSUFFICIENT_FUNDS` | Insufficient funds in customer account |
| `AUTHENTICATION_FAILED` | 3D Secure or OTP failed |
| `TRANSACTION_DECLINED` | Transaction declined by bank |
| `INVALID_CARD` | Invalid card details |
| `EXPIRED_CARD` | Card has expired |
| `INVALID_VPA` | Invalid UPI VPA format |
| `VPA_NOT_FOUND` | UPI VPA does not exist |
| `REFUND_FAILED` | Refund processing failed |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be between 100 and 1000000",
    "field": "amount",
    "details": {}
  }
}
```

---

## Rate Limits

**Default Limits:**
- 100 requests per minute per API key
- 1000 requests per hour per API key

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1610737260
```

---

## Best Practices

### Payment Flow

1. **Create Payment** → Get payment URL
2. **Redirect Customer** → Payment gateway page
3. **Handle Webhook** → Update transaction status
4. **Verify Payment** → Check status via API
5. **Update Accounting** → Sync to accounting system (via M11)

### UPI Flow

1. **Generate QR Code** → Display to customer
2. **Customer Scans** → Opens UPI app
3. **Poll Status** → Check every 3-5 seconds
4. **Handle Timeout** → Expire after 5 minutes
5. **Confirm Payment** → Update transaction

### Error Handling

- Always verify webhook signatures
- Implement retry logic with exponential backoff
- Handle idempotency for payment creation
- Log all payment events for audit trail

---

## SDKs & Libraries

### JavaScript/Node.js

```bash
npm install @sme-platform/payment-sdk
```

```javascript
const { PaymentClient } = require('@sme-platform/payment-sdk');

const client = new PaymentClient({
  apiKey: 'your_api_key',
  environment: 'production'
});

const payment = await client.payments.create({
  amount: 10000,
  currency: 'INR',
  gateway: 'razorpay'
});
```

### Python

```bash
pip install sme-platform-payments
```

```python
from sme_platform import PaymentClient

client = PaymentClient(api_key='your_api_key')

payment = client.payments.create(
    amount=10000,
    currency='INR',
    gateway='razorpay'
)
```

---

## Support

**API Support:** api-support@platform.com  
**Documentation:** https://docs.platform.com/payments  
**Status Page:** https://status.platform.com
