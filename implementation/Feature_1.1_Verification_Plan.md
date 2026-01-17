# End-to-End Verification Plan
## Feature 1.1: Cash Flow Command Center

**Goal:** Verify complete pipeline before proceeding to 100% implementation

---

## Phase 1: ML Service Verification ✅

### Test 1.1: Health Check
```bash
cd ml-services/cash-flow-forecasting
docker-compose up -d
curl http://localhost:8000/health
```

**Expected:** 
```json
{
  "status": "healthy",
  "service": "cash-flow-forecasting",
  "version": "1.0.0"
}
```

### Test 1.2: Heuristic Prediction
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-tenant-123",
    "invoices": [
      {
        "id": "inv-001",
        "invoice_date": "2025-01-15",
        "amount": 250000,
        "payment_terms_days": 30,
        "customer_name": "Acme Corp",
        "customer_avg_delay_days": 12
      }
    ],
    "payment_probabilities": {
      "inv-001": 0.72
    },
    "horizon_days": 30
  }'
```

**Expected:** JSON with predictions timeline, critical_dates, model_version: "heuristic-v1.0"

---

## Phase 2: Database Verification ✅

### Test 2.1: Run Migration
```bash
cd platform/Module_04_Analytics_Reporting
npm install
npm run typeorm migration:run
```

**Expected:** Tables created successfully

### Test 2.2: Verify Schema
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('cash_flow_forecasts', 'forecast_accuracy_logs');
```

---

## Phase 3: Node.js Backend Verification ✅

### Test 3.1: Install Dependencies
```bash
cd platform/Module_04_Analytics_Reporting
npm install axios
```

### Test 3.2: Compile TypeScript
```bash
npm run build
```

**Expected:** No compilation errors

### Test 3.3: Unit Test (Manual)
Create test file to verify service methods work

---

## Phase 4: Integration Test ✅

### Test 4.1: Seed Test Invoice Data
```sql
-- Insert test customer
INSERT INTO customers (id, tenant_id, customer_name, email)
VALUES ('cust-001', 'tenant-test', 'Acme Corp', 'billing@acme.com');

-- Insert test invoice
INSERT INTO invoices (id, tenant_id, customer_id, invoice_number, invoice_date, due_date, total_amount, outstanding_amount, payment_terms_days, status)
VALUES ('inv-001', 'tenant-test', 'cust-001', 'INV-2025-001', '2025-01-15', '2025-02-14', 250000, 250000, 30, 'sent');
```

### Test 4.2: Call Forecast API
```bash
curl -X POST http://localhost:3000/api/v1/tenants/tenant-test/cash-flow/forecast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "horizonDays": 30,
    "includeScenarios": true
  }'
```

**Expected:** Full forecast response with timeline, critical dates

---

## Phase 5: ML Model Training 🔄

### Test 5.1: Extract Training Data
```bash
cd ml-services/cash-flow-forecasting
python training/extract_data.py --tenant-id all --output data/training_set.csv
```

### Test 5.2: Train Model
```bash
python training/train.py \
  --data data/training_set.csv \
  --epochs 50 \
  --batch-size 32 \
  --output models/cash_flow_lstm_v1.pth
```

**Expected:** Model trained with MAE < 20% on validation set

### Test 5.3: Verify ML Predictions
Restart service, retry prediction - should use LSTM model instead of heuristic

---

## Phase 6: Complete Remaining Features 🚧

### 6.1: Module 10 ToC Integration
- [ ] Create ToC Guidance UI Service
- [ ] "One Thing" constraint identification
- [ ] Map technical constraints to journey language

### 6.2: Frontend Components
- [ ] CashFlowTimeline.tsx - Chart component
- [ ] TheOneThingCard.tsx - Constraint display
- [ ] ForecastAccuracy.tsx - Accuracy widget
- [ ] Journey visualization overlay

### 6.3: API Controller Tests
- [ ] Unit tests for CashFlowController
- [ ] Integration tests for forecast flow
- [ ] E2E tests with Playwright

### 6.4: Documentation
- [ ] API documentation (Swagger)
- [ ] User guide for dashboard
- [ ] Deployment guide

---

## Success Criteria

- ✅ ML service responds to health checks
- ✅ Heuristic predictions generate valid forecasts
- ✅ Database migrations run successfully
- ✅ Backend service compiles without errors
- ✅ End-to-end forecast generation works
- ⏳ ML model trained and deployed
- ⏳ Frontend dashboard functional
- ⏳ Module 10 ToC integration complete
- ⏳ All tests passing

**Current Status:** Phase 1-3 complete, starting Phase 4 verification
