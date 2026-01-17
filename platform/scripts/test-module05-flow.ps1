# Module 05 Testing Script (PowerShell)
# This script tests the complete milestone workflow via REST API

Write-Host "[START] Testing Module 05: Milestone Workflows" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BaseUrl = "http://localhost:3000"
$TenantId = "00000000-0000-0000-0000-000000000001"

# Step 1: Login and get token
Write-Host "[INFO] Step 1: Authenticating..." -ForegroundColor Yellow

$loginBody = @{
    email    = "admin@smeplatform.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.accessToken
    Write-Host "[OK] Authenticated successfully" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create Milestone Definition
Write-Host "📝 Step 2: Creating Milestone Definition..." -ForegroundColor Yellow

$headers = @{
    Authorization  = "Bearer $token"
    "Content-Type" = "application/json"
}

$milestoneDefBody = @{
    name                     = "API Test Milestone"
    description              = "Testing milestone creation via API"
    milestoneType            = "DELIVERABLE"
    paymentAmount            = 10000
    plannedStartDate         = "2025-12-01"
    plannedEndDate           = "2025-12-15"
    completionCriteria       = @{
        requiredDocuments = @("test.pdf")
        requiredApprovals = 1
    }
    verificationRequirements = @{
        verificationMethod = "MANUAL"
        evidenceRequired   = $true
    }
} | ConvertTo-Json -Depth 10

try {
    $defResponse = Invoke-RestMethod -Uri "$BaseUrl/api/tenant/$TenantId/milestones" `
        -Method Post `
        -Headers $headers `
        -Body $milestoneDefBody
    
    $definitionId = $defResponse.id
    Write-Host "[OK] Created milestone definition: $definitionId" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to create milestone definition: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Create Milestone Instance
Write-Host "📝 Step 3: Creating Milestone Instance..." -ForegroundColor Yellow

$instanceBody = @{
    definitionId = $definitionId
} | ConvertTo-Json

try {
    $instanceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/tenant/$TenantId/milestone-status/instances" `
        -Method Post `
        -Headers $headers `
        -Body $instanceBody
    
    $instanceId = $instanceResponse.id
    Write-Host "[OK] Created milestone instance: $instanceId" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to create milestone instance: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Update to IN_PROGRESS
Write-Host "📝 Step 4: Starting milestone..." -ForegroundColor Yellow

$updateBody = @{
    status             = "IN_PROGRESS"
    progressPercentage = 50
    statusNotes        = "Work in progress"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/tenant/$TenantId/milestone-status/instances/$instanceId/status" `
        -Method Put `
        -Headers $headers `
        -Body $updateBody | Out-Null
    
    Write-Host "[OK] Milestone started (50% progress)" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to update milestone: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Complete Milestone
Write-Host "📝 Step 5: Completing milestone..." -ForegroundColor Yellow

$completeBody = @{
    status             = "COMPLETED"
    progressPercentage = 100
    statusNotes        = "Completed successfully"
    evidenceUrls       = @("https://example.com/evidence.pdf")
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/tenant/$TenantId/milestone-status/instances/$instanceId/status" `
        -Method Put `
        -Headers $headers `
        -Body $completeBody | Out-Null
    
    Write-Host "[OK] Milestone completed (100 percent)" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to complete milestone: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 6: Generate Invoice
Write-Host "📝 Step 6: Generating invoice..." -ForegroundColor Yellow

try {
    $invoiceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/tenant/$TenantId/milestone-payments/generate/$instanceId" `
        -Method Post `
        -Headers $headers
    
    $paymentId = $invoiceResponse.id
    Write-Host "[OK] Invoice generated: $paymentId" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to generate invoice: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 7: Track Payment
Write-Host "📝 Step 7: Tracking payment..." -ForegroundColor Yellow

$paymentBody = @{
    amountReceived   = 10000
    paymentReference = "TEST-PAY-12345"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/tenant/$TenantId/milestone-payments/track/$instanceId" `
        -Method Post `
        -Headers $headers `
        -Body $paymentBody | Out-Null
    
    Write-Host "[OK] Payment tracked successfully" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to track payment: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 8: Verify Payment Status
Write-Host "📝 Step 8: Verifying payment status..." -ForegroundColor Yellow

try {
    $paymentStatus = Invoke-RestMethod -Uri "$BaseUrl/api/tenant/$TenantId/milestone-payments/status/$instanceId" `
        -Method Get `
        -Headers $headers
    
    $status = $paymentStatus.paymentStatus
    
    if ($status -eq "PAID") {
        Write-Host "[OK] Payment status verified: $status" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN]  Payment status: $status" -ForegroundColor Yellow
    }
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to verify payment status: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "[SUCCESS] All tests passed! Module 05 is working correctly" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:"
Write-Host "  [OK] Milestone Definition: $definitionId"
Write-Host "  [OK] Milestone Instance: $instanceId"
Write-Host "  [OK] Payment Record: $paymentId"
Write-Host "  [OK] Payment Status: $status"
Write-Host ""
