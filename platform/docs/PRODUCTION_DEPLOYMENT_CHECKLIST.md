# Production Deployment Checklist

**Platform**: SME Receivable Platform  
**Version**: 1.0.0  
**Date**: December 14, 2025  
**Status**: Ready for Production

---

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### 1. Code & Repository (15 items)

- [ ] **Code Quality**
  - [ ] All TypeScript compiles without errors
  - [ ] ESLint passes with 0 errors
  - [ ] All tests passing (unit + E2E)
  - [ ] Code coverage > 70%
  - [ ] No console.log in production code
  - [ ] No TODO comments in critical paths

- [ ] **Version Control**
  - [ ] All code committed to main branch
  - [ ] Version tagged (v1.0.0)
  - [ ] CHANGELOG.md updated
  - [ ] Release notes created

- [ ] **Security**
  - [ ] All security scans passing
  - [ ] No secrets in repository
  - [ ] .gitignore configured correctly
  - [ ] Dependency vulnerabilities resolved
  - [ ] Container images scanned

---

### 2. Infrastructure Setup (12 items)

- [ ] **Cloud Provider**
  - [ ] Kubernetes cluster provisioned (AKS/EKS/GKE)
  - [ ] Cluster version: 1.28+ (recommended)
  - [ ] Node pools configured (min 3 nodes)
  - [ ] Auto-scaling enabled
  - [ ] Regional deployment for HA

- [ ] **Networking**
  - [ ] VPC/VNet configured
  - [ ] Subnets created (public/private)
  - [ ] Load balancer provisioned
  - [ ] DNS configured (smeplatform.com)
  - [ ] SSL/TLS certificates obtained (Let's Encrypt)

- [ ] **Storage**
  - [ ] Persistent volumes configured (30Gi+)
  - [ ] Storage class verified

---

### 3. Secrets Management (8 items)

- [ ] **Generate Production Secrets**
  ```powershell
  # Run secret generation script
  .\scripts\generate-secrets.ps1 -Environment production
  ```

- [ ] **Required Secrets** (all unique, never reused from dev)
  - [ ] JWT_SECRET (64 bytes, base64)
  - [ ] DATABASE_PASSWORD (32 bytes, strong)
  - [ ] REDIS_PASSWORD (24 bytes)
  - [ ] ENCRYPTION_KEY (32 bytes)

- [ ] **External API Keys**
  - [ ] SendGrid API key (production account)
  - [ ] Twilio credentials (production)
  - [ ] Razorpay keys (production, NOT test mode)
  - [ ] AWS credentials (production IAM user)

---

### 4. Database Setup (10 items)

- [ ] **PostgreSQL Production Instance**
  - [ ] Version 15+ deployed
  - [ ] High availability configured (replica)
  - [ ] Automated backups enabled (daily)
  - [ ] Point-in-time recovery enabled
  - [ ] Backup retention: 30 days
  - [ ] Connection pooling configured

- [ ] **Database Migration**
  - [ ] All migrations tested in staging
  - [ ] Migration rollback plan ready
  - [ ] Database user created with minimal privileges
  - [ ] Connection string verified

---

### 5. Application Configuration (15 items)

- [ ] **Environment Variables**
  - [ ] NODE_ENV=production
  - [ ] CORS_ORIGIN set to production domain
  - [ ] ALLOWED_ORIGINS configured
  - [ ] Rate limits appropriate for production
  - [ ] Debug mode DISABLED

- [ ] **Feature Flags**
  - [ ] ENABLE_MILESTONE_WORKFLOWS (true/false)
  - [ ] ENABLE_INVOICE_CONCIERGE (true/false)
  - [ ] ENABLE_CREDIT_DECISIONING (true/false)
  - [ ] All flags reviewed and set appropriately

- [ ] **Email Configuration**
  - [ ] SMTP settings verified
  - [ ] Sender domain verified
  - [ ] SPF/DKIM records configured
  - [ ] Email templates reviewed

- [ ] **Logging**
  - [ ] LOG_LEVEL=info (not debug)
  - [ ] Log aggregation configured (ELK/Datadog)

---

### 6. Monitoring & Observability (10 items)

- [ ] **Prometheus**
  - [ ] Prometheus deployed
  - [ ] Scraping backend metrics
  - [ ] Alert rules configured
  - [ ] Storage retention set (30 days)

- [ ] **Grafana**
  - [ ] Grafana deployed with dashboards
  - [ ] Datasources configured
  - [ ] User access configured
  - [ ] Alert notifications (email/Slack)

- [ ] **Application Monitoring**
  - [ ] Sentry configured (error tracking)
  - [ ] APM enabled (New Relic/Datadog)

- [ ] **Uptime Monitoring**
  - [ ] Status page configured
  - [ ] Health check endpoints monitored

---

### 7. Security Hardening (12 items)

- [ ] **Network Security**
  - [ ] Network policies applied
  - [ ] Ingress rules configured (allow only 80/443)
  - [ ] Pod security policies enabled
  - [ ] Service mesh configured (optional: Istio)

- [ ] **Application Security**
  - [ ] Rate limiting active (100 req/15min)
  - [ ] CORS properly configured
  - [ ] CSP headers hardened
  - [ ] Security headers verified (XSS, etc.)
  - [ ] JWT expiry appropriate (24h)

- [ ] **Access Control**
  - [ ] RBAC configured in Kubernetes
  - [ ] Admin users created with MFA
  - [ ] API keys rotated

---

### 8. CI/CD Pipeline (8 items)

- [ ] **GitHub Actions**
  - [ ] All workflows enabled
  - [ ] Secrets configured in GitHub
  - [ ] Production deployment workflow tested
  - [ ] Rollback procedure tested

- [ ] **Container Registry**
  - [ ] Production images tagged correctly
  - [ ] Image scanning enabled
  - [ ] Old images cleanup configured
  - [ ] Registry access secured

---

### 9. Backup & Disaster Recovery (8 items)

- [ ] **Backup Strategy**
  - [ ] Database backups automated (daily at 2 AM)
  - [ ] File backups configured
  - [ ] Configuration backups enabled
  - [ ] Backup testing scheduled (monthly)

- [ ] **Disaster Recovery**
  - [ ] DR plan documented
  - [ ] Recovery time objective (RTO): 4 hours
  - [ ] Recovery point objective (RPO): 24 hours
  - [ ] DR drill scheduled (quarterly)

---

### 10. Documentation (5 items)

- [ ] **Operational Docs**
  - [ ] Deployment runbook reviewed
  - [ ] Troubleshooting guide accessible
  - [ ] Backup/restore procedures tested
  - [ ] Emergency contacts updated
  - [ ] On-call rotation established

---

## 🚀 **DEPLOYMENT STEPS**

### Step 1: Final Verification (30 minutes)

```bash
# Run all tests locally
cd platform && npm test -- --coverage
cd frontend && npm test -- --coverage

# Run E2E tests
cd frontend && npm run cypress:run

# Security audit
npm audit
snyk test
```

### Step 2: Deploy Infrastructure (1 hour)

```bash
# Connect to Kubernetes cluster
az aks get-credentials --name sme-prod-cluster --resource-group sme-prod-rg

# Create namespace
kubectl create namespace sme-platform

# Create secrets (use generated secrets from Step 3)
kubectl create secret generic sme-platform-secrets \
  --from-literal=JWT_SECRET='<GENERATED>' \
  --from-literal=DATABASE_PASSWORD='<GENERATED>' \
  --from-literal=REDIS_PASSWORD='<GENERATED>' \
  --from-literal=ENCRYPTION_KEY='<GENERATED>' \
  --from-literal=SENDGRID_API_KEY='<PRODUCTION_KEY>' \
  --from-literal=RAZORPAY_KEY_ID='<PRODUCTION_KEY>' \
  --from-literal=RAZORPAY_KEY_SECRET='<PRODUCTION_SECRET>' \
  --namespace=sme-platform
```

### Step 3: Deploy Application (1 hour)

```bash
# Deploy with Helm
helm upgrade --install sme-platform ./helm \
  --namespace=sme-platform \
  --values=./helm/values-prod.yaml \
  --set backend.image.tag=v1.0.0 \
  --set frontend.image.tag=v1.0.0 \
  --wait \
  --timeout=15m

# Verify deployment
kubectl get all -n sme-platform
kubectl get ingress -n sme-platform
```

### Step 4: Database Migration (30 minutes)

```bash
# Run migrations
kubectl exec -it deployment/backend -n sme-platform -- npm run migration:run

# Verify migrations
kubectl exec -it deployment/backend -n sme-platform -- npm run migration:show
```

### Step 5: Smoke Tests (15 minutes)

```bash
# Health check
curl -f https://api.smeplatform.com/health

# Login test
curl -X POST https://api.smeplatform.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smeplatform.com","password":"<ADMIN_PASSWORD>"}'

# Frontend accessible
curl -f https://smeplatform.com

# Check all pods running
kubectl get pods -n sme-platform
# All should show Running and READY 1/1 (or 3/3 for backend)
```

### Step 6: Monitoring Verification (15 minutes)

```bash
# Check Prometheus
curl -f https://prometheus.smeplatform.com/-/healthy

# Check Grafana
curl -f https://grafana.smeplatform.com/api/health

# Verify metrics being collected
kubectl logs -l app=backend -n sme-platform | grep "metrics"
```

### Step 7: Final Checks (15 minutes)

- [ ] All pods in Running state
- [ ] No errors in logs (last 10 minutes)
- [ ] Health endpoints responding (200 OK)
- [ ] Metrics being collected
- [ ] SSL certificates valid
- [ ] DNS resolving correctly
- [ ] Email notifications working (test)
- [ ] Login working for admin user
- [ ] Sample invoice created successfully

---

## 🔄 **POST-DEPLOYMENT**

### Immediate (Within 1 hour)

- [ ] Monitor error rates (should be < 1%)
- [ ] Monitor response times (should be < 200ms)
- [ ] Monitor CPU/Memory usage
- [ ] Check logs for any warnings
- [ ] Verify all integrations working (email, SMS, payment)

### Day 1

- [ ] Send announcement email to stakeholders
- [ ] Update status page (all systems operational)
- [ ] Monitor user signups
- [ ] Check database performance
- [ ] Review all alerts

### Week 1

- [ ] Review performance metrics
- [ ] Check error tracking (Sentry)
- [ ] Analyze user behavior (Google Analytics)
- [ ] Review backup completion
- [ ] Verify auto-scaling working

### Month 1

- [ ] Conduct first DR drill
- [ ] Review security scan results
- [ ] Rotate secrets (if scheduled)
- [ ] Performance optimization based on metrics
- [ ] User feedback review

---

## 🆘 **ROLLBACK PROCEDURE**

If deployment fails or critical issues arise:

```bash
# Option 1: Helm rollback (recommended)
helm rollback sme-platform -n sme-platform

# Option 2: Deploy previous version
helm upgrade sme-platform ./helm \
  --namespace=sme-platform \
  --values=./helm/values-prod.yaml \
  --set backend.image.tag=v0.9.0 \
  --set frontend.image.tag=v0.9.0

# Option 3: Database rollback
kubectl exec -it deployment/backend -n sme-platform -- npm run migration:revert

# Verify rollback successful
kubectl get pods -n sme-platform
curl -f https://api.smeplatform.com/health
```

---

## 📞 **EMERGENCY CONTACTS**

**On-Call Engineer**: +1-XXX-XXX-XXXX  
**DevOps Lead**: devops@smeplatform.com  
**CTO**: cto@smeplatform.com  
**Slack Channel**: #production-alerts

---

## ✅ **SUCCESS CRITERIA**

Deployment is successful when:

- ✅ All pods in Running state (15/15)
- ✅ Health checks passing (200 OK)
- ✅ Error rate < 1%
- ✅ Response time < 200ms (p95)
- ✅ No critical alerts
- ✅ All integrations working
- ✅ Admin can login
- ✅ Sample transaction completed
- ✅ Monitoring operational
- ✅ Backups running

**Estimated Total Time**: 4 hours  
**Required Personnel**: 2 engineers  
**Recommended Window**: Weekend, low-traffic hours

---

*Production Deployment Checklist v1.0*  
*SME Receivable Platform*  
*Last Updated: December 14, 2025*
