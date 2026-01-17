# 🚀 Module 03: Payment Integration - Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying the **Module 03: Payment Integration** service in various environments, including development, staging, and production.

## 🏗️ Architecture Overview

The Payment Integration module is built with:
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Redis for caching
- **Message Queue**: BullMQ with Redis
- **Containerization**: Docker with multi-stage builds
- **API Documentation**: Swagger/OpenAPI 3.0
- **Security**: API key authentication, rate limiting, input validation

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **PostgreSQL**: 13.0 or higher
- **Redis**: 6.0 or higher
- **Docker**: 20.10.0 or higher (for containerized deployment)
- **Docker Compose**: 2.0.0 or higher

### Environment Variables
All required environment variables are documented in `.env.example`. Copy this file to `.env` and configure according to your environment.

## 🐳 Docker Deployment

### Quick Start with Docker Compose

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd Module_03_Payment_Integration
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Verify Deployment**
   ```bash
   # Check service health
   curl http://localhost:3003/health
   
   # Check API documentation
   http://localhost:3003/api/docs
   ```

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| payment-service | 3003 | Main API service |
| postgres | 5434 | PostgreSQL database |
| redis | 6379 | Redis cache and queue |
| nginx | 8083/8443 | Reverse proxy |

### Production Docker Deployment

1. **Build Production Image**
   ```bash
   docker build -t payment-integration-api:latest .
   ```

2. **Run Production Container**
   ```bash
   docker run -d \
     --name payment-integration-api \
     -p 3003:3003 \
     --env-file .env.production \
     --network payment-network \
     payment-integration-api:latest
   ```

## 🔧 Manual Deployment

### Development Environment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   ```bash
   # Create database
   createdb payment_db
   
   # Run migrations
   npm run migrate
   
   # Seed data (optional)
   npm run seed
   ```

3. **Start Development Server**
   ```bash
   npm run start:dev
   ```

### Production Environment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Setup Production Database**
   ```bash
   # Set environment variables
   export NODE_ENV=production
   export DATABASE_URL=postgresql://user:pass@host:5432/payment_db
   
   # Run migrations
   npm run migrate
   
   # Seed data if needed
   npm run seed
   ```

3. **Start Production Server**
   ```bash
   npm run start:prod
   ```

## 🗄️ Database Setup

### PostgreSQL Configuration

1. **Create Database**
   ```sql
   CREATE DATABASE payment_db;
   CREATE USER payment_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_user;
   ```

2. **Run Migrations**
   ```bash
   # Using npm scripts
   npm run migrate
   
   # Or manually
   psql -d payment_db -f database/migrations/001_initial_schema.sql
   ```

3. **Seed Data (Optional)**
   ```bash
   npm run seed
   ```

### Redis Configuration

1. **Install Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # CentOS/RHEL
   sudo yum install redis
   
   # macOS
   brew install redis
   ```

2. **Configure Redis**
   ```bash
   # Edit redis.conf
   sudo nano /etc/redis/redis.conf
   
   # Key settings:
   # bind 127.0.0.1
   # port 6379
   # requirepass your_redis_password
   ```

3. **Start Redis**
   ```bash
   sudo systemctl start redis
   sudo systemctl enable redis
   ```

## 🔐 Security Configuration

### API Key Authentication

1. **Generate API Keys**
   ```bash
   # Generate secure API keys
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Configure API Keys**
   ```bash
   # Add to .env
   VALID_API_KEYS=sk-your-api-key-1,sk-your-api-key-2
   ```

### SSL/TLS Configuration

1. **Generate SSL Certificates**
   ```bash
   # For development (self-signed)
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout ssl/private.key -out ssl/certificate.crt
   
   # For production (use Let's Encrypt or your CA)
   certbot --nginx -d your-domain.com
   ```

2. **Configure Nginx**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       location / {
           proxy_pass http://localhost:3003;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

## 📊 Monitoring & Logging

### Health Checks

The service provides multiple health check endpoints:

- **Full Health**: `/health` - Comprehensive system health
- **Liveness**: `/health/liveness` - Container health probe
- **Readiness**: `/health/readiness` - Service readiness probe
- **Providers**: `/health/providers` - Payment provider status
- **Metrics**: `/health/metrics` - System performance metrics

### Logging Configuration

1. **Log Levels**
   ```bash
   # Set log level in .env
   LOG_LEVEL=info # debug, info, warn, error
   ```

2. **Log File Configuration**
   ```bash
   # Configure log rotation
   LOG_FILE_PATH=./logs
   LOG_FILE_MAX_SIZE=20m
   LOG_FILE_MAX_FILES=14d
   ```

3. **Structured Logging**
   ```bash
   # Enable JSON logging
   LOG_FORMAT=json
   ```

### Monitoring Setup

1. **Prometheus Metrics** (Optional)
   ```bash
   # Install prometheus client
   npm install prom-client
   
   # Enable metrics collection
   METRICS_ENABLED=true
   METRICS_PORT=9090
   ```

2. **Application Performance Monitoring**
   ```bash
   # New Relic
   npm install newrelic
   
   # DataDog
   npm install dd-trace
   ```

## 🔧 Payment Gateway Configuration

### Razorpay Setup

1. **Create Razorpay Account**
   - Sign up at [Razorpay](https://razorpay.com)
   - Get API keys from dashboard

2. **Configure Environment**
   ```bash
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

### PayU Setup

1. **Create PayU Account**
   - Sign up at [PayU](https://payu.in)
   - Get merchant credentials

2. **Configure Environment**
   ```bash
   PAYU_MERCHANT_KEY=your_merchant_key
   PAYU_MERCHANT_SALT=your_merchant_salt
   PAYU_WEBHOOK_URL=https://your-domain.com/webhooks/payu
   ```

### CCAvenue Setup

1. **Create CCAvenue Account**
   - Sign up at [CCAvenue](https://ccavenue.com)
   - Get merchant credentials

2. **Configure Environment**
   ```bash
   CCAVENUE_MERCHANT_ID=your_merchant_id
   CCAVENUE_ACCESS_CODE=your_access_code
   CCAVENUE_WORKING_KEY=your_working_key
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy Payment Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t payment-integration-api .
      
      - name: Run security scan
        run: |
          docker run --rm -v $(pwd):/app payment-integration-api npm audit

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying to production..."
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   sudo systemctl status postgresql
   
   # Check connection string
   psql -h localhost -U payment_user -d payment_db
   
   # Verify environment variables
   echo $DATABASE_URL
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   sudo systemctl status redis
   
   # Test Redis connection
   redis-cli ping
   
   # Check Redis configuration
   redis-cli config get "*"
   ```

3. **Payment Gateway Errors**
   ```bash
   # Check API keys
   echo $RAZORPAY_KEY_ID
   
   # Test gateway connectivity
   curl -X POST https://api.razorpay.com/v1/payments \
     -u key_id:key_secret
   ```

4. **High Memory Usage**
   ```bash
   # Check memory usage
   docker stats
   
   # Optimize Node.js memory
   NODE_OPTIONS="--max-old-space-size=2048"
   ```

### Performance Optimization

1. **Database Optimization**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Create indexes
   CREATE INDEX CONCURRENTLY idx_payment_transactions_created_at 
   ON payment_transactions(created_at);
   ```

2. **Redis Optimization**
   ```bash
   # Monitor Redis memory
   redis-cli info memory
   
   # Optimize Redis configuration
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```

3. **Application Optimization**
   ```bash
   # Enable clustering
   NODE_ENV=production
   UV_THREADPOOL_SIZE=128
   
   # Monitor performance
   npm install clinic
   clinic doctor -- node dist/main.js
   ```

## 📚 API Documentation

Once deployed, access the API documentation at:
- **Swagger UI**: `http://localhost:3003/api/docs`
- **OpenAPI JSON**: `http://localhost:3003/api/docs-json`

## 🔧 Maintenance

### Regular Tasks

1. **Database Maintenance**
   ```bash
   # Weekly backup
   pg_dump payment_db > backup_$(date +%Y%m%d).sql
   
   # Vacuum and analyze
   psql -d payment_db -c "VACUUM ANALYZE;"
   ```

2. **Log Rotation**
   ```bash
   # Configure logrotate
   sudo nano /etc/logrotate.d/payment-integration
   
   # Test log rotation
   sudo logrotate -f /etc/logrotate.d/payment-integration
   ```

3. **Security Updates**
   ```bash
   # Update dependencies
   npm audit fix
   
   # Update system packages
   sudo apt update && sudo apt upgrade
   ```

### Backup and Recovery

1. **Database Backup**
   ```bash
   # Full backup
   pg_dump -h localhost -U payment_user payment_db > full_backup.sql
   
   # Compressed backup
   pg_dump -h localhost -U payment_user payment_db | gzip > backup.sql.gz
   ```

2. **Restore Database**
   ```bash
   # Restore from backup
   psql -h localhost -U payment_user payment_db < backup.sql
   
   # Restore from compressed backup
   gunzip -c backup.sql.gz | psql -h localhost -U payment_user payment_db
   ```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs: `tail -f logs/app.log`
3. Verify health status: `curl http://localhost:3003/health`
4. Check service dependencies: `docker-compose ps`

## 🎯 Next Steps

After successful deployment:
1. Configure payment gateway webhooks
2. Set up monitoring and alerting
3. Configure backup procedures
4. Test all payment flows
5. Set up CI/CD pipeline
6. Document your specific configuration

---

**🎉 Your Payment Integration module is now deployed and ready to process payments!**
