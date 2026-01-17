#!/bin/bash

# ML Integration Test Script
# Tests all ML endpoints to verify deployment

BASE_URL="http://localhost:3000"
PASS_COUNT=0
FAIL_COUNT=0

echo "🧪 Testing ML Integration..."
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local data=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASS_COUNT=$((PASS_COUNT + 1))
        echo "   Response: $(echo $body | jq -r '.')"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo "   Error: $body"
    fi
    echo ""
}

# 1. Health Check
echo "1️⃣  Health Check"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/ml/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ ML Service is healthy${NC}"
    echo "   $body" | jq '.'
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}✗ ML Service is NOT healthy${NC}"
    echo "   HTTP $http_code: $body"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo ""
    echo "⚠️  ML service not running. Start the application first:"
    echo "   npm run start:dev"
    exit 1
fi
echo ""

# 2. Engagement Score
echo "2️⃣  Customer Engagement Score"
test_endpoint "Engagement Score" "/api/ml/predict/engagement-score" '{
    "email_open_rate": 0.35,
    "message_count": 24,
    "payment_count": 8,
    "avg_response_time_hours": 12.5,
    "last_interaction_days": 3,
    "total_invoice_value": 125000,
    "dispute_count": 1,
    "rating": 4.2,
    "days_since_signup": 180,
    "is_premium": 1
}'

# 3. Payment Probability
echo "3️⃣  Payment Probability"
test_endpoint "Payment Probability" "/api/ml/predict/payment-probability" '{
    "days_overdue": 5,
    "previous_payments": 12,
    "avg_days_to_pay": 8.3,
    "total_outstanding": 45000,
    "engagement_score": 72,
    "last_contact_days": 2
}'

# 4. Churn Risk
echo "4️⃣  Churn Risk Detection"
test_endpoint "Churn Risk" "/api/ml/predict/churn-risk" '{
    "messages_sent_30d": 8,
    "messages_opened_30d": 5,
    "payments_received_30d": 3,
    "disputes_created_30d": 0,
    "last_login_days": 5,
    "total_value_30d": 125000
}'

# 5. Optimal Send Time
echo "5️⃣  Send-Time Optimization"
test_endpoint "Optimal Send Time" "/api/ml/predict/optimal-send-time" '{
    "avg_open_rate": 0.28,
    "total_messages_sent": 145,
    "timezone_offset": 5.5,
    "industry": "Manufacturing",
    "customer_type": "SME"
}'

# 6. Credit Score
echo "6️⃣  Credit Score Prediction"
test_endpoint "Credit Score" "/api/ml/predict/credit-score" '{
    "annual_revenue": 5000000,
    "years_in_business": 3.5,
    "payment_history_score": 78,
    "debt_to_income_ratio": 0.35,
    "num_late_payments": 2,
    "avg_account_balance": 250000,
    "credit_utilization": 0.45,
    "num_trade_references": 5,
    "owner_credit_score": 720,
    "industry_risk_score": 35
}'

# 7. Default Probability
echo "7️⃣  Default Probability"
test_endpoint "Default Probability" "/api/ml/predict/default-probability" '{
    "credit_score": 712,
    "debt_to_income": 0.35,
    "payment_history_score": 78,
    "years_in_business": 3.5,
    "num_late_payments": 2,
    "current_outstanding": 250000
}'

# 8. Credit Limit
echo "8️⃣  Credit Limit Recommendation"
test_endpoint "Credit Limit" "/api/ml/predict/credit-limit" '{
    "annual_revenue": 5000000,
    "credit_score": 712,
    "years_in_business": 3.5,
    "avg_monthly_sales": 416667,
    "debt_to_income": 0.35
}'

# 9. Risk Category
echo "9️⃣  Risk Category Classification"
test_endpoint "Risk Category" "/api/ml/predict/risk-category" '{
    "credit_score": 712,
    "default_probability": 0.15,
    "payment_history_score": 78,
    "debt_to_income": 0.35
}'

# 10. Fraud Detection
echo "🔟 Fraud Detection"
test_endpoint "Fraud Detection" "/api/ml/detect/fraud" '{
    "amount": 150000,
    "hour_of_day": 3,
    "is_domestic": 0,
    "velocity_last_hour": 7,
    "payment_method": "Card"
}'

# Summary
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "Total Tests: $((PASS_COUNT + FAIL_COUNT))"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All ML endpoints are working!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check logs above.${NC}"
    exit 1
fi
