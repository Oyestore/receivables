# Module 05: Milestone Workflows - Testing Guide

This guide provides step-by-step instructions for testing Module 05 after database migrations.

---

## Prerequisites

1. **PostgreSQL Database Running**
   - Ensure PostgreSQL is running on `localhost:5432`
   - Database: `sme_platform` (or as configured in `.env`)

2. **Database Migrations**
   ```bash
   # Generate migration for Module 05
   npm run migration:generate -- ./migrations/AddModule05MilestoneWorkflows
   
   # Run migrations
   npm run migration:run
   ```

3. **Application Running**
   ```bash
   # Start the NestJS application
   npm run start:dev
   ```

4. **Seeded Data**
   - Ensure you have at least one tenant and admin user
   - Default credentials: `admin@smeplatform.com` / `Admin@123`

---

## Testing Options

### Option 1: Automated E2E Tests (Recommended)

Run the comprehensive Jest test suite:

```bash
# Run Module 05 E2E tests
npm run test:e2e test/module05-e2e.spec.ts
```

**What it tests:**
- ✅ Milestone definition CRUD
- ✅ Milestone instance lifecycle
- ✅ Status tracking and updates
- ✅ Payment and invoice generation
- ✅ Escalation workflows
- ✅ Filtering and queries

---

### Option 2: Verification Script

Run the standalone verification script:

```bash
# Using ts-node
npx ts-node verify-module05.ts
```

**What it does:**
1. Creates a milestone definition
2. Starts a milestone instance
3. Updates progress (0% → 50% → 100%)
4. Completes the milestone
5. Generates invoice/payment
6. Tracks payment receipt
7. Cleans up test data

**Expected Output:**
```
🔍 Starting Module 05 Verification...

✅ Database connected

📝 Test 1: Creating Milestone Definition...
✅ Created milestone definition: abc-123...
   Name: Software Development - Phase 1
   Payment: $25000

📝 Test 2: Creating Milestone Instance...
✅ Created milestone instance: def-456...
   Status: PENDING
   Progress: 0%

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL TESTS PASSED - Module 05 is working correctly!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Option 3: REST API Tests (Windows)

Run the PowerShell test script:

```powershell
# Make sure the app is running on http://localhost:3000
.\scripts\test-module05-flow.ps1
```

Or for Linux/Mac:

```bash
chmod +x scripts/test-module05-flow.sh
./scripts/test-module05-flow.sh
```

---

### Option 4: Manual API Testing (Swagger/Postman)

1. **Access Swagger UI**
   ```
   http://localhost:3000/api
   ```

2. **Authenticate**
   - POST `/api/auth/login`
   ```json
   {
     "email": "admin@smeplatform.com",
     "password": "Admin@123"
   }
   ```
   - Copy the `accessToken`

3. **Authorize in Swagger**
   - Click "Authorize" button
   - Enter: `Bearer <your-token>`

4. **Test Milestone Workflow**

   **Step 1: Create Milestone Definition**
   - POST `/api/tenant/{tenantId}/milestones`
   ```json
   {
     "name": "Project Delivery",
     "description": "Complete project delivery",
     "milestoneType": "DELIVERABLE",
     "paymentAmount": 10000,
     "plannedStartDate": "2025-12-01",
     "plannedEndDate": "2025-12-15",
     "completionCriteria": {
       "requiredDocuments": ["delivery_receipt.pdf"],
       "requiredApprovals": 1
     },
     "verificationRequirements": {
       "verificationMethod": "MANUAL",
       "evidenceRequired": true
     }
   }
   ```
   - Copy the returned `id` (milestone definition ID)

   **Step 2: Create Milestone Instance**
   - POST `/api/tenant/{tenantId}/milestone-status/instances`
   ```json
   {
     "definitionId": "<milestone-definition-id>"
   }
   ```
   - Copy the returned `id` (milestone instance ID)

   **Step 3: Start Milestone**
   - PUT `/api/tenant/{tenantId}/milestone-status/instances/{instanceId}/status`
   ```json
   {
     "status": "IN_PROGRESS",
     "progressPercentage": 50,
     "statusNotes": "Work started"
   }
   ```

   **Step 4: Complete Milestone**
   - PUT `/api/tenant/{tenantId}/milestone-status/instances/{instanceId}/status`
   ```json
   {
     "status": "COMPLETED",
     "progressPercentage": 100,
     "statusNotes": "Work complete",
     "evidenceUrls": ["https://example.com/proof.pdf"]
   }
   ```

   **Step 5: Generate Invoice**
   - POST `/api/tenant/{tenantId}/milestone-payments/generate/{instanceId}`

   **Step 6: Track Payment**
   - POST `/api/tenant/{tenantId}/milestone-payments/track/{instanceId}`
   ```json
   {
     "amountReceived": 10000,
     "paymentReference": "PAY-12345"
   }
   ```

   **Step 7: Verify Payment Status**
   - GET `/api/tenant/{tenantId}/milestone-payments/status/{instanceId}`
   - Should return `paymentStatus: "PAID"`

---

## Verification Checklist

After running any of the tests above, verify the following:

### Database Verification

```sql
-- Check milestone definitions
SELECT * FROM milestone_definition ORDER BY "createdDate" DESC LIMIT 5;

-- Check milestone instances
SELECT 
    mi.id,
    md.name,
    mi."currentStatus",
    mi."progressPercentage",
    mi."verificationStatus"
FROM milestone_instance mi
JOIN milestone_definition md ON mi."definitionId" = md.id
ORDER BY mi."createdDate" DESC
LIMIT 5;

-- Check payments
SELECT 
    mp.*,
    mi."currentStatus" as milestone_status
FROM milestone_payment mp
JOIN milestone_instance mi ON mp."milestoneInstanceId" = mi.id
ORDER BY mp."invoiceGeneratedDate" DESC
LIMIT 5;

-- Check escalations
SELECT * FROM milestone_escalation ORDER BY "escalatedDate" DESC LIMIT 5;
```

### Expected Results

✅ **Milestone Definition**: Created with correct payment amount and criteria  
✅ **Milestone Instance**: Status transitions (PENDING → IN_PROGRESS → COMPLETED)  
✅ **Progress Tracking**: Progress updates (0% → 50% → 100%)  
✅ **Payment Record**: Invoice generated with correct amount  
✅ **Payment Status**: Status updated to PAID after tracking  

---

## Common Issues

### Issue 1: Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Start PostgreSQL service
```bash
# Windows (if using pg installed via installer)
# Services → PostgreSQL → Start

# Linux
sudo systemctl start postgresql

# Mac
brew services start postgresql
```

### Issue 2: Migration Fails
```
Error: relation "milestone_definition" does not exist
```
**Solution**: Run migrations
```bash
npm run migration:run
```

### Issue 3: Authentication Failed
```
Error: 401 Unauthorized
```
**Solution**: 
1. Ensure database is seeded with admin user
2. Use correct credentials
3. Check JWT token expiry

### Issue 4: Tenant Not Found
```
Error: Tenant not found
```
**Solution**: 
1. Run database seeding: `npm run seed`
2. Use the correct tenant ID from the database
3. Check tenant status is ACTIVE

---

## Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| Create Definition | < 100ms | Single database insert |
| Create Instance | < 100ms | Single database insert |
| Update Status | < 100ms | Single update query |
| Generate Invoice | < 200ms | Includes payment record creation |
| Track Payment | < 100ms | Single update query |
| Full Workflow | < 1 second | End-to-end (6 operations) |

---

## Next Steps After Testing

Once all tests pass:

1. **Integration Testing**
   - Test with Module 01 (Invoice generation)
   - Test with Module 03 (Payment tracking)
   - Test with Module 11 (Notifications)

2. **Load Testing**
   - Create 100+ milestones
   - Test concurrent updates
   - Monitor database performance

3. **Production Readiness**
   - Enable query logging
   - Set up monitoring
   - Configure alert thresholds
   - Plan backup strategy

---

## Support

If you encounter any issues:

1. Check the logs: `tail -f logs/application.log`
2. Review error messages in console
3. Verify database state
4. Check network connectivity
5. Consult the main documentation

---

**Last Updated**: November 22, 2025  
**Module Version**: 1.0.0  
**Status**: Production Ready
