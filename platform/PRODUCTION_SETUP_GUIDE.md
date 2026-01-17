# 🚀 Production Setup Guide

## 📋 QUICK START

Follow these steps to deploy the authentication system to production.

---

## 🔧 STEP 1: Environment Configuration

### Create `.env` file
```bash
# Copy the example file
cp .env.example .env
```

### Update with your values
```bash
# Auth.js Configuration
AUTH_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
AUTH_URL=https://your-domain.com

# Database Configuration
DATABASE_URL=postgresql://username:password@your-db-host:5432/sme_platform
REDIS_URL=redis://your-redis-host:6379

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=24h

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth (Get from Azure Portal)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# LinkedIn OAuth (Get from LinkedIn Developer Portal)
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# API Configuration
API_URL=https://your-domain.com/api

# Development Settings
NODE_ENV=production
```

---

## 🗄️ STEP 2: Database Setup

### PostgreSQL Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb sme_platform

# Create user (optional)
sudo -u postgres createuser --interactive sme_user

# Grant permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE sme_platform TO sme_user;
\q
```

### Redis Setup
```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

### Docker Alternative
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sme_platform
      POSTGRES_USER: sme_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start with Docker
docker-compose up -d
```

---

## 🔐 STEP 3: OAuth Provider Setup

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
   - `http://localhost:5176/api/auth/callback/google` (for development)
6. Copy Client ID and Client Secret to `.env`

### Microsoft OAuth Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory
3. App registrations → New registration
4. Set redirect URI: `https://your-domain.com/api/auth/callback/microsoft`
5. Copy Application ID and Client Secret to `.env`

### LinkedIn OAuth Setup
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create new app
3. Add OAuth 2.0 redirect URLs:
   - `https://your-domain.com/api/auth/callback/linkedin`
4. Copy Client ID and Client Secret to `.env`

---

## 🏗️ STEP 4: Application Deployment

### Build for Production
```bash
# Install dependencies
npm install

# Build application
npm run build

# Test build locally
npm run preview
```

### Deployment Options

#### Option 1: Traditional Server
```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start dist/index.js --name sme-auth

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option 2: Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/

# Expose port
EXPOSE 5176

# Start application
CMD ["node", "dist/index.js"]
```

```bash
# Build Docker image
docker build -t sme-auth .

# Run container
docker run -p 5176:5176 --env-file .env sme-auth
```

#### Option 3: Cloud Deployment

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**AWS:**
```bash
# Use AWS Amplify or Elastic Beanstalk
# Follow AWS documentation for deployment
```

---

## 🔍 STEP 5: Health Checks & Monitoring

### Health Check Endpoint
```bash
# Test health check
curl https://your-domain.com/api/health

# Expected response:
{
  "database": true,
  "redis": true,
  "timestamp": "2026-01-09T20:00:00.000Z"
}
```

### Monitoring Setup
```bash
# Install monitoring tools
npm install @sentry/node @sentry/tracing

# Add to application (example)
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});
```

---

## 🛡️ STEP 6: Security Hardening

### SSL/TLS Setup
```bash
# Use Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# Configure UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Environment Security
```bash
# Set proper file permissions
chmod 600 .env
chown app:app .env

# Use environment-specific secrets
# Never commit .env to version control
```

---

## 📊 STEP 7: Performance Optimization

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_mobile ON users(mobile);
CREATE INDEX CONCURRENTLY idx_users_tenant_id ON users(tenant_id);
CREATE INDEX CONCURRENTLY idx_users_role ON users(role);

-- Analyze tables
ANALYZE users;
```

### Redis Optimization
```bash
# Configure Redis for production
# Edit /etc/redis/redis.conf

# Key settings:
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Application Optimization
```bash
# Enable gzip compression
# Add to nginx.conf:
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Set up CDN for static assets
# Use Cloudflare, AWS CloudFront, or similar
```

---

## 🧪 STEP 8: Testing Production Setup

### End-to-End Testing
```bash
# Test complete authentication flow
curl -X POST https://your-domain.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+1234567890"}'

# Test OTP verification
curl -X POST https://your-domain.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+1234567890", "otp": "123456"}'

# Test token refresh
curl -X POST https://your-domain.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create test config
cat > load-test.yml << EOF
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Authentication Flow"
    steps:
      - post:
          url: "/api/auth/send-otp"
          json:
            mobile: "+1234567890"
EOF

# Run load test
artillery run load-test.yml
```

---

## 📝 STEP 9: Logging & Debugging

### Application Logging
```bash
# Configure winston for production logging
npm install winston

# Add to application
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Database Logging
```sql
-- Enable PostgreSQL logging
-- Edit postgresql.conf
log_statement = 'all'
log_duration = on
log_min_duration_statement = 1000

-- Reload configuration
SELECT pg_reload_conf();
```

---

## 🚨 STEP 10: Backup & Recovery

### Database Backup
```bash
# Create backup script
cat > backup-db.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U sme_user sme_platform > backup_\$DATE.sql
gzip backup_\$DATE.sql
EOF

# Make executable
chmod +x backup-db.sh

# Set up cron job for daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup-db.sh
```

### Redis Backup
```bash
# Create Redis backup script
cat > backup-redis.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
redis-cli --rdb /var/lib/redis/dump_\$DATE.rdb
gzip /var/lib/redis/dump_\$DATE.rdb
EOF

chmod +x backup-redis.sh
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database created and accessible
- [ ] Redis running and accessible
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Domain DNS configured
- [ ] OAuth applications created

### Post-Deployment
- [ ] Health checks passing
- [ ] Authentication flows working
- [ ] OAuth callbacks working
- [ ] Database connections stable
- [ ] Redis connections stable
- [ ] Monitoring configured
- [ ] Backup systems working
- [ ] Load testing completed
- [ ] Security scanning completed

---

## 🎯 TROUBLESHOOTING

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U sme_user -d sme_platform

# Check logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### Redis Connection Error
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

#### OAuth Callback Issues
```bash
# Check redirect URIs in OAuth provider console
# Ensure they match exactly: https://your-domain.com/api/auth/callback/provider

# Check network connectivity
curl -I https://your-domain.com/api/auth/callback/google
```

#### JWT Token Issues
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check token format
# Should be 3 parts separated by dots: header.payload.signature
```

---

## 📞 SUPPORT

### Monitoring Dashboards
- Set up Grafana for metrics visualization
- Configure alerts for database connections
- Monitor Redis memory usage
- Track authentication success/failure rates

### Log Analysis
- Use ELK stack for log aggregation
- Set up alerts for error patterns
- Monitor authentication attempts
- Track performance metrics

### Security Monitoring
- Monitor failed login attempts
- Track unusual authentication patterns
- Set up alerts for security events
- Regular security audits

---

## 🎉 CONCLUSION

Your authentication system is now **production-ready** with:
- ✅ Enterprise-grade security
- ✅ Scalable architecture
- ✅ Comprehensive monitoring
- ✅ Backup and recovery
- ✅ Performance optimization
- ✅ Full documentation

**Ready for production deployment!** 🚀

---

**Last updated:** January 9, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
