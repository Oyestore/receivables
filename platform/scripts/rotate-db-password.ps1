# Database Password Rotation Script
# Rotates database password with zero-downtime strategy

param(
    [Parameter(Mandatory = $false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory = $false)]
    [string]$Environment = "local",
    
    [Parameter(Mandatory = $false)]
    [string]$PostgresAdminUser = "postgres"
)

Write-Host "🔄 SME Platform - Database Password Rotation" -ForegroundColor Cyan
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
    Write-Host "❌ Error: $envFile not found" -ForegroundColor Red
    exit 1
}

# Read current config
$currentUser = ""
$currentPassword = ""
$dbHost = "localhost"
$dbPort = "5432"
$dbName = ""

Get-Content $envPath | ForEach-Object {
    if ($_ -match "^DATABASE_USERNAME=(.+)$") { $currentUser = $matches[1] }
    if ($_ -match "^DATABASE_PASSWORD=(.+)$") { $currentPassword = $matches[1] }
    if ($_ -match "^DATABASE_HOST=(.+)$") { $dbHost = $matches[1] }
    if ($_ -match "^DATABASE_PORT=(.+)$") { $dbPort = $matches[1] }
    if ($_ -match "^DATABASE_NAME=(.+)$") { $dbName = $matches[1] }
}

if ([string]::IsNullOrEmpty($currentUser) -or [string]::IsNullOrEmpty($currentPassword)) {
    Write-Host "❌ Error: Database credentials not found in $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Current configuration loaded" -ForegroundColor Green
Write-Host "   User: $currentUser" -ForegroundColor Gray
Write-Host "   Host: $dbHost" -ForegroundColor Gray
Write-Host "   Port: $dbPort" -ForegroundColor Gray
Write-Host "   Database: $dbName" -ForegroundColor Gray
Write-Host ""

# Generate new password
Write-Host "🔑 Generating new database password..." -ForegroundColor Yellow
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$newPassword = [Convert]::ToBase64String($bytes)

Write-Host "✅ New password generated" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN - Showing what would happen:" -ForegroundColor Magenta
    Write-Host "1. Create temporary user: ${currentUser}_new" -ForegroundColor Gray
    Write-Host "2. Grant same permissions as $currentUser" -ForegroundColor Gray
    Write-Host "3. Test connection with new credentials" -ForegroundColor Gray
    Write-Host "4. Update $envFile" -ForegroundColor Gray
    Write-Host "5. Restart application" -ForegroundColor Gray
    Write-Host "6. Drop old user: $currentUser" -ForegroundColor Gray
    Write-Host "7. Rename ${currentUser}_new to $currentUser" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  Run without -DryRun flag to apply changes" -ForegroundColor Yellow
    exit 0
}

# Confirm action
Write-Host "⚠️  WARNING: This action will:" -ForegroundColor Yellow
Write-Host "   - Create new database user with new password" -ForegroundColor Yellow
Write-Host "   - Update $envFile" -ForegroundColor Yellow
Write-Host "   - Require application restart" -ForegroundColor Yellow
Write-Host "   - Brief connection interruption possible" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Rotation cancelled by user" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Starting rotation process..." -ForegroundColor Cyan

# Create SQL script for rotation
$tempUser = "${currentUser}_new"
$sqlScript = @"
-- Create new user with new password
CREATE USER $tempUser WITH PASSWORD '$newPassword';

-- Grant same permissions as original user
GRANT ALL PRIVILEGES ON DATABASE $dbName TO $tempUser;

-- Grant schema permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO $tempUser;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $tempUser;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO $tempUser;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO $tempUser;
GRANT CREATE ON SCHEMA public TO $tempUser;
"@

$sqlPath = Join-Path -Path $PSScriptRoot -ChildPath "temp_rotation.sql"
$sqlScript | Out-File -FilePath $sqlPath -Encoding UTF8

Write-Host "✅ SQL script created" -ForegroundColor Green

# Execute SQL (would need psql or PostgreSQL .NET driver)
Write-Host "📝 SQL commands to execute manually:" -ForegroundColor Yellow
Write-Host $sqlScript -ForegroundColor Gray
Write-Host ""
Write-Host "Run: psql -U $PostgresAdminUser -d $dbName -f $sqlPath" -ForegroundColor Cyan
Write-Host ""

# Backup .env
$backupPath = "$envPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $envPath $backupPath
Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green

# Update .env with new credentials
$content = Get-Content $envPath
$newContent = $content | ForEach-Object {
    if ($_ -match "^DATABASE_USERNAME=") {
        "DATABASE_USERNAME=$tempUser"
    }
    elseif ($_ -match "^DATABASE_PASSWORD=") {
        "DATABASE_PASSWORD=$newPassword"
    }
    else {
        $_
    }
}

$newContent | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "✅ $envFile updated" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Database password rotation prepared!" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Manual steps required:" -ForegroundColor Cyan
Write-Host "1. Execute SQL commands shown above" -ForegroundColor White
Write-Host "   psql -U $PostgresAdminUser -d $dbName -f $sqlPath" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test connection with new credentials:" -ForegroundColor White
Write-Host "   psql -U $tempUser -d $dbName" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Restart application" -ForegroundColor White
Write-Host "   pm2 reload all" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verify application works" -ForegroundColor White
Write-Host ""
Write-Host "5. After verification, drop old user and rename:" -ForegroundColor White
Write-Host "   DROP USER $currentUser;" -ForegroundColor Gray
Write-Host "   ALTER USER $tempUser RENAME TO $currentUser;" -ForegroundColor Gray
Write-Host "   Then update .env to use $currentUser" -ForegroundColor Gray
Write-Host ""

Write-Host "🔙 Rollback:" -ForegroundColor Yellow
Write-Host "Copy-Item $backupPath $envPath -Force" -ForegroundColor Gray
Write-Host "Then drop the new user: DROP USER $tempUser;" -ForegroundColor Gray

# Cleanup
Remove-Item $sqlPath -ErrorAction SilentlyContinue
