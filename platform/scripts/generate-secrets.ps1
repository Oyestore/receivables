# Secret Generation Script
# Generates secure random secrets for local development and production

param(
    [Parameter(Mandatory = $false)]
    [string]$Environment = "local"
)

Write-Host "🔑 SME Platform - Secret Generation" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Function to generate random secret
function Generate-Secret {
    param([int]$Length)
    
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    return $secret
}

# Generate secrets
Write-Host "Generating secrets..." -ForegroundColor Green

$jwtSecret = Generate-Secret -Length 64
$dbPassword = Generate-Secret -Length 32
$redisPassword = Generate-Secret -Length 24
$encryptionKey = Generate-Secret -Length 32

Write-Host "✅ JWT_SECRET (64 bytes):" -ForegroundColor Green
Write-Host $jwtSecret -ForegroundColor White
Write-Host ""

Write-Host "✅ DATABASE_PASSWORD (32 bytes):" -ForegroundColor Green
Write-Host $dbPassword -ForegroundColor White
Write-Host ""

Write-Host "✅ REDIS_PASSWORD (24 bytes):" -ForegroundColor Green
Write-Host $redisPassword -ForegroundColor White
Write-Host ""

Write-Host "✅ ENCRYPTION_KEY (32 bytes):" -ForegroundColor Green
Write-Host $encryptionKey -ForegroundColor White
Write-Host ""

# Create .env file template
$envFile = if ($Environment -eq "production") { ".env.production" } 
elseif ($Environment -eq "test") { ".env.test" }
else { ".env.local" }

$envContent = @"
# SME Platform - Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Environment: $Environment
# ⚠️ DO NOT COMMIT THIS FILE ⚠️

# Application
NODE_ENV=$Environment
PORT=4000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=sme_user
DATABASE_PASSWORD=$dbPassword
DATABASE_NAME=sme_platform_db

# JWT Configuration
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$redisPassword
REDIS_TLS=false

# Encryption
ENCRYPTION_KEY=$encryptionKey
ENCRYPTION_ALGORITHM=aes-256-gcm

# API Configuration
API_PREFIX=api
CORS_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=noreply@smeplatform.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_token_here
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token

# Payment Gateway
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Cloud Storage
CLOUD_STORAGE_PROVIDER=aws
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=sme-platform-storage

# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=sme_analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_clickhouse_password

# Logging
LOG_LEVEL=info
DEBUG=false

# Feature Flags
ENABLE_MILESTONE_WORKFLOWS=true
ENABLE_INVOICE_CONCIERGE=true
ENABLE_CREDIT_DECISIONING=true
"@

# Save to file
$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\$envFile"
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "📝 Environment file created: $envFile" -ForegroundColor Cyan
Write-Host "Path: $envPath" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  IMPORTANT SECURITY NOTES:" -ForegroundColor Yellow
Write-Host "1. Store these secrets securely (password manager)" -ForegroundColor Yellow
Write-Host "2. Never commit .env files to version control" -ForegroundColor Yellow
Write-Host "3. Rotate secrets every 90 days" -ForegroundColor Yellow
Write-Host "4. Use different secrets for each environment" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Secret generation complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review $envFile and update external API keys" -ForegroundColor White
Write-Host "2. Restart application to load new secrets" -ForegroundColor White
Write-Host "3. Test authentication and database connectivity" -ForegroundColor White
