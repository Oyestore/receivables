# Secret Rotation Guide

## 🔒 Overview

This guide provides procedures for rotating sensitive secrets in the SME Receivable Platform. Regular secret rotation is a critical security practice.

**Rotation Schedule**:
- **JWT_SECRET**: Every 90 days
- **DATABASE_PASSWORD**: Every 90 days  
- **API_KEYS**: Every 180 days
- **After Security Incident**: Immediately

---

## 🚨 **CRITICAL: Pre-Rotation Checklist**

Before rotating secrets:
- [ ] Notify team members
- [ ] Schedule maintenance window
- [ ] Backup current configuration
- [ ] Test rollback plan
- [ ] Have monitoring ready

---

## 🔑 **1. JWT_SECRET Rotation**

### Impact
- **High**: All users will be logged out
- **Downtime**: None (if done correctly)
- **User Action Required**: Re-login

### Procedure

**Step 1: Generate New Secret**
```bash
# Generate strong random secret (64 bytes base64 encoded)
openssl rand -base64 64

# Example output:
# xK7mP3nQ9vR2wS5tU8xA1yB4zC6dE9fG2hI5jK8lM1nO4pQ7rS0tU3vW6xY9zA2bC5dE8fG1hI4jK7lM0nO3pQ6r==
```

**Step 2: Update Environment Variable**
```bash
# Edit .env file (DO NOT COMMIT!)
nano /path/to/.env

# Update JWT_SECRET with new value
JWT_SECRET=xK7mP3nQ9vR2wS5tU8xA1yB4zC6dE9fG2hI5jK8lM1nO4pQ7rS0tU3vW6xY9zA2bC5dE8fG1hI4jK7lM0nO3pQ6r==
```

**Step 3: Rolling Restart (Zero Downtime)**

```bash
# Option A: Using PM2
pm2 reload all

# Option B: Using Kubernetes
kubectl rollout restart deployment/sme-platform-backend
kubectl rollout status deployment/sme-platform-backend

# Option C: Manual (Blue-Green)
# Start new instances with new secret
# Wait for health checks
# Stop old instances
```

**Step 4: Verify**
```bash
# Test login endpoint
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Should return new JWT token
```

**Step 5: Monitor**
- Check error rates for 1 hour
- Monitor login success rate
- Watch for authentication failures

---

## 🗄️ **2. DATABASE_PASSWORD Rotation**

### Impact
- **Critical**: Database connection required
- **Downtime**: < 5 minutes (with proper procedure)
- **User Action Required**: None

### Procedure

**Step 1: Generate New Password**
```bash
# Generate strong password (32 bytes)
openssl rand -base64 32

# Example: 7kR3mN9pQ2sT5vW8xY1zA4bC6dE9fG2hI5jK8lM0==
```

**Step 2: Update Database User** CREATE Alternative User First

```sql
-- Connect to PostgreSQL as admin
psql -U postgres

-- Create new user with new password (temporary)
CREATE USER sme_db_user_new WITH PASSWORD '7kR3mN9pQ2sT5vW8xY1zA4bC6dE9fG2hI5jK8lM0==';

-- Grant same permissions
GRANT ALL PRIVILEGES ON DATABASE sme_platform_db TO sme_db_user_new;
GRANT ALL ON ALL TABLES IN SCHEMA public TO sme_db_user_new;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO sme_db_user_new;
```

**Step 3: Test New Credentials**
```bash
# Test connection with new credentials
psql -U sme_db_user_new -d sme_platform_db -W

# If successful, proceed
```

**Step 4: Update Application Configuration**
```bash
# Update .env file
DATABASE_USERNAME=sme_db_user_new
DATABASE_PASSWORD=7kR3mN9pQ2sT5vW8xY1zA4bC6dE9fG2hI5jK8lM0==
```

**Step 5: Rolling Restart**
```bash
# Restart backend services
pm2 reload sme-platform-backend

# OR for Kubernetes
kubectl rollout restart deployment/sme-platform-backend
```

**Step 6: Verify & Cleanup**
```bash
# Check application logs
pm2 logs sme-platform-backend --lines 50

# If all good, drop old user
psql -U postgres -c "DROP USER sme_db_user;"
```

---

## 🔐 **3. Redis Password Rotation**

### Procedure

**Step 1: Generate New Password**
```bash
openssl rand -base64 32
```

**Step 2: Update Redis Configuration**
```bash
# Edit redis.conf
requirepass NEW_PASSWORD_HERE

# Restart Redis
sudo systemctl restart redis
```

**Step 3: Update Application**
```bash
# Update .env
REDIS_PASSWORD=NEW_PASSWORD_HERE

# Restart backend
pm2 reload all
```

---

## 🌐 **4. Third-Party API Keys Rotation**

### SendGrid API Key

```bash
# 1. Generate new key in Send Grid dashboard
# 2. Update .env
SENDGRID_API_KEY=SG.new_key_here

# 3. Test
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer SG.new_key_here" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@test.com"}]}],"from":{"email":"noreply@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'

# 4. Restart services
pm2 reload all

# 5. Revoke old key in SendGrid dashboard
```

### Similar process for:
- Twilio (SMS)
- WhatsApp Cloud API
- Razorpay/Stripe
- AWS/Azure

---

## 🔄 **5. Certificate Rotation (TLS/SSL)**

### Let's Encrypt (Auto-Renewal)
```bash
# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Reload web server
sudo systemctl reload nginx
```

### Manual Certificates
```bash
# Generate new certificate
openssl req -newkey rsa:4096 -nodes -keyout newkey.pem -out newcsr.pem

# After receiving new cert from CA
# Update nginx/apache configuration
# Reload web server
```

---

## ⚠️ **Emergency Rotation (Security Incident)**

If secrets are compromised:

**Immediate Actions** (Within 1 hour):
1. ✅ Rotate JWT_SECRET immediately
2. ✅ Invalidate all sessions
3. ✅ Force all users to re-login
4. ✅ Review audit logs
5. ✅ Identify breach scope

**Within 24 Hours**:
1. ✅ Rotate database passwords
2. ✅ Rotate all API keys
3. ✅ Update all service credentials
4. ✅ Notify affected users (if applicable)
5. ✅ Document incident

**Within 1 Week**:
1. ✅ Conduct security audit
2. ✅ Implement additional controls
3. ✅ Update incident response plan
4. ✅ Train team on procedures

---

## 📋 **Rotation Checklist Template**

```markdown
## Secret Rotation: [SECRET_NAME] - [DATE]

**Performed By**: _______________
**Start Time**: _______________
**End Time**: _______________

### Pre-Rotation
- [ ] Backup current configuration
- [ ] Notify team members
- [ ] Schedule maintenance window
- [ ] Prepare rollback plan

### Rotation Steps
- [ ] Generate new secret
- [ ] Test new secret (if applicable)
- [ ] Update configuration
- [ ] Rolling restart services
- [ ] Verify functionality

### Post-Rotation
- [ ] Monitor error rates (1 hour)
- [ ] Check application logs
- [ ] Verify user impact minimal
- [ ] Revoke/delete old secret
- [ ] Update documentation
- [ ] Document rotation in audit log

### Verification
- [ ] Application functional
- [ ] No error spikes
- [ ] Users can authenticate
- [ ] Database connections stable
- [ ] External integrations working  

**Status**: ✅ Success / ❌ Rolled Back
**Notes**: _______________
```

---

## 🔧 **Automation Script** (Future Enhancement)

```bash
#!/bin/bash
# secret-rotation.sh - Automated secret rotation

SECRET_TYPE=$1
ENVIRONMENT=$2

case $SECRET_TYPE in
  jwt)
    NEW_SECRET=$(openssl rand -base64 64)
    # Update vault
    # Trigger rolling restart
    ;;
  db)
    NEW_PASSWORD=$(openssl rand -base64 32)
    # Create new DB user
    # Update app config
    # Restart services
    # Drop old user
    ;;
esac
```

---

## 📊 **Audit Trail**

Keep track of all rotations:

| Date | Secret Type | Performed By | Reason | Status |
|------|-------------|-------------|---------|---------|
| 2025-01-14 | JWT_SECRET | DevOps Team | Scheduled | Success |
| 2025-01-14 | DB_PASSWORD | DevOps Team | Scheduled | Success |

---

## 🆘 **Troubleshooting**

### Issue: Service won't start after rotation
**Solution**:
1. Check environment variable syntax
2. Verify secret length/format
3. Review logs: `pm2 logs --lines 100`
4. Rollback if needed

### Issue: Database connection failed
**Solution**:
1. Test credentials: `psql -U user -W`
2. Check user permissions
3. Verify pg_hba.conf settings
4. Rollback to previous user

### Issue: Users can't login after JWT rotation
**Expected behavior** - all users logged out  
**Action**: Communicate maintenance window

---

## 📞 **Support Contacts**

- **Security Team**: security@company.com
- **DevOps Team**: devops@company.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

---

*Secret Rotation Guide v1.0*  
*Last Updated: December 14, 2025*  
*Review Schedule: Quarterly*
