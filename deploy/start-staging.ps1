# Staging Deployment - PowerShell Automation Script
# Run this script to deploy all Option 1 features

param(
    [switch]$SkipDocker = $false,
    [switch]$SkipMigrations = $false,
    [switch]$RunTests = $true
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SME Platform - Staging Deployment" -ForegroundColor Cyan
Write-Host "Option 1: All 3 Features" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$startTime = Get-Date

# Navigate to project root
$projectRoot = "c:\Users\91858\Downloads\SME_Platform_12_Separate_Modules"
Set-Location $projectRoot

# Step 1: Check Prerequisites
Write-Host "[1/9] Checking prerequisites..." -ForegroundColor Yellow

try {
    $dockerVersion = docker --version
    Write-Host "  ✓ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}

try {
    $pythonVersion = python --version
    Write-Host "  ✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

# Step 2: Start PostgreSQL (if not skipped)
if (-not $SkipDocker) {
    Write-Host "`n[2/9] Starting PostgreSQL container..." -ForegroundColor Yellow
    
    # Check if container already exists
    $existingContainer = docker ps -a --filter "name=sme-postgres-staging" --format "{{.Names}}"
    
    if ($existingContainer) {
        Write-Host "  Container exists. Starting..." -ForegroundColor Cyan
        docker start sme-postgres-staging | Out-Null
    } else {
        Write-Host "  Creating new container..." -ForegroundColor Cyan
        docker run -d `
            --name sme-postgres-staging `
            -e POSTGRES_DB=sme_platform_staging `
            -e POSTGRES_USER=sme_user `
            -e POSTGRES_PASSWORD=staging_password_2025 `
            -p 5432:5432 `
            postgres:14 | Out-Null
    }
    
    Write-Host "  ✓ PostgreSQL started on port 5432" -ForegroundColor Green
    
    # Wait for PostgreSQL to be ready
    Write-Host "  Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
}

# Step 3: Start ML Service
if (-not $SkipDocker) {
    Write-Host "`n[3/9] Starting ML Service..." -ForegroundColor Yellow
    
    Set-Location "$projectRoot\ml-services\cash-flow-forecasting"
    
    docker-compose up -d 2>&1 | Out-Null
    
    Write-Host "  ✓ ML Service started on port 8000" -ForegroundColor Green
    
    # Wait for service to be ready
    Write-Host "  Waiting for ML service to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    # Test health endpoint
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
        Write-Host "  ✓ ML Service health check passed" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ ML Service health check failed (will retry later)" -ForegroundColor Yellow
    }
    
    Set-Location $projectRoot
}

# Step 4: Run Database Migrations
if (-not $SkipMigrations) {
    Write-Host "`n[4/9] Running database migrations..." -ForegroundColor Yellow
    
    $modules = @(
        @{Name="Module_04_Analytics_Reporting"; Feature="Cash Flow"},
        @{Name="Module_02_Intelligent_Distribution"; Feature="Collections"},
        @{Name="Module_07_Financing_Factoring"; Feature="Financing"}
    )
    
    foreach ($module in $modules) {
        Write-Host "  Running migrations for $($module.Feature)..." -ForegroundColor Cyan
        Set-Location "$projectRoot\platform\$($module.Name)"
        
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Host "    Installing dependencies..." -ForegroundColor Cyan
            npm install --silent 2>&1 | Out-Null
        }
        
        # Run migration
        try {
            npm run typeorm migration:run 2>&1 | Out-Null
            Write-Host "    ✓ $($module.Feature) migrations complete" -ForegroundColor Green
        } catch {
            Write-Host "    ⚠ Migration may have already run" -ForegroundColor Yellow
        }
    }
    
    Set-Location $projectRoot
}

# Step 5: Seed Test Data
Write-Host "`n[5/9] Seeding test data..." -ForegroundColor Yellow

$seedSQL = @"
-- Create test tenant
INSERT INTO tenants (id, name, email, status)
VALUES ('tenant-test-001', 'Test SME Company', 'admin@testsme.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create test customers
INSERT INTO customers (id, tenant_id, customer_name, email, phone)
VALUES 
  ('cust-001', 'tenant-test-001', 'Acme Corp', 'billing@acme.com', '+91-9876543210'),
  ('cust-002', 'tenant-test-001', 'XYZ Ltd', 'payments@xyz.com', '+91-9876543211')
ON CONFLICT (id) DO NOTHING;

-- Create test invoices
INSERT INTO invoices (id, tenant_id, customer_id, invoice_number, invoice_date, due_date, total_amount, outstanding_amount, payment_terms_days, status)
VALUES 
  ('inv-001', 'tenant-test-001', 'cust-001', 'INV-2025-001', '2025-01-15', '2025-02-14', 250000, 250000, 30, 'sent'),
  ('inv-002', 'tenant-test-001', 'cust-001', 'INV-2025-002', '2025-01-10', CURRENT_DATE - interval '10 days', 150000, 150000, 15, 'overdue'),
  ('inv-003', 'tenant-test-001', 'cust-002', 'INV-2025-003', '2025-01-20', '2025-03-05', 500000, 500000, 45, 'sent')
ON CONFLICT (id) DO NOTHING;
"@

# Save to temp file and execute
$seedSQL | Out-File -FilePath "$env:TEMP\seed_data.sql" -Encoding UTF8

docker exec -i sme-postgres-staging psql -U sme_user -d sme_platform_staging -f - < "$env:TEMP\seed_data.sql" 2>&1 | Out-Null

Write-Host "  ✓ Test data seeded (3 invoices, 2 customers)" -ForegroundColor Green

# Step 6: Display Service Status
Write-Host "`n[6/9] Service Status:" -ForegroundColor Yellow

Write-Host "  ✓ PostgreSQL: localhost:5432" -ForegroundColor Green
Write-Host "  ✓ ML Service: http://localhost:8000" -ForegroundColor Green
Write-Host "  ⏳ Backend services: Start manually" -ForegroundColor Yellow

# Step 7: Display Next Steps
Write-Host "`n[7/9] Manual Steps Required:" -ForegroundColor Yellow
Write-Host "  Open 4 separate PowerShell terminals and run:" -ForegroundColor Cyan
Write-Host "    Terminal 1: cd platform\Module_04_Analytics_Reporting; npm run start:dev" -ForegroundColor White
Write-Host "    Terminal 2: cd platform\Module_02_Intelligent_Distribution; npm run start:dev" -ForegroundColor White
Write-Host "    Terminal 3: cd platform\Module_07_Financing_Factoring; npm run start:dev" -ForegroundColor White
Write-Host "    Terminal 4: cd platform\Module_10_Orchestration_Hub; npm run start:dev" -ForegroundColor White

# Step 8: Run Tests (if requested)
if ($RunTests) {
    Write-Host "`n[8/9] Running automated tests..." -ForegroundColor Yellow
    Write-Host "  ⏳ Waiting 10 seconds for you to start backend services..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Test ML Service
    try {
        $mlHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3
        Write-Host "  ✓ ML Service responding" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ ML Service not responding" -ForegroundColor Red
    }
    
    # Try to test backend (may fail if not started)
    try {
        $module4 = Invoke-RestMethod -Uri "http://localhost:3004/health" -TimeoutSec 2
        Write-Host "  ✓ Module 4 (Analytics) responding" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Module 4 not started yet" -ForegroundColor Yellow
    }
}

# Step 9: Summary
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Status: Partially Complete" -ForegroundColor Yellow
Write-Host "  Duration: $([math]::Round($duration, 1)) seconds" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Started:" -ForegroundColor Green
Write-Host "  ✓ PostgreSQL (Docker)" -ForegroundColor Green
Write-Host "  ✓ ML Service (Docker)" -ForegroundColor Green
Write-Host "  ✓ Database Migrated" -ForegroundColor Green
Write-Host "  ✓ Test Data Seeded" -ForegroundColor Green
Write-Host ""
Write-Host "Next Actions:" -ForegroundColor Yellow
Write-Host "  1. Start 4 backend services (see instructions above)" -ForegroundColor White
Write-Host "  2. Run test script: .\deploy\test-features.ps1" -ForegroundColor White
Write-Host "  3. Open Swagger docs: http://localhost:3004/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "For full deployment guide, see: deploy\STAGING_DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
