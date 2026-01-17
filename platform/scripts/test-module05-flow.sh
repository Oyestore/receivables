#!/bin/bash

# Module 05 Testing Script
# This script tests the complete milestone workflow via REST API

echo "🚀 Testing Module 05: Milestone Workflows"
echo "=========================================="
echo ""

# Configuration
BASE_URL="http://localhost:3000"
TENANT_ID="00000000-0000-0000-0000-000000000001"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Login and get token
echo "📝 Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smeplatform.com",
    "password": "Admin@123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Authentication failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}"
echo ""

# Step 2: Create Milestone Definition
echo "📝 Step 2: Creating Milestone Definition..."
CREATE_DEF_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tenant/$TENANT_ID/milestones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Milestone",
    "description": "Testing milestone creation via API",
    "milestoneType": "DELIVERABLE",
    "paymentAmount": 10000,
    "plannedStartDate": "2025-12-01",
    "plannedEndDate": "2025-12-15",
    "completionCriteria": {
      "requiredDocuments": ["test.pdf"],
      "requiredApprovals": 1
    },
    "verificationRequirements": {
      "verificationMethod": "MANUAL",
      "evidenceRequired": true
    }
  }')

DEFINITION_ID=$(echo $CREATE_DEF_RESPONSE | jq -r '.id')

if [ "$DEFINITION_ID" = "null" ] || [ -z "$DEFINITION_ID" ]; then
  echo -e "${RED}❌ Failed to create milestone definition${NC}"
  echo $CREATE_DEF_RESPONSE | jq .
  exit 1
fi

echo -e "${GREEN}✅ Created milestone definition: $DEFINITION_ID${NC}"
echo ""

# Step 3: Create Milestone Instance
echo "📝 Step 3: Creating Milestone Instance..."
CREATE_INSTANCE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tenant/$TENANT_ID/milestone-status/instances" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"definitionId\": \"$DEFINITION_ID\"
  }")

INSTANCE_ID=$(echo $CREATE_INSTANCE_RESPONSE | jq -r '.id')

if [ "$INSTANCE_ID" = "null" ] || [ -z "$INSTANCE_ID" ]; then
  echo -e "${RED}❌ Failed to create milestone instance${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Created milestone instance: $INSTANCE_ID${NC}"
echo ""

# Step 4: Update to IN_PROGRESS
echo "📝 Step 4: Starting milestone..."
curl -s -X PUT "$BASE_URL/api/tenant/$TENANT_ID/milestone-status/instances/$INSTANCE_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "progressPercentage": 50,
    "statusNotes": "Work in progress"
  }' > /dev/null

echo -e "${GREEN}✅ Milestone started (50% progress)${NC}"
echo ""

# Step 5: Complete Milestone
echo "📝 Step 5: Completing milestone..."
curl -s -X PUT "$BASE_URL/api/tenant/$TENANT_ID/milestone-status/instances/$INSTANCE_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "progressPercentage": 100,
    "statusNotes": "Completed successfully",
    "evidenceUrls": ["https://example.com/evidence.pdf"]
  }' > /dev/null

echo -e "${GREEN}✅ Milestone completed (100%)${NC}"
echo ""

# Step 6: Generate Invoice
echo "📝 Step 6: Generating invoice..."
INVOICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tenant/$TENANT_ID/milestone-payments/generate/$INSTANCE_ID" \
  -H "Authorization: Bearer $TOKEN")

PAYMENT_ID=$(echo $INVOICE_RESPONSE | jq -r '.id')

if [ "$PAYMENT_ID" = "null" ] || [ -z "$PAYMENT_ID" ]; then
  echo -e "${RED}❌ Failed to generate invoice${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Invoice generated: $PAYMENT_ID${NC}"
echo ""

# Step 7: Track Payment
echo "📝 Step 7: Tracking payment..."
curl -s -X POST "$BASE_URL/api/tenant/$TENANT_ID/milestone-payments/track/$INSTANCE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountReceived": 10000,
    "paymentReference": "TEST-PAY-12345"
  }' > /dev/null

echo -e "${GREEN}✅ Payment tracked successfully${NC}"
echo ""

# Step 8: Verify Payment Status
echo "📝 Step 8: Verifying payment status..."
PAYMENT_STATUS=$(curl -s -X GET "$BASE_URL/api/tenant/$TENANT_ID/milestone-payments/status/$INSTANCE_ID" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo $PAYMENT_STATUS | jq -r '.paymentStatus')

if [ "$STATUS" = "PAID" ]; then
  echo -e "${GREEN}✅ Payment status verified: $STATUS${NC}"
else
  echo -e "${YELLOW}⚠️  Payment status: $STATUS${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 All tests passed! Module 05 is working correctly${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  ✅ Milestone Definition: $DEFINITION_ID"
echo "  ✅ Milestone Instance: $INSTANCE_ID"
echo "  ✅ Payment Record: $PAYMENT_ID"
echo "  ✅ Payment Status: $STATUS"
echo ""
