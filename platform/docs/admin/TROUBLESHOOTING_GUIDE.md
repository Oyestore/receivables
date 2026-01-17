# Troubleshooting Guide

## 🔍 Overview

This guide helps diagnose and resolve common issues with the SME Receivable Platform.

---

## 🚨 Common Issues

### Login & Authentication

#### Issue: Cannot Login

**Symptoms**: Login fails with "Invalid credentials"

**Causes**:
1. Incorrect password
2. Account locked (too many failed attempts)
3. Account deactivated
4. Email not verified

**Solutions**:
```
1. Reset password:
   - Click "Forgot Password"
   - Check email for reset link
   - Create new password

2. Check account status:
   - Contact admin to verify account active
   - Admin can unlock account
   - Admin can resend verification email

3. Clear browser cache:
   - Ctrl + Shift + Delete
   - Clear cookies and cache
   - Try again

4. Try different browser:
   - Test in incognito mode
   - Try Chrome, Firefox, or Edge
```

#### Issue: "Session Expired" Message

**Solution**:
- Login again (sessions expire after 1 hour of inactivity)
- Enable "Remember Me" for longer sessions
- Check if JWT secret was rotated (all users logged out)

---

### Dashboard & UI Issues

#### Issue: Dashboard Not Loading

**Symptoms**: Blank page or loading spinner never stops

**Diagnostic Steps**:
```
1. Check browser console:
   - Press F12
   - Look for errors in Console tab
   - Common: Network errors, CORS errors

2. Check network:
   - F12 > Network tab
   - Look for failed requests (red)
   - Note the error codes

3. Verify backend running:
   - Visit http://localhost:4000/health
   - Should return {"status":"ok"}
```

**Solutions**:
```
Backend not running:
- Start backend: npm run dev
- OR: docker-compose up backend

CORS errors:
- Check ALLOWED_ORIGINS in .env
- Should include http://localhost:3000

Network timeout:
- Check internet connection
- Increase timeout in api.ts
- Check firewall settings
```

#### Issue: Data Not Updating

**Symptoms**: Changes not reflected, stale data shown

**Solutions**:
```
1. Hard refresh:
   - Ctrl + Shift + R (Windows/Linux)
   - Cmd + Shift + R (Mac)

2. Clear React Query cache:
   - Logout and login again
   - OR: Close all browser tabs
   - OR: Clear browser data

3. Check browser DevTools:
   - React Query DevTools (bottom right)
   - See cached queries
   - Click "Invalidate" to refresh
```

---

### API & Backend Issues

#### Issue: API Returning 404

**Symptoms**: "Not Found" or 404 errors in console

**Diagnostic**:
```javascript
// Check API endpoint in browser DevTools
// Example failed request:
GET http://localhost:4000/api/api/invoices  // ❌ Wrong (duplicate /api)
GET http://localhost:4000/api/invoices       // ✅ Correct
```

**Solution**:
```
1. Verify API paths in frontend/src/config/api.ts
2. Check for duplicate /api prefix
3. Verify backend routes match
4. Check API_PREFIX in backend .env
```

#### Issue: API Returning 500

**Symptoms**: Internal Server Error

**Diagnostic**:
```bash
# Check backend logs
docker-compose logs backend
# OR
npm run dev  # See errors in console
```

**Common Causes**:
1. Database connection failed
2. Missing environment variables
3. Uncaught exceptions
4. Database query errors

**Solutions**:
```
1. Check database connectivity:
   docker ps  # Verify postgres running
   
2. Verify .env file:
   - All required variables set
   - No typos in variable names
   - Secrets not empty

3. Review error stack trace in logs
4. Check database migrations ran:
   npm run migration:run
```

#### Issue: API Rate Limited

**Symptoms**: "Too Many Requests" or 429 errors

**Solution**:
```
Wait 15 minutes (rate limit window)
OR
Increase rate limits in backend (for development):
  RATE_LIMIT_MAX_REQUESTS=1000
  RATE_LIMIT_WINDOW=15
```

---

### Database Issues

#### Issue: Database Connection Failed

**Symptoms**: "Connection refused" or "ECONNREFUSED"

**Diagnostic**:
```bash
# Check if PostgreSQL running
docker ps | grep postgres

# Test connection
psql -h localhost -U sme_user -d sme_platform_db
```

**Solutions**:
```
1. Start PostgreSQL:
   docker-compose up postgres

2. Check credentials in .env:
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=sme_user
   DATABASE_PASSWORD=<your_password>
   DATABASE_NAME=sme_platform_db

3. Verify PostgreSQL port not in use:
   netstat -an | findstr :5432
```

#### Issue: Migration Failed

**Symptoms**: Errors when running migrations

**Solutions**:
```bash
# 1. Check migration status
npm run migration:show

# 2. Revert last migration
npm run migration:revert

# 3. Run migrations again
npm run migration:run

# 4. If still fails, check database logs
docker-compose logs postgres
```

---

### Payment Integration

#### Issue: Payment Not Processing

**Diagnostic Checklist**:
- [ ] Payment gateway API keys configured
- [ ] Webhook URL configured in gateway dashboard
- [ ] Network allows external API calls
- [ ] Payment gateway account active

**Solutions**:
```
1. Test API keys:
   curl -u <api_key>: https://api.gateway.com/test

2. Check webhook logs:
   - Go to payment gateway dashboard
   - View webhook deliveries
   - Check for failures

3. Verify webhook endpoint accessible:
   curl http://your-domain.com/api/webhooks/payment

4. Review payment logs:
   Check logs/payment.log for errors
```

---

### Email Notifications

#### Issue: Emails Not Sending

**Diagnostic**:
```
1. Check email provider configuration in .env:
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=<your_key>
   EMAIL_FROM=noreply@yourdomain.com

2. Test SMTP connection:
   telnet smtp.sendgrid.net 587

3. Check email logs:
   docker-compose logs backend | grep -i email
```

**Common Causes**:
1. Invalid API key
2. Email provider rate limits
3. From email not verified
4. Emails landing in spam

**Solutions**:
```
1. Verify API key in provider dashboard

2. Check daily send limits

3. Verify sender email:
   - Add SPF record
   - Add DKIM record
   - Verify domain

4. Test with different email:
   - Try Gmail, Outlook
```

---

### Performance Issues

#### Issue: Slow Page Load

**Diagnostic**:
```
1. Check browser DevTools > Network:
   - Look for slow requests (>1s)
   - Check waterfall chart
   - Note blocking resources

2. Check React DevTools > Profiler:
   - Identify slow components
   - Look for unnecessary re-renders

3. Check backend response time:
   - Prometheus: http://localhost:9090
   - Query: http_request_duration_seconds
```

**Solutions**:
```
Frontend:
1. Enable code splitting (already configured)
2. Lazy load images
3. Reduce bundle size
4. Clear browser cache

Backend:
1. Add database indexes
2. Optimize queries (avoid N+1)
3. Enable Redis caching
4. Scale horizontally (add servers)
```

---

## 🔧 Diagnostic Commands

### Health Checks
```bash
# Backend health
curl http://localhost:4000/health

# Database health
docker exec sme-postgres pg_isready

# Redis health
docker exec sme-redis redis-cli ping

# All services
docker-compose ps
```

### Log Viewing
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs  
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

### System Info
```bash
# Docker stats
docker stats

# Disk usage
docker system df

# Network
docker network ls
docker network inspect sme-network
```

---

## 📞 Getting Help

### Self-Service Resources

1. **Documentation**: /docs
2. **API Reference**: http://localhost:4000/api/docs
3. **Status Page**: status.smeplatform.com

### Support Channels

**Level 1** - User Support:
- Email: support@smeplatform.com
- Response: 4 hours
- For: How-to questions, feature requests

**Level 2** - Technical Support:
- Email: tech@smeplatform.com
- Response: 1 hour  
- For: Bugs, errors, integration issues

**Level 3** - Emergency:
- Phone: +1-XXX-XXX-XXXX
- Response: Immediate
- For: System outages, security incidents

### Reporting Bugs

Include:
1. **Description**: What happened?
2. **Expected**: What should happen?
3. **Steps to Reproduce**: How to recreate?
4. **Environment**: Browser, OS, version
5. **Screenshots**: Error messages, console
6. **Logs**: Relevant log excerpts

---

## 🆘 Emergency Procedures

### System Outage

1. Check status page
2. Try different browser/network
3. Contact support immediately
4. Monitor status page for updates

### Data Loss

1. **STOP**: Don't make changes
2. Contact support immediately
3. Provide:
   - What was lost
   - When it was lost
   - What actions preceded loss
4. Support will restore from backup

### Security Incident

1. **IMMEDIATELY**: Change password
2. Enable MFA if not already
3. Contact security@smeplatform.com
4. Document what happened
5. Preserve logs/evidence

---

*Troubleshooting Guide v1.0*  
*Last Updated: December 14, 2025*
