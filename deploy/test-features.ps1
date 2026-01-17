# Test All Features - PowerShell Script
# Automated testing for Option 1 features

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Option 1 - Feature Testing" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$testResults = @()
$tenantId = "tenant-test-001"

# Helper function for tests
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Uri,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "  ✓ PASSED" -ForegroundColor Green
        return @{Name=$Name; Status="PASSED"; Response=$response}
    } catch {
        Write-Host "  ✗ FAILED: $_" -ForegroundColor Red
        return @{Name=$Name; Status="FAILED"; Error=$_.Exception.Message}
    }
}

# Test 1: ML Service Health
Write-Host "`n[Feature 1.1: Cash Flow Command Center]`n" -ForegroundColor Cyan

$testResults += Test-Endpoint `
    -Name "ML Service Health" `
    -Uri "http://localhost:8000/health"

# Test 2: ML Service Model Info
$testResults += Test-Endpoint `
    -Name "ML Service Model Info" `
    -Uri "http://localhost:8000/model/info"

# Test 3: Cash Flow Forecast (without auth for demo)
$testResults += Test-Endpoint `
    -Name "Generate Cash Flow Forecast" `
    -Uri "http://localhost:3004/api/v1/tenants/$tenantId/cash-flow/forecast" `
    -Method "POST" `
    -Body @{
        horizonDays = 30
        includeScenarios = $true
    }

# Test 4: ToC "One Thing" Guidance
$testResults += Test-Endpoint `
    -Name "Get 'The One Thing' Guidance" `
    -Uri "http://localhost:3010/api/v1/tenants/$tenantId/cash-flow/one-thing"

# Test 5: Collections Autopilot
Write-Host "`n[Feature 1.2: Collections Autopilot]`n" -ForegroundColor Cyan

$testResults += Test-Endpoint `
    -Name "Start Collections Autopilot" `
    -Uri "http://localhost:3002/api/v1/tenants/$tenantId/collections/autopilot/start" `
    -Method "POST" `
    -Body @{
        invoiceId = "inv-002"
        aggressiveness = "standard"
    }

$testResults += Test-Endpoint `
    -Name "Get Autopilot Sessions" `
    -Uri "http://localhost:3002/api/v1/tenants/$tenantId/collections/autopilot/sessions"

# Test 6: Invoice Financing
Write-Host "`n[Feature 1.3: Invoice Financing]`n" -ForegroundColor Cyan

$testResults += Test-Endpoint `
    -Name "Get Financing Options" `
    -Uri "http://localhost:3007/api/v1/tenants/$tenantId/financing/options/inv-003"

# Display Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passed = ($testResults | Where-Object {$_.Status -eq "PASSED"}).Count
$failed = ($testResults | Where-Object {$_.Status -eq "FAILED"}).Count
$total = $testResults.Count

foreach ($result in $testResults) {
    $color = if ($result.Status -eq "PASSED") { "Green" } else { "Red" }
    $symbol = if ($result.Status -eq "PASSED") { "✓" } else { "✗" }
    
    Write-Host "  $symbol $($result.Name)" -ForegroundColor $color
    
    if ($result.Status -eq "FAILED") {
        Write-Host "    Error: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host "`n----------------------------------------" -ForegroundColor Cyan
Write-Host "  Total: $total | Passed: $passed | Failed: $failed" -ForegroundColor White
Write-Host "  Success Rate: $([math]::Round(($passed/$total)*100, 1))%" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($passed -eq $total) {
    Write-Host "🎉 All tests passed! Staging deployment successful!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some tests failed. Review errors above and check:" -ForegroundColor Yellow
    Write-Host "  - Are all backend services running?" -ForegroundColor White
    Write-Host "  - Check service logs for errors" -ForegroundColor White
    Write-Host "  - Verify test data exists in database" -ForegroundColor White
}
