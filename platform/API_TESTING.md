# 🧪 API Testing Guide
**Complete Testing Scenarios for All New Endpoints**

## Testing Tools Setup

### Option 1: curl (Command Line)
Already installed on most systems.

### Option 2: Postman
Download from: https://www.postman.com/downloads/

### Option 3: VS Code REST Client
Install extension: `humao.rest-client`

---

## Authentication

All endpoints require JWT authentication. First, get a token:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

**Save the token:**
```bash
export TOKEN="your_jwt_token_here"
```

---

## Module 10: Orchestration Hub

### 1. Bootstrap Modules
```bash
curl -X POST http://localhost:3000/api/v1/orchestration/modules/bootstrap \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Default modules bootstrapped"
}
```

### 2. List All Modules
```bash
curl http://localhost:3000/api/v1/orchestration/modules \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Module Details
```bash
curl http://localhost:3000/api/v1/orchestration/modules/module_01_invoice_generation \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Register Custom Module
```bash
curl -X POST http://localhost:3000/api/v1/orchestration/modules/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "moduleName": "custom_module_test",
    "displayName": "Test Module",
    "baseUrl": "http://localhost:4000",
    "capabilities": {
      "actions": [
        {
          "name": "test_action",
          "endpoint": "/api/v1/test",
          "method": "POST",
          "description": "Test action"
        }
      ],
      "events": [
        {
          "name": "test.event",
          "description": "Test event"
        }
      ]
    }
  }'
```

### 5. Create & Start Workflow
**First, create a workflow in database, then:**
```bash
curl -X POST http://localhost:3000/api/v1/orchestration/workflows/WORKFLOW_ID/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "context": {
      "invoiceId": "inv-test-001",
      "customerId": "cust-001"
    },
    "triggeredBy": "test@example.com"
  }'
```

### 6. Check Workflow Status
```bash
curl http://localhost:3000/api/v1/orchestration/workflows/WORKFLOW_ID/status \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Pause Workflow
```bash
curl -X PATCH http://localhost:3000/api/v1/orchestration/workflows/WORKFLOW_ID/pause \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Resume Workflow
```bash
curl -X PATCH http://localhost:3000/api/v1/orchestration/workflows/WORKFLOW_ID/resume \
  -H "Authorization: Bearer $TOKEN"
```

---

## Module 08: Dispute Resolution

### Dispute Management

#### 1. Create Dispute Case
```bash
curl -X POST http://localhost:3000/api/v1/disputes/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "tenant-001",
    "invoiceId": "inv-001",
    "customerId": "cust-001",
    "customerName": "Acme Corporation",
    "type": "non_payment",
    "disputedAmount": 150000,
    "description": "Invoice #INV-001 payment overdue by 45 days. Multiple follow-ups sent without response.",
    "priority": "high",
    "createdBy": "seller@example.com"
  }'
```

**Save the case ID from response**

#### 2. Get Dispute Case
```bash
curl http://localhost:3000/api/v1/disputes/cases/CASE_ID \
  -H "Authorization: Bearer $TOKEN"
```

#### 3. File Dispute
```bash
curl -X PATCH http://localhost:3000/api/v1/disputes/cases/CASE_ID/file \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "filedBy": "seller@example.com"
  }'
```

#### 4. Add Evidence
```bash
curl -X POST http://localhost:3000/api/v1/disputes/cases/CASE_ID/evidence \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "documents",
    "data": {
      "id": "doc-001",
      "name": "Invoice_Copy.pdf",
      "url": "https://storage.example.com/invoices/inv-001.pdf",
      "type": "invoice",
      "uploadedAt": "2025-11-24T00:00:00Z"
    },
    "addedBy": "seller@example.com"
  }'
```

#### 5. Update Status
```bash
curl -X PATCH http://localhost:3000/api/v1/disputes/cases/CASE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "mediation",
    "updatedBy": "mediator@example.com",
    "notes": "Case moved to mediation stage. First hearing scheduled."
  }'
```

#### 6. Assign Legal Provider
```bash
curl -X PATCH http://localhost:3000/api/v1/disputes/cases/CASE_ID/assign-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "providerId": "provider-001",
    "assignedBy": "admin@example.com"
  }'
```

#### 7. Record Resolution
```bash
curl -X POST http://localhost:3000/api/v1/disputes/cases/CASE_ID/resolution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "settlement",
    "amount": 120000,
    "terms": "Customer agreed to pay 80% of disputed amount within 30 days",
    "resolvedBy": "mediator@example.com"
  }'
```

#### 8. List Disputes by Tenant
```bash
curl "http://localhost:3000/api/v1/disputes/cases?tenantId=tenant-001" \
  -H "Authorization: Bearer $TOKEN"
```

#### 9. List Disputes by Status
```bash
curl "http://localhost:3000/api/v1/disputes/cases?tenantId=tenant-001&status=filed" \
  -H "Authorization: Bearer $TOKEN"
```

#### 10. Get Disputes for Invoice
```bash
curl http://localhost:3000/api/v1/disputes/invoice/inv-001 \
  -H "Authorization: Bearer $TOKEN"
```

#### 11. Get Dispute Statistics
```bash
curl http://localhost:3000/api/v1/disputes/stats/tenant-001 \
  -H "Authorization: Bearer $TOKEN"
```

### Legal Network

#### 12. Register Legal Provider
```bash
curl -X POST http://localhost:3000/api/v1/legal-network/providers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "firmName": "Legal Associates LLP",
    "providerType": "law_firm",
    "specializations": ["debt_recovery", "commercial_law"],
    "barCouncilNumber": "BAR/2020/12345",
    "yearsOfExperience": 15,
    "contactInfo": {
      "email": "info@legalassociates.com",
      "phone": "+91-9876543210",
      "address": {
        "street": "123 Legal Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      }
    },
    "pricing": {
      "consultationFee": 5000,
      "hourlyRate": 8000,
      "legalNoticeFee": 15000,
      "courtRepresentationFee": 50000,
      "successFeePercentage": 10
    }
  }'
```

#### 13. Search Providers
```bash
curl "http://localhost:3000/api/v1/legal-network/providers/search?specializations=debt_recovery&minRating=4&acceptsNewCases=true" \
  -H "Authorization: Bearer $TOKEN"
```

#### 14. Get Provider Details
```bash
curl http://localhost:3000/api/v1/legal-network/providers/PROVIDER_ID \
  -H "Authorization: Bearer $TOKEN"
```

#### 15. Get Recommended Providers
```bash
curl "http://localhost:3000/api/v1/legal-network/providers/recommended/debt_recovery?disputedAmount=150000" \
  -H "Authorization: Bearer $TOKEN"
```

#### 16. List All Active Providers
```bash
curl http://localhost:3000/api/v1/legal-network/providers \
  -H "Authorization: Bearer $TOKEN"
```

#### 17. Update Provider Status
```bash
curl -X PATCH http://localhost:3000/api/v1/legal-network/providers/PROVIDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "active"
  }'
```

#### 18. Toggle Provider Availability
```bash
curl -X PATCH http://localhost:3000/api/v1/legal-network/providers/PROVIDER_ID/availability \
  -H "Authorization: Bearer $TOKEN"
```

#### 19. Update Provider Rating
```bash
curl -X POST http://localhost:3000/api/v1/legal-network/providers/PROVIDER_ID/rating \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "rating": 4.5,
    "caseResolved": true,
    "resolutionDays": 45
  }'
```

---

## Module 07: Dynamic Discounting

#### 1. Create Discount Offer
```bash
curl -X POST http://localhost:3000/api/v1/discounts/offers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "invoiceId": "inv-001",
    "apr": 12,
    "expiryDays": 7
  }'
```

#### 2. Accept Discount Offer
```bash
curl -X PATCH http://localhost:3000/api/v1/discounts/offers/OFFER_ID/accept \
  -H "Authorization: Bearer $TOKEN"
```

---

## Module 06: Insurance

#### 1. Get Insurance Quotes
```bash
curl http://localhost:3000/api/v1/insurance/quotes/inv-001 \
  -H "Authorization: Bearer $TOKEN"
```

#### 2. Purchase Insurance Policy
```bash
curl -X POST http://localhost:3000/api/v1/insurance/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "invoiceId": "inv-001",
    "providerId": "provider-icici"
  }'
```

#### 3. File Insurance Claim
```bash
curl -X POST http://localhost:3000/api/v1/insurance/claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "policyId": "policy-001",
    "claimAmount": 90000,
    "reason": "Customer default"
  }'
```

---

## Module 09: Referrals

#### 1. Generate Referral Link
```bash
curl http://localhost:3000/api/v1/referrals/link/user-001 \
  -H "Authorization: Bearer $TOKEN"
```

#### 2. Record Referral Conversion
```bash
curl -X POST http://localhost:3000/api/v1/referrals/conversions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "referrerId": "user-001",
    "referredUserId": "user-002"
  }'
```

---

## Module 03: Virtual Accounts

#### 1. Create Virtual Account
```bash
curl -X POST http://localhost:3000/api/v1/virtual-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customerId": "cust-001",
    "customerMobile": "+919876543210"
  }'
```

#### 2. Get VAN Details
```bash
curl http://localhost:3000/api/v1/virtual-accounts/VAN123456 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complete Test Scenario

### Scenario: Full Dispute Resolution Flow

```bash
# 1. Create dispute
CASE_ID=$(curl -s -X POST http://localhost:3000/api/v1/disputes/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tenantId":"t1","invoiceId":"inv-1","customerId":"c1","customerName":"Test","type":"non_payment","disputedAmount":100000,"description":"Test","createdBy":"admin"}' \
  | jq -r '.data.id')

# 2. File the dispute
curl -X PATCH http://localhost:3000/api/v1/disputes/cases/$CASE_ID/file \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"filedBy":"admin"}'

# 3. Search for lawyers
curl "http://localhost:3000/api/v1/legal-network/providers/search?specializations=debt_recovery" \
  -H "Authorization: Bearer $TOKEN"

# 4. Assign lawyer
curl -X PATCH http://localhost:3000/api/v1/disputes/cases/$CASE_ID/assign-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"providerId":"provider-001","assignedBy":"admin"}'

# 5. Record resolution
curl -X POST http://localhost:3000/api/v1/disputes/cases/$CASE_ID/resolution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"settlement","amount":80000,"terms":"80% payment agreed","resolvedBy":"admin"}'
```

---

## Expected Results Summary

| Endpoint | Expected Status | Response Time |
|----------|----------------|---------------|
| POST /disputes/cases | 201 Created | < 200ms |
| GET /disputes/cases/:id | 200 OK | < 100ms |
| GET /legal-network/providers | 200 OK | < 300ms |
| POST /orchestration/modules/bootstrap | 200 OK | < 500ms |
| POST /virtual-accounts | 201 Created | < 200ms |

---

## Troubleshooting

### 401 Unauthorized
- Check if token is valid
- Ensure Authorization header is set

### 404 Not Found
- Verify endpoint URL
- Check if resource exists

### 500 Internal Server Error
- Check server logs: `npm run start:dev`
- Verify database is running

---

**All tests passed? Your platform is fully operational!** 🎉
