# Deployment & Testing Guide
**SME Receivables Platform - Beta Release**

## Quick Start Deployment

### Step 1: Install Dependencies
```bash
# Navigate to platform directory
cd c:\Users\91858\Downloads\SME_Platform_12_Separate_Modules\platform

# Install backend dependencies
npm install @nestjs/event-emitter --legacy-peer-deps

# Install frontend dependencies (if needed)
cd frontend
npm install
```

### Step 2: Run Database Migrations
```bash
# From platform root
npm run migration:run
```

**Expected Output:**
```
✓ CreateDiscountOfferTable1732391400000
✓ CreateInsurancePolicyTable1732391500000
✓ CreateReferralRewardTable1732391600000
✓ CreateOrchestrationTables1732392000000
✓ CreateDisputeResolutionTables1732393000000
```

### Step 3: Register Modules
Update `app.module.ts` to include new modules:

```typescript
import { OrchestrationHubModule } from './Module_10_Orchestration_Hub/code/orchestration-hub.module';
import { DisputeResolutionModule } from './Module_08_Dispute_Resolution_&_Legal_Network/code/dispute-resolution.module';
import { DynamicDiscountingModule } from './Module_07_Financing_Factoring/code/dynamic-discounting.module';
import { ReferralEngineModule } from './Module_09_Marketing_Customer_Success/code/referral-engine.module';

@Module({
  imports: [
    // ... existing modules
    OrchestrationHubModule,
    DisputeResolutionModule,
    DynamicDiscountingModule,
    ReferralEngineModule
  ]
})
export class AppModule {}
```

### Step 4: Start the Server
```bash
npm run start:dev
```

### Step 5: Bootstrap Orchestration
```bash
curl -X POST http://localhost:3000/api/v1/orchestration/modules/bootstrap
```

---

## Testing Guide

### Module 10: Orchestration Hub

**Test 1: List Registered Modules**
```bash
curl http://localhost:3000/api/v1/orchestration/modules
```

**Test 2: Create & Start Workflow**
```bash
# First, create a workflow in the database or via admin panel
# Then start it:
curl -X POST http://localhost:3000/api/v1/orchestration/workflows/{workflow-id}/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "context": {
      "invoiceId": "inv-test-001",
      "customerId": "cust-test-001"
    },
    "triggeredBy": "system@test.com"
  }'
```

**Test 3: Check Workflow Status**
```bash
curl http://localhost:3000/api/v1/orchestration/workflows/{workflow-id}/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Module 08: Dispute Resolution

**Test 1: Create Dispute Case**
```bash
curl -X POST http://localhost:3000/api/v1/disputes/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tenantId": "tenant-test-001",
    "invoiceId": "inv-test-001",
    "customerId": "cust-test-001",
    "customerName": "Test Corporation Ltd",
    "type": "non_payment",
    "disputedAmount": 100000,
    "description": "Payment not received for Invoice #INV-001",
    "priority": "high",
    "createdBy": "seller@test.com"
  }'
```

**Test 2: Search Legal Providers**
```bash
curl "http://localhost:3000/api/v1/legal-network/providers/search?specializations=debt_recovery&minRating=4&acceptsNewCases=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test 3: Get Recommended Providers**
```bash
curl "http://localhost:3000/api/v1/legal-network/providers/recommended/debt_recovery?disputedAmount=100000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test 4: File Dispute**
```bash
curl -X PATCH http://localhost:3000/api/v1/disputes/cases/{case-id}/file \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "filedBy": "seller@test.com"
  }'
```

---

### Module 07: Dynamic Discounting

**Test: Create Discount Offer**
```bash
curl -X POST http://localhost:3000/api/v1/discounts/offers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "invoiceId": "inv-test-001",
    "apr": 12,
    "expiryDays": 7
  }'
```

---

### Module 06: Insurance

**Test 1: Get Insurance Quote**
```bash
curl http://localhost:3000/api/v1/insurance/quotes/inv-test-001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test 2: Purchase Policy**
```bash
curl -X POST http://localhost:3000/api/v1/insurance/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "invoiceId": "inv-test-001",
    "providerId": "provider-001"
  }'
```

---

### Module 09: Referrals

**Test: Generate Referral Link**
```bash
curl http://localhost:3000/api/v1/referrals/link/user-test-001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Module 03: Virtual Accounts

**Test: Create Virtual Account**
```bash
curl -X POST http://localhost:3000/api/v1/virtual-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": "cust-test-001",
    "customerMobile": "+919876543210"
  }'
```

---

## Frontend Testing

### Test UI Components

Navigate to the frontend application and test each component:

1. **Discount Offer Form**
   - URL: `/invoices/{id}/discount`
   - Test: Change APR slider, verify calculations
   - Expected: Live discount calculation updates

2. **Insurance Quote Calculator**
   - URL: `/invoices/{id}/insurance`
   - Test: Load quotes, compare providers
   - Expected: 3 provider quotes displayed

3. **Referral Widget**
   - URL: `/dashboard/referrals`
   - Test: Copy link, share via WhatsApp
   - Expected: Link copied, WhatsApp opens

4. **Virtual Account Card**
   - URL: `/customers/{id}/payment`
   - Test: Copy VAN, generate QR
   - Expected: VAN copied, QR code displays

---

## Health Checks

### Database Connection
```bash
# Check if migrations ran successfully
npm run migration:show
```

### API Health
```bash
curl http://localhost:3000/health
```

### Module Status
```bash
curl http://localhost:3000/api/v1/orchestration/modules
```

---

## Common Issues & Solutions

### Issue 1: Migration Fails
**Error:** `relation already exists`  
**Solution:**
```bash
npm run migration:revert
npm run migration:run
```

### Issue 2: Module Not Found
**Error:** `Cannot find module '@nestjs/event-emitter'`  
**Solution:**
```bash
npm install @nestjs/event-emitter --legacy-peer-deps
```

### Issue 3: Port Already in Use
**Error:** `EADDRINUSE :::3000`  
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart
npm run start:dev
```

---

## Performance Testing

### Load Test Workflow Execution
```bash
# Using Apache Bench
ab -n 100 -c 10 -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/orchestration/workflows/{id}/status
```

### Test Event Bus Throughput
```bash
# Publish 1000 events
for i in {1..1000}; do
  curl -X POST http://localhost:3000/api/v1/test/event \
    -d '{"type":"test.event","data":{}}' &
done
```

---

## Production Deployment Checklist

- [ ] All migrations run successfully
- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] SSL certificates installed
- [ ] Logging configured
- [ ] Monitoring setup (APM)
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Authentication working
- [ ] Error tracking (Sentry)

---

## Monitoring

### Key Metrics to Track
1. **API Response Times**
   - Target: < 200ms (p95)
   - Endpoint: All REST APIs

2. **Workflow Execution Time**
   - Target: < 5s per workflow
   - Endpoint: Orchestration

3. **Database Query Performance**
   - Target: < 100ms per query
   - Monitor: Slow query log

4. **Error Rate**
   - Target: < 1%
   - Monitor: Application logs

---

## Support & Troubleshooting

### View Logs
```bash
# Development
npm run start:dev

# Production
pm2 logs sme-platform
```

### Debug Mode
```bash
# Set environment variable
export DEBUG=sme:*

# Start with debugging
npm run start:debug
```

### Database Queries
```sql
-- Check recent disputes
SELECT * FROM dispute_cases ORDER BY created_at DESC LIMIT 10;

-- Check workflows
SELECT * FROM workflows WHERE status = 'running';

-- Check module registrations
SELECT * FROM module_registrations WHERE status = 'active';
```

---

## Next Steps After Deployment

1. **Week 1:** Monitor stability, fix critical bugs
2. **Week 2:** Gather user feedback, iterate on UX
3. **Week 3:** Performance optimization
4. **Week 4:** Feature enhancements based on usage

**Platform is ready for beta testing!** 🚀
