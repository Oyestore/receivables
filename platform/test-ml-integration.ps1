# ML Integration Test Script (PowerShell)
# Tests all ML endpoints to verify deployment

$BASE_URL = "http://localhost:3000"
$PASS_COUNT = 0
$FAIL_COUNT = 0

Write-Host "🧪 Testing ML Integration..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test function
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Endpoint,
        [string]$Data
    )
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL$Endpoint" `
            -Method Post `
            -ContentType "application/json" `
            -Body $Data `
            -ErrorAction Stop
        
        Write-Host "✓ PASS" -ForegroundColor Green
        $script:PASS_COUNT++
        Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
    catch {
        Write-Host "✗ FAIL" -ForegroundColor Red
        $script:FAIL_COUNT++
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# 1. Health Check
Write-Host "1️⃣  Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/api/ml/health" -Method Get
    Write-Host "✓ ML Service is healthy" -ForegroundColor Green
    Write-Host "   $($health | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    $PASS_COUNT++
}
catch {
    Write-Host "✗ ML Service is NOT healthy" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    $FAIL_COUNT++
    Write-Host ""
    Write-Host "⚠️  ML service not running. Start the application first:" -ForegroundColor Yellow
    Write-Host "   npm run start:dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Engagement Score
Write-Host "2️⃣  Customer Engagement Score" -ForegroundColor Yellow
Test-Endpoint -Name "Engagement Score" -Endpoint "/api/ml/predict/engagement-score" -Data @'
{
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
}
'@

# 3. Payment Probability
Write-Host "3️⃣  Payment Probability" -ForegroundColor Yellow
Test-Endpoint -Name "Payment Probability" -Endpoint "/api/ml/predict/payment-probability" -Data @'
{
    "days_overdue": 5,
    "previous_payments": 12,
    "avg_days_to_pay": 8.3,
    "total_outstanding": 45000,
    "engagement_score": 72,
    "last_contact_days": 2
}
'@

# 4. Churn Risk
Write-Host "4️⃣  Churn Risk Detection" -ForegroundColor Yellow
Test-Endpoint -Name "Churn Risk" -Endpoint "/api/ml/predict/churn-risk" -Data @'
{
    "messages_sent_30d": 8,
    "messages_opened_30d": 5,
    "payments_received_30d": 3,
    "disputes_created_30d": 0,
    "last_login_days": 5,
    "total_value_30d": 125000
}
'@

# 5. Optimal Send Time
Write-Host "5️⃣  Send-Time Optimization" -ForegroundColor Yellow
Test-Endpoint -Name "Optimal Send Time" -Endpoint "/api/ml/predict/optimal-send-time" -Data @'
{
    "avg_open_rate": 0.28,
    "total_messages_sent": 145,
    "timezone_offset": 5.5,
    "industry": "Manufacturing",
    "customer_type": "SME"
}
'@

# 6. Credit Score
Write-Host "6️⃣  Credit Score Prediction" -ForegroundColor Yellow
Test-Endpoint -Name "Credit Score" -Endpoint "/api/ml/predict/credit-score" -Data @'
{
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
}
'@

# 7. Default Probability
Write-Host "7️⃣  Default Probability" -ForegroundColor Yellow
Test-Endpoint -Name "Default Probability" -Endpoint "/api/ml/predict/default-probability" -Data @'
{
    "credit_score": 712,
    "debt_to_income": 0.35,
    "payment_history_score": 78,
    "years_in_business": 3.5,
    "num_late_payments": 2,
    "current_outstanding": 250000
}
'@

# 8. Credit Limit
Write-Host "8️⃣  Credit Limit Recommendation" -ForegroundColor Yellow
Test-Endpoint -Name "Credit Limit" -Endpoint "/api/ml/predict/credit-limit" -Data @'
{
    "annual_revenue": 5000000,
    "credit_score": 712,
    "years_in_business": 3.5,
    "avg_monthly_sales": 416667,
    "debt_to_income": 0.35
}
'@

# 9. Risk Category
Write-Host "9️⃣  Risk Category Classification" -ForegroundColor Yellow
Test-Endpoint -Name "Risk Category" -Endpoint "/api/ml/predict/risk-category" -Data @'
{
    "credit_score": 712,
    "default_probability": 0.15,
    "payment_history_score": 78,
    "debt_to_income": 0.35
}
'@

# 10. Fraud Detection
Write-Host "🔟 Fraud Detection" -ForegroundColor Yellow
Test-Endpoint -Name "Fraud Detection" -Endpoint "/api/ml/detect/fraud" -Data @'
{
    "amount": 150000,
    "hour_of_day": 3,
    "is_domestic": 0,
    "velocity_last_hour": 7,
    "payment_method": "Card"
}
'@

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Total Tests: $($PASS_COUNT + $FAIL_COUNT)"
Write-Host "Passed: $PASS_COUNT" -ForegroundColor Green
Write-Host "Failed: $FAIL_COUNT" -ForegroundColor Red
Write-Host ""

if ($FAIL_COUNT -eq 0) {
    Write-Host "🎉 All ML endpoints are working!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "⚠️  Some tests failed. Check logs above." -ForegroundColor Yellow
    exit 1
}
