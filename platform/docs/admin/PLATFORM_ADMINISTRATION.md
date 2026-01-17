# Platform Administration - Admin Guide

## 🎯 Overview

This guide covers platform administration tasks including user management, tenant management, system configuration, and monitoring.

**Target Audience**: System Administrators, Platform Managers

---

## 👥 User Management

### Creating Users

1. Navigate to **Administration** dashboard
2. Click **+ Add User**
3. Enter user details:
   - Full name
   - Email address
   - Role (Admin, Manager, User)
   - Department
   - Phone number
4. Set initial password or send invitation
5. Assign permissions
6. Click **Create User**

### User Roles

**Admin**:
- Full system access
- User management
- System configuration
- All module access

**Manager**:
- Team management
- Report access
- Module access (configurable)
- Limited system settings

**User**:
- Core module access
- Own data only
- No administrative functions

### Managing Users

**Edit User**:
1. Find user in list
2. Click **Edit**
3. Update information
4. Save changes

**Deactivate User**:
1. Open user profile
2. Click **Deactivate**
3. Confirm action
4. User cannot login (data preserved)

**Reset Password**:
1. Open user profile
2. Click **Reset Password**
3. Choose:
   - Send reset email
   - Set temporary password
4. User forced to change on next login

**Bulk Operations**:
- Import users (CSV)
- Export user list
- Bulk role assignment
- Bulk deactivation

---

## 🏢 Tenant Management

### Creating Tenants

Tenants are separate customer organizations.

1. **Administration** > **Tenants**
2. Click **+ Add Tenant**
3. Enter:
   - Company name
   - Subdomain (unique)
   - Admin email
   - Subscription plan
   - Billing details
4. Configure:
   - Feature flags
   - Usage limits
   - Brand settings
5. Activate tenant

### Tenant Configuration

**Subscription Plans**:
- Starter - Basic features, 5 users
- Professional - Advanced features, 50 users
- Enterprise - All features, unlimited users

**Feature Flags**:
- Module access controls
- API rate limits
- Storage limits
- User limits

**Branding**:
- Custom logo
- Color scheme
- Email templates
- Domain mapping

### Monitoring Tenants

**Health Metrics**:
- Active users
- API usage
- Storage usage
- Error rates
- Performance metrics

**Usage Reports**:
- Monthly active users (MAU)
- API calls per day
- Storage consumed
- Feature adoption

**Billing**:
- Current subscription
- Usage charges
- Payment status
- Invoice history

---

## ⚙️ System Configuration

### Global Settings

**Email Configuration**:
```
SMTP Settings:
- Host: smtp.sendgrid.net
- Port: 587
- TLS: Enabled
- Auth: Username/Password

Templates:
- Welcome email
- Password reset
- Invoice notification
- Payment confirmation
```

**Security Settings**:
- Session timeout (default: 1 hour)
- Password policy:
  - Min length: 8 characters
  - Require uppercase, lowercase, number, symbol
  - Expiry: 90 days
- Login attempts: 5 before lockout
- Lockout duration: 15 minutes
- MFA requirement (optional)

**Rate Limiting**:
- Global: 100 requests/15 min
- Auth endpoints: 5 requests/15 min
- API endpoints: 1000 requests/hour

**Backup Configuration**:
- Database backup: Daily at 2 AM
- Retention: 30 days
- Storage: AWS S3
- Encryption: AES-256

### Feature Flags

Control module availability:

```javascript
{
  "ENABLE_MILESTONE_WORKFLOWS": true,
  "ENABLE_INVOICE_CONCIERGE": true,
  "ENABLE_CREDIT_DECISIONING": true,
  "ENABLE_CROSS_BORDER_TRADE": false,
  "ENABLE_GLOBALIZATION": true
}
```

### API Configuration

**API Versioning**:
- Current: v1
- Deprecated: None
- Sunset policy: 6 months notice

**External Integrations**:
- Payment gateways (Razorpay, Stripe)
- Email providers (SendGrid, AWS SES)
- SMS providers (Twilio)
- Cloud storage (AWS S3, Azure Blob)

---

## 📊 Monitoring & Alerts

### System Health

**Dashboards** (Grafana):
- Application metrics
- Database performance
- API response times
- Error rates
- User activity

**Key Metrics to Watch**:
- Response time > 200ms (warning)
- Error rate > 1% (critical)
- Database connections > 80% (warning)
- Disk usage > 85% (warning)
- Memory usage > 90% (critical)

### Alert Configuration

**Email Alerts**:
- System errors
- Performance degradation
- Security incidents
- Backup failures

**Slack Alerts** (if configured):
- Critical errors
- Deployment notifications
- Security events

### Log Management

**Access Logs**:
- Location: `/var/log/sme-platform/access.log`
- Rotation: Daily
- Retention: 30 days

**Application Logs**:
- Location: `/var/log/sme-platform/app.log`
- Levels: ERROR, WARN, INFO, DEBUG
- Rotation: Daily, 100MB max
- Retention: 30 days

**Audit Logs**:
- All admin actions
- User management
- System configuration changes
- Immutable, encrypted
- Retention: 7 years (compliance)

**Log Analysis** (Kibana):
- Search logs
- Create visualizations
- Set up alerts
- Download logs

---

## 🔒 Security Administration

### Access Control

**IP Whitelisting**:
1. **Security** > **IP Whitelist**
2. Add allowed IP ranges
3. Save and test

**API Key Management**:
- Generate API keys
- Set expiration
- Revoke keys
- Monitor usage

**Session Management**:
- View active sessions
- Force logout users
- Set session limits
- Configure timeout

### Security Audits

**Regular Tasks**:
- Review user access weekly
- Check failed login attempts
- Review API usage patterns
- Verify backup completion

**Quarterly Tasks**:
- Rotate secrets (JWT, DB passwords)
- Review role permissions
- Update security policies
- Conduct penetration testing

### Incident Response

**Security Incident Procedure**:
1. **Detect**: Monitor alerts, logs
2. **Contain**: Isolate affected systems
3. **Investigate**: Determine scope
4. **Remediate**: Fix vulnerability
5. **Document**: Create incident report
6. **Review**: Update procedures

**Emergency Contacts**:
- Security team: security@company.com
- On-call engineer: +1-XXX-XXX-XXXX
- Incident channel: #security-incidents (Slack)

---

## 🔧 Maintenance Tasks

### Daily
- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Monitor API usage

### Weekly
- [ ] Review user access
- [ ] Check disk usage
- [ ] Review failed login attempts
- [ ] Update documentation

### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning
- [ ] Update disaster recovery plan

### Quarterly
- [ ] Rotate secrets
- [ ] Review and update policies
- [ ] Penetration testing
- [ ] Disaster recovery drill

---

## 🚨 Emergency Procedures

### System Down

1. Check health dashboard
2. Review recent deployments
3. Check error logs
4. Restart affected services:
   ```bash
   docker-compose restart backend
   # OR
   pm2 restart all
   ```
5. If persists, rollback deployment
6. Notify users via status page

### Database Issues

1. Check database connectivity
2. Review slow query log
3. Check disk space
4. Restart database (last resort)
5. Restore from backup if corrupted

### Security Breach

1. **IMMEDIATELY**: Isolate affected systems
2. Rotate all secrets
3. Force logout all users
4. Review logs for unauthorized access
5. Notify security team
6. Document incident
7. Implement fixes
8. Notify affected users (if data exposed)

---

## 📞 Support Escalation

**Level 1** (User Support):
- support@company.com
- Response: 4 hours
- Handles: User questions, basic issues

**Level 2** (Technical Support):
- tech-support@company.com
- Response: 1 hour
- Handles: System issues, bugs

**Level 3** (Engineering):
- engineering@company.com
- Response: 30 minutes
- Handles: Critical system failures, security incidents

**Emergency** (On-Call):
- Call: +1-XXX-XXX-XXXX
- Response: Immediate
- For: System outages, security breaches

---

*Platform Administration Guide v1.0*  
*Last Updated: December 14, 2025*  
*Classification: Internal Use Only*
