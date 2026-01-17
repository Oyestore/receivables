# Production Deployment Guide

## 🎯 Overview

This guide provides step-by-step instructions for deploying the SME Receivable Platform to production.

**Prerequisites**:
- ✅ Platform at 100% (all tests passing)
- ✅ Secrets rotated
- ✅ Staging validated
- ✅ Production infrastructure ready

---

## 📋 **Pre-Deployment Checklist**

### Code & Testing
- [ ] All unit tests passing (`npm test`)
- [ ] All E2E tests passing
- [ ] Code coverage > 70%
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Security audit passed (`npm audit`)

### Configuration
- [ ] All secrets rotated (< 90 days old)
- [ ] Environment variables documented
- [ ] `.env.example` up to date
- [ ] No secrets in version control
- [ ] Database migrations tested

### Infrastructure
- [ ] Production database ready
- [ ] Redis cluster configured
- [ ] CDN configured
- [ ] SSL certificates valid (> 30 days)
- [ ] DNS records configured
- [ ] Load balancer configured

### Monitoring & Logging
- [ ] Application monitoring configured (New Relic/Datadog)
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation configured (ELK/Splunk)
- [ ] Alerts configured
- [ ] Dashboards created

### Security
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] JWT secret rotated
- [ ] Database credentials rotated
- [ ] Firewall rules applied

### Documentation
- [ ] API documentation current
- [ ] Deployment runbook complete
- [ ] Rollback procedure documented
- [ ] Incident response plan ready
- [ ] User guides available

---

## 🚀 **Deployment Steps**

### Phase 1: Preparation (Day -1)

**1. Notify Stakeholders**
```markdown
Subject: Production Deployment - [DATE]

Team,

We will be deploying the SME Receivable Platform to production on [DATE] at [TIME].

Expected downtime: < 5 minutes
Maintenance window: [START] - [END]

Please let us know if you have any concerns.

Thanks,
DevOps Team
```

**2. Backup Current State**
```bash
# Backup production database
pg_dump -U postgres sme_platform_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup current deployment
kubectl get all -n production -o yaml > k8s_backup_$(date +%Y%m%d_%H%M%S).yaml

# Backup Redis data
redis-cli --rdb /backup/redis_$(date +%Y%m%d_%H%M%S).rdb
```

**3. Final Testing**
```bash
# Run full test suite
npm run test:all

# Run security audit
npm audit
npm run security:scan

# Run performance tests
npm run test:load
```

---

### Phase 2: Database Migration (30 min before)

**1. Review Migrations**
```bash
# Check pending migrations
npm run migration:show

# Review migration scripts
cat migrations/*.sql
```

**2. Test Migrations (Staging)**
```bash
# Test on staging first
npm run migration:run --env=staging

# Verify data integrity
npm run migration:verify
```

**3. Execute Production Migrations**
```bash
# Backup before migration
pg_dump -U postgres sme_platform_db > pre_migration_backup.sql

# Run migrations
npm run migration:run --env=production

# Verify
npm run migration:verify --env=production
```

---

### Phase 3: Application Deployment (Blue-Green)

**Option A: Kubernetes (Recommended)**

**1. Build & Push Images**
```bash
# Build frontend
cd frontend
docker build -t sme-platform-frontend:v1.0.0 .
docker tag sme-platform-frontend:v1.0.0 registry.company.com/sme-platform-frontend:v1.0.0
docker push registry.company.com/sme-platform-frontend:v1.0.0

# Build backend
cd ../platform
docker build -t sme-platform-backend:v1.0.0 .
docker tag sme-platform-backend:v1.0.0 registry.company.com/sme-platform-backend:v1.0.0
docker push registry.company.com/sme-platform-backend:v1.0.0
```

**2. Update Kubernetes Manifests**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sme-platform-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sme-platform-backend
      version: v1.0.0
  template:
    metadata:
      labels:
        app: sme-platform-backend
        version: v1.0.0
    spec:
      containers:
      - name: backend
        image: registry.company.com/sme-platform-backend:v1.0.0
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**3. Deploy (Blue-Green Strategy)**
```bash
# Deploy new version (green)
kubectl apply -f k8s/deployment-green.yaml

# Wait for rollout
kubectl rollout status deployment/sme-platform-backend-green -n production

# Verify health
kubectl get pods -n production -l version=v1.0.0

# Run smoke tests against green deployment
npm run test:smoke --target=green.internal.company.com

# Switch traffic (blue -> green)
kubectl patch service sme-platform-backend -n production \
  -p '{"spec":{"selector":{"version":"v1.0.0"}}}'

# Monitor for 15 minutes
watch kubectl get pods -n production

# If all good, scale down blue
kubectl scale deployment sme-platform-backend-blue --replicas=0 -n production
```

**Option B: PM2 (Alternative)**

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Build
npm run build

# Deploy with zero downtime
pm2 reload ecosystem.config.js --update-env

# Verify
pm2 list
pm2 logs --lines 50
```

---

### Phase 4: Verification (15 min)

**1. Health Checks**
```bash
# Backend health
curl https://api.smeplatform.com/health

# Frontend health
curl https://smeplatform.com

# Database connectivity
curl https://api.smeplatform.com/api/health/db

# Redis connectivity
curl https://api.smeplatform.com/api/health/redis
```

**2. Smoke Tests**
```bash
# Run automated smoke tests
npm run test:smoke --env=production

# Test critical flows
- Login
- Create invoice
- Process payment
- View analytics
```

**3. Monitor Metrics**
```bash
# Check error rates
# Check response times (should be < 200ms p95)
# Check CPU/memory usage
# Check database connections
```

---

### Phase 5: Post-Deployment (1 hour monitoring)

**1. Monitor Dashboards**
- Application metrics (Datadog/New Relic)
- Error tracking (Sentry)
- User analytics
- Business metrics

**2. Verify Integrations**
- Email notifications working
- SMS notifications working
- WhatsApp notifications working
- Payment gateway working
- External APIs responding

**3. User Communication**
```markdown
Subject: Platform Deployment Complete

Team,

The SME Receivable Platform has been successfully deployed to production.

New Features:
- Enhanced UI/UX across all modules
- Improved security (rate limiting, CSP headers)
- Better error handling
- Performance improvements

Known Issues: None

Support: support@company.com

Thanks,
Product Team
```

---

## 🔄 **Rollback Procedure**

If issues detected within 1 hour:

**Quick Rollback (5 min)**
```bash
# Kubernetes: Switch back to blue
kubectl patch service sme-platform-backend -n production \
  -p '{"spec":{"selector":{"version":"v0.9.0"}}}'

# Scale up blue
kubectl scale deployment sme-platform-backend-blue --replicas=3 -n production

# PM2: Rollback
pm2 reload ecosystem.config.js --env=previous
```

**Database Rollback (if needed)**
```bash
# Restore from backup
psql -U postgres -d sme_platform_db < pre_migration_backup.sql

# Verify
psql -U postgres -d sme_platform_db -c "SELECT version FROM migrations ORDER BY version DESC LIMIT 1;"
```

---

## 📊 **Success Criteria**

Deployment considered successful if:
- [ ] All health checks passing
- [ ] Error rate < 0.1%
- [ ] Response time < 200ms (p95)
- [ ] No critical errors in logs
- [ ] All integrations working
- [ ] User logins successful
- [ ] Core workflows functional

---

## 🆘 **Emergency Contacts**

- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **DevOps Lead**: devops@company.com
- **CTO**: cto@company.com
- **Incident Channel**: #incidents (Slack)

---

## 📋 **Post-Deployment Tasks**

**Within 24 Hours**:
- [ ] Update documentation with any changes
- [ ] Document any issues encountered
- [ ] Update deployment runbook
- [ ] Capture metrics baseline
- [ ] Schedule postmortem (if needed)

**Within 1 Week**:
- [ ] Analyze performance metrics
- [ ] Collect user feedback
- [ ] Create improvement backlog
- [ ] Plan next release

---

## 📚 **Additional Resources**

- [Kubernetes Deployment Guide](./k8s-deployment.md)
- [Database Migration Guide](./database-migrations.md)
- [Monitoring Setup](./monitoring-setup.md)
- [Incident Response Plan](./incident-response.md)
- [Rollback Procedures](./rollback-procedures.md)

---

**Deployment Checklist Template**: Use this for each deployment

```markdown
## Deployment: v1.0.0 - [DATE]

**Deployed By**: _______________
**Start Time**: _______________
**End Time**: _______________
**Duration**: _______________

### Pre-Deployment
- [ ] All tests passing
- [ ] Stakeholders notified
- [ ] Backups created
- [ ] Migrations tested

### Deployment
- [ ] Images built & pushed
- [ ] Green deployment created
- [ ] Health checks passing
- [ ] Traffic switched
- [ ] Blue scaled down

### Verification
- [ ] Smoke tests passed
- [ ] Metrics normal
- [ ] No errors in logs
- [ ] Integrations working

### Status
- [ ] ✅ Success
- [ ] ❌ Rolled Back
- [ ] ⚠️ Partial (details: _______)

**Notes**: _______________
```

---

*Production Deployment Guide v1.0*  
*SME Receivable Platform*  
*Last Updated: December 14, 2025*
