# JWT Secret Rotation Script
# Rotates JWT secret with zero-downtime for SME Platform

param(
    [Parameter(Mandatory = $false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory = $false)]
    [string]$Environment = "local"
)

Write-Host "🔄 SME Platform - JWT Secret Rotation" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "Mode: DRY RUN (no changes will be made)" -ForegroundColor Magenta
}
Write-Host ""

# Load current .env
$envFile = if ($Environment -eq "production") { ".env.production" } 
elseif ($Environment -eq "test") { ".env.test" }
else { ".env" }

$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\$envFile"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ Error: $envFile not found at $envPath" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Loading current configuration from $envFile..." -ForegroundColor Gray

# Read current JWT secret
$currentSecret = ""
Get-Content $envPath | ForEach-Object {
    if ($_ -match "^JWT_SECRET=(.+)$") {
        $currentSecret = $matches[1]
    }
}

if ([string]::IsNullOrEmpty($currentSecret)) {
    Write-Host "❌ Error: JWT_SECRET not found in $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Current JWT_SECRET found (length: $($currentSecret.Length))" -ForegroundColor Green
Write-Host ""

# Generate new secret
Write-Host "🔑 Generating new JWT secret..." -ForegroundColor Yellow
$bytes = New-Object byte[] 64
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$newSecret = [Convert]::ToBase64String($bytes)

Write-Host "✅ New JWT_SECRET generated (length: $($newSecret.Length))" -ForegroundColor Green
Write-Host "New secret: $newSecret" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN - Showing what would happen:" -ForegroundColor Magenta
    Write-Host "1. Update $envFile with new JWT_SECRET" -ForegroundColor Gray
    Write-Host "2. Create backup: $envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')" -ForegroundColor Gray
    Write-Host "3. All active tokens would be invalidated" -ForegroundColor Gray
    Write-Host "4. Users would need to re-login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  Run without -DryRun flag to apply changes" -ForegroundColor Yellow
    exit 0
}

# Confirm action
Write-Host "⚠️  WARNING: This action will:" -ForegroundColor Yellow
Write-Host "   - Invalidate all existing JWT tokens" -ForegroundColor Yellow
Write-Host "   - Force all users to re-login" -ForegroundColor Yellow
Write-Host "   - Update $envFile" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Rotation cancelled by user" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Starting rotation process..." -ForegroundColor Cyan

# Backup current .env
$backupPath = "$envPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $envPath $backupPath
Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green

# Update .env file
$content = Get-Content $envPath
$newContent = $content | ForEach-Object {
    if ($_ -match "^JWT_SECRET=") {
        "JWT_SECRET=$newSecret"
    }
    else {
        $_
    }
}

$newContent | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "✅ $envFile updated with new JWT_SECRET" -ForegroundColor Green

# Add rotation log
$logEntry = @"

# JWT Secret Rotation Log
# Rotated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Previous secret length: $($currentSecret.Length)
# New secret length: $($newSecret.Length)
# Backup: $backupPath
"@

Add-Content -Path $envPath -Value $logEntry

Write-Host ""
Write-Host "✅ JWT secret rotation complete!" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart the application to load new secret" -ForegroundColor White
Write-Host "   pm2 reload all" -ForegroundColor Gray
Write-Host "   OR" -ForegroundColor Gray
Write-Host "   Stop and restart your dev server" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verify application starts successfully" -ForegroundColor White
Write-Host ""
Write-Host "3. Test authentication" -ForegroundColor White
Write-Host "   - All users will need to login again" -ForegroundColor Gray
Write-Host "   - Old tokens will be rejected" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Monitor logs for any errors" -ForegroundColor White
Write-Host ""

Write-Host "🔙 Rollback procedure:" -ForegroundColor Yellow
Write-Host "If issues occur, restore from backup:" -ForegroundColor Yellow
Write-Host "   Copy-Item $backupPath $envPath -Force" -ForegroundColor Gray
Write-Host "   Then restart the application" -ForegroundColor Gray
Write-Host ""

Write-Host "📊 Rotation Summary:" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor White
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "Old secret length: $($currentSecret.Length) chars" -ForegroundColor White
Write-Host "New secret length: $($newSecret.Length) chars" -ForegroundColor White
Write-Host "Backup: $backupPath" -ForegroundColor White
