# Backup & Restore Guide

## 🎯 Overview

This guide covers backup and restoration procedures for the SME Receivable Platform.

**Critical Data**:
- PostgreSQL database
- Redis cache (optional)
- Uploaded files/documents
- Configuration files

---

## 📦 Backup Strategy

### Automated Backups

**Schedule**:
- **Database**: Daily at 2:00 AM UTC
- **Files**: Daily at 3:00 AM UTC
-  **Configuration**: On every change

**Retention**:
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

**Storage**:
- Primary: AWS S3 / Azure Blob
- Secondary: Local disk (7 days)
- Encryption: AES-256

---

## 💾 Database Backup

### Manual Backup (PostgreSQL)

**Full Backup**:
```bash
# Using pg_dump
pg_dump -U postgres -h localhost -d sme_platform_db > backup_$(date +%Y%m%d_%H%M%S).sql

# With compression
pg_dump -U postgres -h localhost -d sme_platform_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Docker environment
docker exec sme-postgres pg_dump -U sme_user sme_platform_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Specific Tables**:
```bash
# Backup only specific tables
pg_dump -U postgres -d sme_platform_db -t invoices -t payments > partial_backup.sql
```

**Schema Only**:
```bash
# Backup structure without data
pg_dump -U postgres -d sme_platform_db --schema-only > schema_backup.sql
```

### Automated Backup Script

**PowerShell** (`scripts/backup-database.ps1`):
```powershell
# Database Backup Script
param(
    [string]$BackupDir = "C:\backups\sme-platform",
    [int]$RetentionDays = 30
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "db_backup_$timestamp.sql"

# Create backup directory
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Backup database
Write-Host "Creating backup: $backupFile"
docker exec sme-postgres pg_dump -U sme_user sme_platform_db > $backupFile

# Compress
Write-Host "Compressing backup..."
Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
Remove-Item $backupFile

# Upload to cloud (optional)
# aws s3 cp "$backupFile.zip" s3://sme-backups/database/

# Cleanup old backups
Write-Host "Cleaning up backups older than $RetentionDays days"
Get-ChildItem $BackupDir -Filter "db_backup_*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    Remove-Item -Force

Write-Host "Backup complete: $backupFile.zip"
```

**Linux/Mac** (`scripts/backup-database.sh`):
```bash
#!/bin/bash

BACKUP_DIR="/backups/sme-platform"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup
echo "Creating backup: $BACKUP_FILE"
docker exec sme-postgres pg_dump -U sme_user sme_platform_db > $BACKUP_FILE

# Compress
echo "Compressing..."
gzip $BACKUP_FILE

# Upload to S3 (optional)
# aws s3 cp $BACKUP_FILE.gz s3://sme-backups/database/

# Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $BACKUP_FILE.gz"
```

**Schedule with Cron** (Linux):
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/sme-backup.log 2>&1
```

**Schedule with Task Scheduler** (Windows):
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument '-File C:\path\to\backup-database.ps1'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "SME Database Backup" -Description "Daily backup"
```

---

## 🔄 Database Restore

### From Backup File

**Full Restore**:
```bash
# Stop application first
docker-compose stop backend

# Drop and recreate database
docker exec -it sme-postgres psql -U postgres -c "DROP DATABASE sme_platform_db;"
docker exec -it sme-postgres psql -U postgres -c "CREATE DATABASE sme_platform_db OWNER sme_user;"

# Restore from backup
docker exec -i sme-postgres psql -U sme_user -d sme_platform_db < backup_20241214_020000.sql

# OR from compressed backup
gunzip -c backup_20241214_020000.sql.gz | docker exec -i sme-postgres psql -U sme_user -d sme_platform_db

# Restart application
docker-compose start backend
```

**Restore Specific Tables**:
```bash
# Restore only specific tables
pg_restore -U sme_user -d sme_platform_db -t invoices -t payments partial_backup.sql
```

### Point-in-Time Recovery

Enable WAL archiving for point-in-time recovery:

**postgresql.conf**:
```
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'
```

**Recovery**:
```bash
# Stop PostgreSQL
docker-compose stop postgres

# Restore base backup
# ... restore from backup ...

# Create recovery.conf
cat > recovery.conf << EOF
restore_command = 'cp /backups/wal/%f %p'
recovery_target_time = '2024-12-14 10:30:00'
EOF

# Start PostgreSQL (will recover to target time)
docker-compose start postgres
```

---

## 📁 File Backup

### Uploaded Documents

**Backup Location**: Storage service (AWS S3, Azure Blob)

**Manual Sync**:
```bash
# AWS S3
aws s3 sync /app/uploads s3://sme-platform-files/backups/$(date +%Y%m%d) --storage-class GLACIER

# Azure Blob
azcopy sync "/app/uploads" "https://smeplatform.blob.core.windows.net/backups/$(date +%Y%m%d)"

# Local backup
rsync -av /app/uploads/ /backups/files/$(date +%Y%m%d)/
```

### Configuration Files

**Backup Critical Config**:
```bash
# Create config backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
    .env \
    docker-compose.yml \
    monitoring/prometheus.yml \
    k8s/*.yaml

# Upload to S3
aws s3 cp config_backup_$(date +%Y%m%d).tar.gz s3://sme-backups/config/
```

**⚠️ Security Warning**: Ensure config backups are encrypted (they contain secrets)

---

## 🔐 Redis Backup (Optional)

### Manual Backup

```bash
# Create RDB snapshot
docker exec sme-redis redis-cli BGSAVE

# Copy RDB file
docker cp sme-redis:/data/dump.rdb redis_backup_$(date +%Y%m%d).rdb
```

### Restore Redis

```bash
# Stop Redis
docker-compose stop redis

# Copy backup to Redis data directory
docker cp redis_backup_20241214.rdb sme-redis:/data/dump.rdb

# Start Redis
docker-compose start redis
```

**Note**: Redis is cache-only, not critical for restore unless using for sessions.

---

## ✅ Backup Verification

### Test Restores

**Monthly Test**:
```bash
# 1. Create test environment
docker-compose -f docker-compose.test.yml up -d

# 2. Restore latest backup
gunzip -c latest_backup.sql.gz | docker exec -i test-postgres psql -U sme_user -d test_db

# 3. Verify data integrity
docker exec test-postgres psql -U sme_user -d test_db -c "SELECT COUNT(*) FROM invoices;"

# 4. Run smoke tests
npm run test:smoke --env=test

# 5. Cleanup
docker-compose -f docker-compose.test.yml down -v
```

### Backup Health Checks

**Check Last Backup**:
```bash
# List recent backups
ls -lth /backups/sme-platform/db_backup_*.sql.gz | head -5

# Check backup size
du -h /backups/sme-platform/db_backup_$(date +%Y%m%d)*.sql.gz
```

**Validate Backup**:
```bash
# Test if backup file is valid
gunzip -t backup_file.sql.gz

# Check SQL syntax (dry run)
docker exec -i sme-postgres psql -U postgres -d postgres --single-transaction -v ON_ERROR_STOP=1 -f /dev/null < backup_file.sql
```

---

## 🚨 Disaster Recovery

### Recovery Time Objective (RTO): 4 hours  
### Recovery Point Objective (RPO): 24 hours

### Disaster Recovery Steps

**1. Assess Damage**:
- Identify what is lost
- Determine last known good state
- Check backup availability

**2. Prepare Environment**:
```bash
# Provision new infrastructure (if needed)
# Setup new servers/containers

# Install dependencies
docker-compose up -d postgres redis
```

**3. Restore Database**:
```bash
# Download latest backup from S3
aws s3 cp s3://sme-backups/database/db_backup_latest.sql.gz .

# Restore
gunzip -c db_backup_latest.sql.gz | docker exec -i sme-postgres psql -U sme_user -d sme_platform_db
```

**4. Restore Files**:
```bash
# Sync files from S3
aws s3 sync s3://sme-platform-files/backups/latest /app/uploads
```

**5. Restore Configuration**:
```bash
# Download config
aws s3 cp s3://sme-backups/config/config_backup_latest.tar.gz .

# Extract
tar -xzf config_backup_latest.tar.gz
```

**6. Verify & Start**:
```bash
# Run migrations (if needed)
npm run migration:run

# Start services
docker-compose up -d

# Run smoke tests
npm run test:smoke

# Monitor logs
docker-compose logs -f
```

**7. Notify Stakeholders**:
- Update status page
- Email users
- Document incident

---

## 📊 Monitoring Backups

### Backup Alerts

**Set up monitoring for**:
- Backup completion status
- Backup file size (detect corruption)
- Backup age (ensure running)
- Storage space

**Example with Prometheus**:
```yaml
# Alert if backup older than 25 hours
- alert: BackupTooOld
  expr: time() - backup_last_success_timestamp > 90000
  annotations:
    summary: "Database backup is {{ $value | humanizeDuration }} old"
```

---

## 📞 Support

**Backup Issues**: backup-support@smeplatform.com  
**Emergency Restore**: +1-XXX-XXX-XXXX (24/7)

---

*Backup & Restore Guide v1.0*  
*Last Updated: December 14, 2025*  
*Review: Quarterly*
