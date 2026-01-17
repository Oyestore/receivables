# 🚀 Module 04: Analytics & Reporting - Deployment Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying the **Module 04: Analytics & Reporting** service in various environments, including development, staging, and production.

## 🏗️ Architecture Overview

The Analytics & Reporting module is built with:
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with ClickHouse for analytics
- **Cache**: Redis for caching and session management
- **Message Queue**: BullMQ with Redis
- **Containerization**: Docker with multi-stage builds
- **API Documentation**: Swagger/OpenAPI 3.0
- **Security**: API key authentication, rate limiting, input validation
- **Analytics**: ClickHouse for OLAP operations
- **AI Integration**: Machine learning for insights and anomaly detection

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **PostgreSQL**: 13.0 or higher
- **ClickHouse**: 22.0 or higher
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
   cd Module_04_Analytics_Reporting
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
   curl http://localhost:3004/health
   
   # Check API documentation
   http://localhost:3004/api/docs
   ```

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| analytics-service | 3004 | Main API service |
| postgres | 5435 | PostgreSQL database |
| clickhouse | 9000/8123 | ClickHouse analytics database |
| redis | 6380 | Redis cache and queue |
| nginx | 8084/8444 | Reverse proxy |

### Production Docker Deployment

1. **Build Production Image**
   ```bash
   docker build -t analytics-api:latest .
   ```

2. **Run Production Container**
   ```bash
   docker run -d \
     --name analytics-api \
     -p 3004:3004 \
     --env-file .env.production \
     --network analytics-network \
     analytics-api:latest
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
   createdb analytics_db
   
   # Run migrations
   npm run migrate
   
   # Seed data (optional)
   npm run seed
   ```

3. **Setup ClickHouse**
   ```bash
   # Install ClickHouse
   curl https://clickhouse.com/ | sh
   
   # Create database
   clickhouse-client --query "CREATE DATABASE analytics"
   
   # Run ClickHouse migrations
   npm run clickhouse:migrate
   ```

4. **Start Development Server**
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
   export DATABASE_URL=postgresql://user:pass@host:5435/analytics_db
   export CLICKHOUSE_URL=clickhouse://host:9000/analytics
   
   # Run migrations
   npm run migrate
   npm run clickhouse:migrate
   
   # Seed data if needed
   npm run seed
   npm run clickhouse:seed
   ```

3. **Start Production Server**
   ```bash
   npm run start:prod
   ```

## 🗄️ Database Setup

### PostgreSQL Configuration

1. **Create Database**
   ```sql
   CREATE DATABASE analytics_db;
   CREATE USER analytics_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE analytics_db TO analytics_user;
   ```

2. **Run Migrations**
   ```bash
   # Using npm scripts
   npm run migrate
   
   # Or manually
   psql -d analytics_db -f database/migrations/001_initial_schema.sql
   ```

3. **Seed Data (Optional)**
   ```bash
   npm run seed
   ```

### ClickHouse Configuration

1. **Install ClickHouse**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y apt-transport-https ca-certificates dirmngr
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv E0C56BD4
   echo "deb https://repo.clickhouse.com/deb/stable/ main/" | sudo tee /etc/apt/sources.list.d/clickhouse.list
   sudo apt-get update
   sudo apt-get install -y clickhouse-server clickhouse-client
   
   # CentOS/RHEL
   sudo yum install -y clickhouse-server clickhouse-client
   ```

2. **Configure ClickHouse**
   ```bash
   # Edit config.xml
   sudo nano /etc/clickhouse-server/config.xml
   
   # Key settings:
   # <listen_host>::</listen_host>
   # <http_port>8123</http_port>
   # <tcp_port>9000</tcp_port>
   ```

3. **Start ClickHouse**
   ```bash
   sudo systemctl start clickhouse-server
   sudo systemctl enable clickhouse-server
   ```

4. **Create Analytics Database**
   ```bash
   clickhouse-client --query "CREATE DATABASE analytics"
   ```

5. **Run ClickHouse Migrations**
   ```bash
   npm run clickhouse:migrate
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
   # port 6380
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
   VALID_API_KEYS=sk-analytics-key-1,sk-analytics-key-2
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
           proxy_pass http://localhost:3004;
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
- **Providers**: `/health/providers` - Database and service status
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
   METRICS_PORT=9091
   ```

2. **Application Performance Monitoring**
   ```bash
   # New Relic
   npm install newrelic
   
   # DataDog
   npm install dd-trace
   ```

## 🔧 AI/ML Configuration

### AI Services Setup

1. **Enable AI Features**
   ```bash
   # Enable AI services
   AI_SERVICE_ENABLED=true
   AI_INSIGHTS_ENABLED=true
   ANOMALY_DETECTION_ENABLED=true
   ```

2. **Configure AI Models**
   ```bash
   # Model paths
   AI_MODEL_PATH=./models
   NLP_MODEL_PATH=./nlp-models
   
   # AI configuration
   AI_CONFIDENCE_THRESHOLD=0.8
   AI_MAX_CONCURRENT_REQUESTS=10
   ```

3. **Power BI Integration**
   ```bash
   # Power BI configuration
   POWERBI_CLIENT_ID=your_client_id
   POWERBI_CLIENT_SECRET=your_client_secret
   POWERBI_TENANT_ID=your_tenant_id
   POWERBI_WORKSPACE_ID=your_workspace_id
   ```

4. **WhatsApp BI Integration**
   ```bash
   # WhatsApp configuration
   WHATSAPP_API_KEY=your_api_key
   WHATSAPP_WEBHOOK_URL=https://your-domain.com/webhooks/whatsapp
   WHATSAPP_PHONE_NUMBER=+1234567890
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy Analytics API

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
        run: docker build -t analytics-api .
      
      - name: Run security scan
        run: |
          docker run --rm -v $(pwd):/app analytics-api npm audit

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
   psql -h localhost -U analytics_user -d analytics_db
   
   # Verify environment variables
   echo $DATABASE_URL
   ```

2. **ClickHouse Connection Failed**
   ```bash
   # Check ClickHouse status
   sudo systemctl status clickhouse-server
   
   # Test ClickHouse connection
   clickhouse-client --query "SELECT 1"
   
   # Check ClickHouse configuration
   clickhouse-client --query "SHOW DATABASES"
   ```

3. **Redis Connection Failed**
   ```bash
   # Check Redis status
   sudo systemctl status redis
   
   # Test Redis connection
   redis-cli ping
   
   # Check Redis configuration
   redis-cli config get "*"
   ```

4. **AI Services Not Working**
   ```bash
   # Check AI service status
   curl http://localhost:3004/health/providers
   
   # Verify AI configuration
   echo $AI_SERVICE_ENABLED
   echo $AI_MODEL_PATH
   ```

5. **High Memory Usage**
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
   CREATE INDEX CONCURRENTLY idx_dashboards_created_at 
   ON dashboards(created_at);
   ```

2. **ClickHouse Optimization**
   ```bash
   # Monitor ClickHouse memory
   clickhouse-client --query "SELECT * FROM system.metrics WHERE metric LIKE '%Memory%'"
   
   # Optimize ClickHouse configuration
   max_memory_usage=10000000000
   max_threads=8
   max_block_size=65536
   ```

3. **Application Optimization**
   ```bash
   # Enable caching
   ANALYTICS_CACHE_ENABLED=true
   ANALYTICS_CACHE_TTL=3600
   
   # Monitor performance
   npm install clinic
   clinic doctor -- node dist/main.js
   ```

## 📚 API Documentation

Once deployed, access the API documentation at:
- **Swagger UI**: `http://localhost:3004/api/docs`
- **OpenAPI JSON**: `http://localhost:3004/api/docs-json`

## 🔧 Maintenance

### Regular Tasks

1. **Database Maintenance**
   ```bash
   # Weekly backup
   pg_dump analytics_db > backup_$(date +%Y%m%d).sql
   
   # Vacuum and analyze
   psql -d analytics_db -c "VACUUM ANALYZE;"
   ```

2. **ClickHouse Maintenance**
   ```bash
   # Optimize tables
   clickhouse-client --query "OPTIMIZE TABLE analytics_events FINAL"
   
   # Check table sizes
   clickhouse-client --query "SELECT table, size FROM system.parts WHERE database = 'analytics'"
   ```

3. **Log Rotation**
   ```bash
   # Configure logrotate
   sudo nano /etc/logrotate.d/analytics-api
   
   # Test log rotation
   sudo logrotate -f /etc/logrotate.d/analytics-api
   ```

4. **Security Updates**
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
   pg_dump -h localhost -U analytics_user analytics_db > full_backup.sql
   
   # Compressed backup
   pg_dump -h localhost -U analytics_user analytics_db | gzip > backup.sql.gz
   ```

2. **ClickHouse Backup**
   ```bash
   # Export data
   clickhouse-client --query "SELECT * FROM analytics_events FORMAT CSV" > analytics_events.csv
   
   # Import data
   clickhouse-client --query "INSERT INTO analytics_events FORMAT CSV" < analytics_events.csv
   ```

3. **Restore Database**
   ```bash
   # Restore from backup
   psql -h localhost -U analytics_user analytics_db < backup.sql
   
   # Restore from compressed backup
   gunzip -c backup.sql.gz | psql -h localhost -U analytics_user analytics_db
   ```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs: `tail -f logs/analytics-api.log`
3. Verify health status: `curl http://localhost:3004/health`
4. Check service dependencies: `docker-compose ps`

## 🎯 Next Steps

After successful deployment:
1. Configure AI/ML models and services
2. Set up monitoring and alerting
3. Configure Power BI and WhatsApp integrations
4. Test all analytics and reporting features
5. Set up CI/CD pipeline
6. Document your specific configuration

---

**🎉 Your Analytics & Reporting module is now deployed and ready to provide powerful insights!**
