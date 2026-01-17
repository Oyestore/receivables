# 🚀 Quick Start Guide
**Get the SME Platform Running in 5 Minutes**

## Prerequisites Check
- ✅ Node.js 18+ installed
- ✅ PostgreSQL 15+ running
- ✅ npm installed

---

## Step 1: Install Dependencies (1 min)
```bash
cd c:\Users\91858\Downloads\SME_Platform_12_Separate_Modules\platform
npm install
npm install @nestjs/event-emitter --legacy-peer-deps
```

---

## Step 2: Configure Database (1 min)
Update `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=sme_platform
```

---

## Step 3: Run Migrations (1 min)
```bash
npm run migration:run
```

**Expected Output:**
```
✓ 5 migrations executed successfully
```

**Migrations Applied:**
1. DiscountOfferTable (Module 07)
2. InsurancePolicyTable (Module 06)
3. ReferralRewardTable (Module 09)
4. OrchestrationTables (Module 10)
5. DisputeResolutionTables (Module 08)

---

## Step 4: Start the Server (1 min)
```bash
npm run start:dev
```

**Wait for:**
```
[Nest] Application successfully started
[Nest] Listening on http://localhost:3000
```

---

## Step 5: Bootstrap & Test (1 min)

### Bootstrap Orchestration Hub
```bash
curl -X POST http://localhost:3000/api/v1/orchestration/modules/bootstrap
```

### Test API Health
```bash
curl http://localhost:3000/health
```

### Test Module Registry
```bash
curl http://localhost:3000/api/v1/orchestration/modules
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "name": "module_01_invoice_generation",
        "displayName": "Smart Invoice Generation",
        "status": "active"
      },
      // ... more modules
    ],
    "totalCount": 3
  }
}
```

---

## 🎉 Success!
Your platform is now running! Access it at:
- **API:** http://localhost:3000
- **Swagger Docs:** http://localhost:3000/api (if configured)

---

## Quick Test Commands

### Test Dispute Resolution
```bash
curl -X POST http://localhost:3000/api/v1/disputes/cases \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "invoiceId": "inv-001",
    "customerId": "cust-001",
    "customerName": "Test Corp",
    "type": "non_payment",
    "disputedAmount": 100000,
    "description": "Payment overdue",
    "createdBy": "admin@test.com"
  }'
```

### Test Legal Provider Search
```bash
curl "http://localhost:3000/api/v1/legal-network/providers/search?specializations=debt_recovery"
```

### Test Discount Offers
```bash
curl -X POST http://localhost:3000/api/v1/discounts/offers \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "inv-001",
    "apr": 12,
    "expiryDays": 7
  }'
```

---

## Troubleshooting

### Migration Fails
```bash
# Check migration status
npm run migration:show

# Revert last migration
npm run migration:revert

# Try again
npm run migration:run
```

### Port Already in Use
```bash
# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Module Not Found Error
```bash
npm install
npm run build
```

---

## Next Steps

1. **Explore APIs** - Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for all endpoints
2. **View Status** - See [platform_status_report.md](./platform_status_report.md)
3. **Read Walkthrough** - Check implementation details in walkthrough.md
4. **Add Test Data** - Use the test commands above

---

## What You Have Now

✅ **Module 10 Orchestration Hub** - Workflow automation  
✅ **Module 08 Dispute Resolution** - Legal case management  
✅ **Module 07 Dynamic Discounting** - Early payment incentives  
✅ **Module 06 Insurance** - Trade credit insurance  
✅ **Module 09 Referrals** - Viral growth engine  
✅ **Module 03 Virtual Accounts** - Smart collections  

**Platform Completion: 75%**

Happy coding! 🚀
