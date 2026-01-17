# Option 1 Staging Deployment Guide
## Deploy & Test All 3 Features

**Environment:** Staging (Local or Cloud)  
**Date:** November 20, 2025  
**Estimated Time:** 30-45 minutes

---

## Quick Start (TL;DR)

```powershell
# 1. Set environment variables
cd c:\Users\91858\Downloads\SME_Platform_12_Separate_Modules
.\deploy\setup-env.ps1

# 2. Start all services
.\deploy\start-staging.ps1

# 3. Run tests
.\deploy\test-features.ps1
```

---

## Pre-Deployment Checklist

### Required Software
- [x] Docker Desktop (running)
- [x] Node.js 18+ 
- [x] Python 3.10+
- [x] PostgreSQL 14+ (or use Docker)

### Verify Installation
```powershell
docker --version          # Should show 28.x or higher
node --version            # Should show v18.x or higher
python --version          # Should show 3.10.x or higher
npm --version             # Should show 8.x or higher
```

---

## Step 1: Environment Configuration

### Create `.env` File

Create `platform/.env`:

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=sme_platform_staging
DATABASE_USER=sme_user
DATABASE_PASSWORD=staging_password_2025

# Services
NODE_ENV=staging
PORT=3000

# Module URLs
MODULE_6_CREDIT_SCORING_URL=http://localhost:3006
MODULE_10_ORCHESTRATION_URL=http://localhost:3010

# Feature 1.1: Cash Flow
CASH_FLOW_ML_SERVICE_URL=http://localhost:8000

# Feature 1.2: Collections Autopilot
DEEPSEEK_R1_SERVICE_URL=http://localhost:8001
NOTIFICATION_SERVICE_URL=http://localhost:3011

# Feature 1.3: Invoice Financing
LENDINGKART_API_URL=https://sandbox.lendingkart.com/v1
LENDINGKART_API_KEY=demo_key
FLEXILOANS_API_URL=https://sandbox.flexiloans.com/partner
FLEXILOANS_API_KEY=demo_key
INDIFI_API_URL=https://sandbox.indifi.com/api
INDIFI_API_KEY=demo_key

# Security
JWT_SECRET=staging_jwt_secret_change_in_production
JWT_EXPIRATION=24h
```

Create `ml-services/cash-flow-forecasting/.env`:

```bash
MODEL_PATH=/models
BATCH_SIZE=50
LOG_LEVEL=INFO
```

---

## Step 2: Database Setup

### Option A: Docker PostgreSQL (Recommended for Staging)

```powershell
# Start PostgreSQL container
docker run -d `
  --name sme-postgres-staging `
  -e POSTGRES_DB=sme_platform_staging `
  -e POSTGRES_USER=sme_user `
  -e POSTGRES_PASSWORD=staging_password_2025 `
  -p 5432:5432 `
  postgres:14

# Verify
docker ps | findstr sme-postgres
```

### Option B: Existing PostgreSQL

```sql
CREATE DATABASE sme_platform_staging;
CREATE USER sme_user WITH PASSWORD 'staging_password_2025';
GRANT ALL PRIVILEGES ON DATABASE sme_platform_staging TO sme_user;
```

---

## Step 3: Run Database Migrations

```powershell
# Navigate to each module and run migrations

# Feature 1.1: Cash Flow (Module 4)
cd platform\Module_04_Analytics_Reporting
npm install
npm run typeorm migration:run

# Feature 1.2: Collections (Module 2)
cd ..\Module_02_Intelligent_Distribution
npm install
npm run typeorm migration:run

# Feature 1.3: Financing (Module 7)
cd ..\Module_07_Financing_Factoring
npm install
npm run typeorm migration:run

# Module 10: ToC Guidance
cd ..\Module_10_Orchestration_Hub
npm install
# (No new migrations, uses existing tables)
```

**Expected Output:**
```
✅ Migration CreateCashFlowTables executed successfully
✅ Migration CreateCollectionsAutopilotTables executed successfully
✅ Migration CreateFinancingTables executed successfully
```

---

## Step 4: Start Services

### 4.1 ML Service (Feature 1.1)

```powershell
cd ml-services\cash-flow-forecasting

# Build and start
docker-compose up -d

# Verify
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "cash-flow-forecasting",
  "version": "1.0.0",
  "timestamp": "2025-11-20T08:56:00Z"
}
```

### 4.2 Backend Services

Start each module in separate terminals:

**Terminal 1: Module 4 (Analytics & Reporting)**
```powershell
cd platform\Module_04_Analytics_Reporting
npm run start:dev
# Listens on port 3004
```

**Terminal 2: Module 2 (Intelligent Distribution)**
```powershell
cd platform\Module_02_Intelligent_Distribution
npm run start:dev
# Listens on port 3002
```

**Terminal 3: Module 7 (Financing & Factoring)**
```powershell
cd platform\Module_07_Financing_Factoring
npm run start:dev
# Listens on port 3007
```

**Terminal 4: Module 10 (Orchestration Hub)**
```powershell
cd platform\Module_10_Orchestration_Hub
npm run start:dev
# Listens on port 3010
```

### Verify All Services Running

```powershell
# Check all ports
netstat -an | findstr "3002 3004 3007 3010 8000"
```

---

## Step 5: Seed Test Data

Create test data for verification:

```sql
-- Connect to database
psql -h localhost -U sme_user -d sme_platform_staging

-- Create test tenant
INSERT INTO tenants (id, name, email, status)
VALUES ('tenant-test-001', 'Test SME Company', 'admin@testsme.com', 'active');

-- Create test customer
INSERT INTO customers (id, tenant_id, customer_name, email, phone, gstin)
VALUES 
  ('cust-001', 'tenant-test-001', 'Acme Corp', 'billing@acme.com', '+91-9876543210', '27AABCU9603R1ZM'),
  ('cust-002', 'tenant-test-001', 'XYZ Ltd', 'payments@xyz.com', '+91-9876543211', '29AABCX1234A1Z5');

-- Create test invoices
INSERT INTO invoices (id, tenant_id, customer_id, invoice_number, invoice_date, due_date, total_amount, outstanding_amount, payment_terms_days, status)
VALUES 
  ('inv-001', 'tenant-test-001', 'cust-001', 'INV-2025-001', '2025-01-15', '2025-02-14', 250000, 250000, 30, 'sent'),
  ('inv-002', 'tenant-test-001', 'cust-001', 'INV-2025-002', '2025-01-10', '2025-01-25', 150000, 150000, 15, 'overdue'),
  ('inv-003', 'tenant-test-001', 'cust-002', 'INV-2025-003', '2025-01-20', '2025-03-05', 500000, 500000, 45, 'sent');

-- Verify
SELECT * FROM invoices WHERE tenant_id = 'tenant-test-001';
```

---

## Step 6: Test Feature 1.1 - Cash Flow Command Center

### Test 6.1: Health Check

```powershell
curl http://localhost:8000/health
```

### Test 6.2: Generate Forecast

```powershell
# PowerShell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_JWT_TOKEN"  # Replace with actual token
}

$body = @{
    horizonDays = 30
    includeScenarios = $true
    refreshCache = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3004/api/v1/tenants/tenant-test-001/cash-flow/forecast" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

**Expected Output:**
```json
{
  "tenantId": "tenant-test-001",
  "generatedAt": "2025-11-20T09:00:00Z",
  "horizonDays": 30,
  "timeline": [
    {
      "date": "2025-01-21",
      "scenarios": {
        "optimistic": 900000,
        "realistic": 750000,
        "pessimistic": 600000
      },
      "confidence": 0.85
    }
  ],
  "criticalDates": [],
  "accuracy": {
    "last30Days": 0.91,
    "trend": "improving"
  }
}
```

### Test 6.3: Get "The One Thing" Guidance

```powershell
Invoke-RestMethod -Uri "http://localhost:3010/api/v1/tenants/tenant-test-001/cash-flow/one-thing" `
  -Method GET `
  -Headers $headers
```

**Expected Output:**
```json
{
  "constraintId": "const-123",
  "headline": "Chase Acme Corp Invoice #INV-2025-002 Today",
  "description": "This represents 18% of your outstanding AR...",
  "journeyStage": 7,
  "stageLabel": "Overdue",
  "oneClickActions": [
    {
      "id": "action-1",
      "type": "start_autopilot",
      "label": "Start Collections Autopilot"
    }
  ]
}
```

---

## Step 7: Test Feature 1.2 - Collections Autopilot

### Test 7.1: Start Autopilot

```powershell
$body = @{
    invoiceId = "inv-002"
    aggressiveness = "standard"
    preferredChannel = "email"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3002/api/v1/tenants/tenant-test-001/collections/autopilot/start" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

**Expected Output:**
```json
{
  "sessionId": "session-12345",
  "status": "active",
  "currentStage": "firm",
  "nextScheduledMessage": "2025-11-27T09:00:00Z",
  "message": "Collections autopilot started successfully"
}
```

### Test 7.2: Check Active Sessions

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/v1/tenants/tenant-test-001/collections/autopilot/sessions" `
  -Method GET `
  -Headers $headers
```

---

## Step 8: Test Feature 1.3 - Invoice Financing

### Test 8.1: Get Financing Options

```powershell
Invoke-RestMethod -Uri "http://localhost:3007/api/v1/tenants/tenant-test-001/financing/options/inv-003" `
  -Method GET `
  -Headers $headers
```

**Expected Output:**
```json
{
  "eligible": true,
  "offers": [
    {
      "offerId": "offer-indifi-123",
      "partner": "Indifi",
      "invoiceAmount": 500000,
      "youGet": 475000,
      "fee": "5% (₹25,000)",
      "disbursementTime": "48 hours",
      "validUntil": "2025-11-21T09:00:00Z"
    },
    {
      "offerId": "offer-lendingkart-456",
      "partner": "Lendingkart",
      "invoiceAmount": 500000,
      "youGet": 470000,
      "fee": "6% (₹30,000)",
      "disbursementTime": "6 hours",
      "validUntil": "2025-11-21T09:00:00Z"
    }
  ],
  "bestOffer": "offer-indifi-123"
}
```

### Test 8.2: Apply for Financing

```powershell
$body = @{
    invoiceId = "inv-003"
    offerId = "offer-indifi-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3007/api/v1/tenants/tenant-test-001/financing/apply" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

**Expected Output:**
```json
{
  "applicationId": "app-789",
  "status": "submitted",
  "estimatedDisbursement": "2025-11-22T09:00:00Z",
  "message": "Application submitted successfully..."
}
```

---

## Step 9: Verify Database State

```sql
-- Check forecasts generated
SELECT COUNT(*) FROM cash_flow_forecasts 
WHERE tenant_id = 'tenant-test-001';
-- Expected: 90 records (30 days × 3 scenarios)

-- Check autopilot sessions
SELECT * FROM collection_autopilot_sessions 
WHERE tenant_id = 'tenant-test-001';
-- Expected: 1 active session

-- Check financing offers
SELECT * FROM financing_offers 
WHERE tenant_id = 'tenant-test-001';
-- Expected: 3 offers

-- Check financing applications
SELECT * FROM financing_applications 
WHERE tenant_id = 'tenant-test-001';
-- Expected: 1 submitted application
```

---

## Step 10: Frontend Testing (Optional)

If you have the frontend built:

```powershell
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

**Manual UI Tests:**
1. ✅ Cash Flow Timeline renders with data
2. ✅ "One Thing" card shows constraint
3. ✅ Click "Start Autopilot" button → creates session
4. ✅ Click "Factor Invoice" → shows financing options
5. ✅ Journey stage badges show correctly

---

## Troubleshooting

### Issue: ML Service Returns 500 Error

**Problem:** Heuristic forecaster import error

**Solution:**
```powershell
cd ml-services\cash-flow-forecasting
pip install -r requirements.txt
docker-compose restart
```

### Issue: Database Connection Failed

**Problem:** PostgreSQL not accepting connections

**Solution:**
```powershell
# Check if PostgreSQL is running
docker ps | findstr postgres

# Check connection
psql -h localhost -U sme_user -d sme_platform_staging
```

### Issue: CORS Errors in Frontend

**Problem:** Backend not allowing frontend origin

**Solution:** Add to backend `.env`:
```bash
CORS_ORIGIN=http://localhost:5173
```

### Issue: Module 6/10 APIs Return 404

**Problem:** Services not started or wrong URLs

**Solution:**
```bash
# Update .env with correct URLs or use fallback mode
# Services will gracefully degrade to defaults
```

---

## Success Criteria

- [ ] All 5 database tables created
- [ ] ML service responds to health checks
- [ ] All 4 backend services running (ports 3002, 3004, 3007, 3010)
- [ ] Test forecast generated successfully
- [ ] Test autopilot session created
- [ ] Test financing offers retrieved
- [ ] No error logs in service consoles
- [ ] Database has expected test data

---

## Cleanup (After Testing)

```powershell
# Stop all services
docker-compose down

# Stop backend services (Ctrl+C in each terminal)

# Drop staging database (optional)
DROP DATABASE sme_platform_staging;

# Remove Docker containers
docker rm -f sme-postgres-staging
```

---

## Next Steps After Successful Staging Test

1. **Fix Any Issues Found** - Update code based on test results
2. **Write Automated Tests** - Convert manual tests to Playwright/Jest
3. **Performance Testing** - Load test with 1000+ invoices
4. **Security Audit** - Penetration testing, SQL injection checks
5. **Pilot Deployment** - Deploy to 3-5 real SME customers
6. **Monitor & Iterate** - Collect metrics, user feedback

---

## Contact & Support

**Issues During Deployment?**
- Check logs: `docker logs sme-cash-flow-ml`
- Review environment variables
- Verify all migrations ran successfully

**Ready for Production?**
- Complete security hardening
- Set up monitoring (Datadog, New Relic)
- Configure backups
- Set up CI/CD pipeline

---

**📋 Deployment Status Tracker**

| Step | Status | Time | Notes |
|------|--------|------|-------|
| Environment Setup | ⏳ | - | |
| Database Setup | ⏳ | - | |
| Migrations | ⏳ | - | |
| Services Started | ⏳ | - | |
| Test Data Seeded | ⏳ | - | |
| Feature 1.1 Tested | ⏳ | - | |
| Feature 1.2 Tested | ⏳ | - | |
| Feature 1.3 Tested | ⏳ | - | |
| Database Verified | ⏳ | - | |

**Update this table as you progress through deployment!**
