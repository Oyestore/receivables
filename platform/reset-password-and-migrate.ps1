# PostgreSQL Password Reset and Migration Script
# Run this script to reset password and execute all migrations

Write-Host "🔐 PostgreSQL Password Reset & Migration Script" -ForegroundColor Cyan
Write-Host ""

# Step 1: Find PostgreSQL installation
Write-Host "📍 Step 1: Locating PostgreSQL..." -ForegroundColor Yellow
$pgPath = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1

if ($pgPath) {
    Write-Host "✅ Found PostgreSQL at: $($pgPath.FullName)" -ForegroundColor Green
    $psqlPath = Join-Path $pgPath.FullName "bin\psql.exe"
    
    if (Test-Path $psqlPath) {
        Write-Host "✅ psql.exe located" -ForegroundColor Green
        
        # Step 2: Reset password
        Write-Host ""
        Write-Host "🔐 Step 2: Resetting PostgreSQL password..." -ForegroundColor Yellow
        Write-Host "New password will be: SMEPlatform2025!" -ForegroundColor Cyan
        
        $env:PGPASSWORD = ""  # Try empty password first
        $resetCmd = "ALTER USER postgres WITH PASSWORD 'SMEPlatform2025!';"
        & $psqlPath -U postgres -c $resetCmd 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Password reset successful!" -ForegroundColor Green
            
            # Update .env file
            Write-Host ""
            Write-Host "📝 Step 3: Updating .env file..." -ForegroundColor Yellow
            $envPath = ".env"
            $envContent = Get-Content $envPath -Raw
            $envContent = $envContent -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=SMEPlatform2025!'
            Set-Content $envPath $envContent
            Write-Host "✅ .env file updated" -ForegroundColor Green
            
            # Run migrations
            Write-Host ""
            Write-Host "🚀 Step 4: Running all migrations..." -ForegroundColor Yellow
            npx ts-node run-all-migrations.ts
            
        }
        else {
            Write-Host "❌ Password reset failed" -ForegroundColor Red
            Write-Host ""
            Write-Host "💡 Alternative: Use pgAdmin to reset password" -ForegroundColor Yellow
            Write-Host "   1. Open pgAdmin" -ForegroundColor White
            Write-Host "   2. Connect to localhost (it may not ask for password)" -ForegroundColor White
            Write-Host "   3. Right-click 'postgres' user → Properties → Definition" -ForegroundColor White
            Write-Host "   4. Set password to: SMEPlatform2025!" -ForegroundColor White
            Write-Host "   5. Run: npx ts-node run-all-migrations.ts" -ForegroundColor White
        }
        
    }
    else {
        Write-Host "❌ psql.exe not found in bin directory" -ForegroundColor Red
    }
}
else {
    Write-Host "❌ PostgreSQL not found in C:\Program Files\PostgreSQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Manual Steps:" -ForegroundColor Yellow
    Write-Host "   1. Find your PostgreSQL installation directory" -ForegroundColor White
    Write-Host "   2. Open pgAdmin" -ForegroundColor White
    Write-Host "   3. Connect to localhost" -ForegroundColor White
    Write-Host "   4. Right-click 'postgres' user → Properties → Definition" -ForegroundColor White
    Write-Host "   5. Set password to: SMEPlatform2025!" -ForegroundColor White
    Write-Host "   6. Update .env: DB_PASSWORD=SMEPlatform2025!" -ForegroundColor White
    Write-Host "   7. Run: npx ts-node run-all-migrations.ts" -ForegroundColor White
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
