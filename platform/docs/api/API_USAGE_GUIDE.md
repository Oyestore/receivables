# API Usage Guide

## 🎯 Overview

This guide provides developers with everything needed to integrate with the SME Receivable Platform API.

**Base URL**: `https://api.smeplatform.com` (Production)  
**Base URL**: `http://localhost:4000` (Development)

**API Version**: v1  
**Protocol**: REST  
**Data Format**: JSON

---

## 🔐 Authentication

### Getting Started

All API requests require authentication using JWT tokens.

### 1. Login to Get Token

```bash
curl -X POST https://api.smeplatform.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### 2. Use Token in Requests

Include the access token in the `Authorization` header:

```bash
curl -X GET https://api.smeplatform.com/api/invoices \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Refresh Expired Token

When access token expires (24 hours):

```bash
curl -X POST https://api.smeplatform.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbG ciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## 📊 Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Global | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes | 
| Public API | 1000 requests | 1 hour |

### Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702540800
```

### Handling Rate Limits

When rate limited (HTTP 429):

```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 900
}
```

**Solution**: Wait for `retryAfter` seconds before retrying.

---

## 📝 Common Endpoints

### Invoices

**List Invoices**:
```bash
GET /api/tenant/:tenantId/invoices
Authorization: Bearer {token}

# Query parameters:
# ?status=pending
# ?fromDate=2024-01-01
# ?toDate=2024-12-31
# ?page=1
# &limit=20
```

**Create Invoice**:
```bash
POST /api/tenant/:tenantId/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerId": "cust-123",
  "issueDate": "2024-12-14",
  "dueDate": "2025-01-14",
  "items": [
    {
      "description": "Web Development",
      "quantity": 10,
      "unitPrice": 100.00,
      "taxRate": 0.18
    }
  ],
  "notes": "Payment terms: Net 30"
}
```

**Get Invoice**:
```bash
GET /api/tenant/:tenantId/invoices/:invoiceId
Authorization: Bearer {token}
```

**Update Invoice**:
```bash
PATCH /api/tenant/:tenantId/invoices/:invoiceId
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "paid",
  "paidDate": "2024-12-15",
  "paidAmount": 1180.00
}
```

### Payments

**List Payments**:
```bash
GET /api/tenant/:tenantId/payments
Authorization: Bearer {token}
```

**Process Payment**:
```bash
POST /api/tenant/:tenantId/payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoiceId": "inv-123",
  "amount": 1180.00,
  "paymentMethod": "rzp_card",
  "paymentMethodDetails": {
    "cardId": "card_xyz"
  }
}
```

### Analytics

**Get Dashboard Data**:
```bash
GET /api/analytics/dashboard
Authorization: Bearer {token}

# Query parameters:
# ?metric=revenue
# ?period=monthly
# ?fromDate=2024-01-01
# &toDate=2024-12-31
```

---

## 🔄 Pagination

All list endpoints support pagination:

**Request**:
```bash
GET /api/invoices?page=1&limit=20
```

**Response**:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "links": {
    "first": "/api/invoices?page=1&limit=20",
    "prev": null,
    "next": "/api/invoices?page=2&limit=20",
    "last": "/api/invoices?page=8&limit=20"
  }
}
```

---

## 🔍 Filtering & Sorting

### Filtering

```bash
# Single filter
GET /api/invoices?status=pending

# Multiple filters
GET /api/invoices?status=pending&customerId=cust-123

# Date range
GET /api/invoices?fromDate=2024-01-01&toDate=2024-12-31

# Search
GET /api/invoices?search=invoice number
```

### Sorting

```bash
# Ascending
GET /api/invoices?sortBy=createdAt&order=asc

# Descending
GET /api/invoices?sortBy=amount&order=desc
```

---

## ❗ Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be valid"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Fix request data |
| 401 | Unauthorized | Login required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Wait before retry |
| 500 | Internal Server Error | Report to support |

---

## 💻 Code Examples

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.smeplatform.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login
const login = async (email, password) => {
  const response = await api.post('/api/auth/login', {
    email,
    password
  });
  
  const { accessToken } = response.data;
  
  // Store token
  localStorage.setItem('authToken', accessToken);
  
  // Set for future requests
  api.defaults.headers.Authorization = `Bearer ${accessToken}`;
  
  return response.data;
};

// Create invoice
const createInvoice = async (tenantId, invoiceData) => {
  const response = await api.post(
    `/api/tenant/${tenantId}/invoices`,
    invoiceData
  );
  
  return response.data;
};

// Get invoices
const getInvoices = async (tenantId, filters = {}) => {
  const response = await api.get(
    `/api/tenant/${tenantId}/invoices`,
    { params: filters }
  );
  
  return response.data;
};
```

### Python (Requests)

```python
import requests

class SMEPlatformAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.access_token = None
    
    def login(self, email, password):
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data['accessToken']
        
        return data
    
    def _headers(self):
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def create_invoice(self, tenant_id, invoice_data):
        response = requests.post(
            f"{self.base_url}/api/tenant/{tenant_id}/invoices",
            json=invoice_data,
            headers=self._headers()
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_invoices(self, tenant_id, filters=None):
        response = requests.get(
            f"{self.base_url}/api/tenant/{tenant_id}/invoices",
            params=filters or {},
            headers=self._headers()
        )
        response.raise_for_status()
        
        return response.json()

# Usage
api = SMEPlatformAPI('https://api.smeplatform.com')
api.login('user@example.com', 'password')

invoices = api.get_invoices('tenant-123', {'status': 'pending'})
```

### cURL Examples

**Create Invoice**:
```bash
curl -X POST 'https://api.smeplatform.com/api/tenant/tenant-123/invoices' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "cust-123",
    "issueDate": "2024-12-14",
    "dueDate": "2025-01-14",
    "items": [
      {
        "description": "Consulting Services",
        "quantity": 10,
        "unitPrice": 100.00
      }
    ]
  }'
```

**Get Invoices with Filters**:
```bash
curl -X GET 'https://api.smeplatform.com/api/tenant/tenant-123/invoices?status=pending&page=1&limit=20' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 🔔 Webhooks

See [WEBHOOKS.md](./WEBHOOKS.md) for detailed webhook documentation.

---

## 📚 Interactive API Documentation

Visit the Swagger UI for interactive API testing:

- **Production**: https://api.smeplatform.com/api/docs
- **Development**: http://localhost:4000/api/docs

Features:
- Try endpoints directly in browser
- See request/response schemas
- Test authentication
- Download OpenAPI spec

---

## 🆘 Support

**API Issues?**
- Email: api-support@smeplatform.com
- Documentation: https://docs.smeplatform.com
- Status Page: https://status.smeplatform.com

---

*API Usage Guide v1.0*  
*Last Updated: December 14, 2025*
