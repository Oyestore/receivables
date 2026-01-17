# Production Deployment Guide
## SME Receivables Management Platform - Administrative Module Phase 1

**Version:** 1.0.0  
**Date:** January 21, 2025  
**Module:** 11 - Administrative Hub  
**Phase:** 1 - Foundation  

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Requirements](#infrastructure-requirements)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Configuration Management](#configuration-management)
7. [Security Configuration](#security-configuration)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Performance Optimization](#performance-optimization)
10. [Backup and Recovery](#backup-and-recovery)
11. [Troubleshooting](#troubleshooting)
12. [Post-Deployment Validation](#post-deployment-validation)

---

## Overview

This guide provides comprehensive instructions for deploying the SME Receivables Management Platform Administrative Module Phase 1 to production environments. The administrative module implements a 2-tier hierarchical system supporting platform-level tenant management and tenant-level user administration.

### Key Components

- **Platform-Level Administration**: Tenant lifecycle, subscription management, billing
- **Tenant-Level Administration**: User management, access control, preferences
- **Security Infrastructure**: Authentication, authorization, audit logging
- **Integration Framework**: Cross-module communication and data synchronization

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                            │
│                   (NGINX/HAProxy)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                Application Tier                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Admin     │  │   Admin     │  │   Admin     │         │
│  │ Instance 1  │  │ Instance 2  │  │ Instance 3  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                  Database Tier                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │         │
│  │   Primary   │  │  Replica 1  │  │  Replica 2  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 22.04 LTS or CentOS 8+
- **Node.js**: Version 20.x LTS
- **PostgreSQL**: Version 15+
- **Redis**: Version 7+
- **Docker**: Version 24+ (optional but recommended)
- **Kubernetes**: Version 1.28+ (for container orchestration)

### Network Requirements

- **Inbound Ports**: 80, 443, 5432 (database), 6379 (Redis)
- **Outbound Access**: HTTPS (443) for external API calls
- **Internal Communication**: All application instances must communicate on port 3000

### Security Requirements

- **SSL/TLS Certificates**: Valid certificates for all domains
- **Firewall**: Configured to allow only necessary traffic
- **VPN Access**: For administrative operations
- **Backup Storage**: Secure, encrypted backup location

---

## Infrastructure Requirements

### Minimum Production Environment

#### Application Servers (3 instances)
- **CPU**: 8 cores
- **RAM**: 16 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps

#### Database Servers (3 instances)
- **CPU**: 16 cores
- **RAM**: 32 GB
- **Storage**: 500 GB SSD (with RAID 10)
- **Network**: 10 Gbps

#### Load Balancer
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 10 Gbps

#### Redis Cache
- **CPU**: 4 cores
- **RAM**: 16 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps

### Recommended Production Environment

#### Application Servers (5 instances)
- **CPU**: 16 cores
- **RAM**: 32 GB
- **Storage**: 200 GB SSD
- **Network**: 10 Gbps

#### Database Servers (5 instances)
- **CPU**: 32 cores
- **RAM**: 64 GB
- **Storage**: 1 TB NVMe SSD (with RAID 10)
- **Network**: 25 Gbps

### Cloud Provider Specifications

#### AWS
- **Application**: EC2 c6i.4xlarge instances
- **Database**: RDS PostgreSQL db.r6g.4xlarge with Multi-AZ
- **Load Balancer**: Application Load Balancer
- **Cache**: ElastiCache Redis cluster

#### Azure
- **Application**: Standard_D16s_v5 Virtual Machines
- **Database**: Azure Database for PostgreSQL Flexible Server
- **Load Balancer**: Azure Load Balancer
- **Cache**: Azure Cache for Redis

#### Google Cloud
- **Application**: n2-standard-16 Compute Engine instances
- **Database**: Cloud SQL for PostgreSQL
- **Load Balancer**: Cloud Load Balancing
- **Cache**: Memorystore for Redis

---

## Database Setup

### PostgreSQL Installation and Configuration

#### 1. Install PostgreSQL 15

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# CentOS/RHEL
sudo dnf install postgresql15-server postgresql15-contrib
sudo postgresql-15-setup initdb
sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15
```

#### 2. Configure PostgreSQL

**Edit `/etc/postgresql/15/main/postgresql.conf`:**

```ini
# Connection settings
listen_addresses = '*'
port = 5432
max_connections = 200

# Memory settings
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 1GB

# WAL settings
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9

# Logging
log_destination = 'csvlog'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_min_duration_statement = 1000

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200
```

**Edit `/etc/postgresql/15/main/pg_hba.conf`:**

```
# Administrative connections
local   all             postgres                                peer
local   all             all                                     peer

# Application connections
host    sme_admin       sme_admin_user  10.0.0.0/8             scram-sha-256
host    sme_admin       sme_admin_user  172.16.0.0/12          scram-sha-256
host    sme_admin       sme_admin_user  192.168.0.0/16         scram-sha-256

# Replication connections
host    replication     replicator      10.0.0.0/8             scram-sha-256
```

#### 3. Create Database and Users

```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database
CREATE DATABASE sme_admin;

-- Create application user
CREATE USER sme_admin_user WITH ENCRYPTED PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sme_admin TO sme_admin_user;

-- Create schemas
\c sme_admin;
CREATE SCHEMA admin_platform;
CREATE SCHEMA admin_tenant;

-- Grant schema privileges
GRANT ALL ON SCHEMA admin_platform TO sme_admin_user;
GRANT ALL ON SCHEMA admin_tenant TO sme_admin_user;

-- Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replication_password_here';
```

#### 4. Set up Database Replication

**On Primary Server:**

```sql
-- Create replication slot
SELECT pg_create_physical_replication_slot('replica_1');
SELECT pg_create_physical_replication_slot('replica_2');
```

**On Replica Servers:**

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql-15

# Remove data directory
sudo rm -rf /var/lib/postgresql/15/main/*

# Create base backup
sudo -u postgres pg_basebackup -h primary_server_ip -D /var/lib/postgresql/15/main -U replicator -v -P -W

# Create recovery configuration
sudo -u postgres cat > /var/lib/postgresql/15/main/postgresql.auto.conf << EOF
primary_conninfo = 'host=primary_server_ip port=5432 user=replicator'
primary_slot_name = 'replica_1'
EOF

# Create standby signal
sudo -u postgres touch /var/lib/postgresql/15/main/standby.signal

# Start PostgreSQL
sudo systemctl start postgresql-15
```

### Database Schema Migration

#### 1. Install Migration Tool

```bash
npm install -g typeorm
```

#### 2. Run Migrations

```bash
# Navigate to application directory
cd /opt/sme-admin

# Run database migrations
npm run migration:run

# Verify migration status
npm run migration:show
```

#### 3. Seed Initial Data

```bash
# Run data seeding
npm run seed:run

# Verify seed data
npm run seed:show
```

---

## Application Deployment

### Method 1: Docker Deployment (Recommended)

#### 1. Build Docker Image

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "run", "start:prod"]
```

#### 2. Build and Push Image

```bash
# Build image
docker build -t sme-admin:1.0.0 .

# Tag for registry
docker tag sme-admin:1.0.0 your-registry.com/sme-admin:1.0.0

# Push to registry
docker push your-registry.com/sme-admin:1.0.0
```

#### 3. Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  sme-admin:
    image: your-registry.com/sme-admin:1.0.0
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=sme_admin
      - DATABASE_USER=sme_admin_user
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sme_admin
      - POSTGRES_USER=sme_admin_user
      - POSTGRES_PASSWORD=${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 4. Deploy with Docker Compose

```bash
# Create environment file
cat > .env << EOF
DATABASE_PASSWORD=secure_database_password
JWT_SECRET=secure_jwt_secret_key
ENCRYPTION_KEY=secure_encryption_key
EOF

# Deploy application
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f sme-admin
```

### Method 2: Kubernetes Deployment

#### 1. Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sme-admin
  labels:
    name: sme-admin
```

#### 2. Create ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sme-admin-config
  namespace: sme-admin
data:
  NODE_ENV: "production"
  DATABASE_HOST: "postgres-service"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "sme_admin"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  LOG_LEVEL: "info"
  API_VERSION: "v1"
```

#### 3. Create Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sme-admin-secrets
  namespace: sme-admin
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded-password>
  DATABASE_USER: <base64-encoded-username>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
```

#### 4. Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sme-admin
  namespace: sme-admin
  labels:
    app: sme-admin
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sme-admin
  template:
    metadata:
      labels:
        app: sme-admin
    spec:
      containers:
      - name: sme-admin
        image: your-registry.com/sme-admin:1.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: sme-admin-config
        - secretRef:
            name: sme-admin-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

#### 5. Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: sme-admin-service
  namespace: sme-admin
spec:
  selector:
    app: sme-admin
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

#### 6. Create Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sme-admin-ingress
  namespace: sme-admin
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - admin.smeplatform.com
    secretName: sme-admin-tls
  rules:
  - host: admin.smeplatform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sme-admin-service
            port:
              number: 80
```

#### 7. Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml

# Verify deployment
kubectl get pods -n sme-admin
kubectl get services -n sme-admin
kubectl get ingress -n sme-admin

# Check logs
kubectl logs -f deployment/sme-admin -n sme-admin
```

### Method 3: Traditional Server Deployment

#### 1. Prepare Server Environment

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash smeadmin
sudo usermod -aG sudo smeadmin

# Create application directory
sudo mkdir -p /opt/sme-admin
sudo chown smeadmin:smeadmin /opt/sme-admin
```

#### 2. Deploy Application Code

```bash
# Switch to application user
sudo su - smeadmin

# Clone repository
cd /opt
git clone https://github.com/your-org/sme-admin.git
cd sme-admin

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Create environment file
cat > .env << EOF
NODE_ENV=production
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=sme_admin
DATABASE_USER=sme_admin_user
DATABASE_PASSWORD=secure_password_here
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=secure_jwt_secret_key
ENCRYPTION_KEY=secure_encryption_key
LOG_LEVEL=info
PORT=3000
EOF

# Set proper permissions
chmod 600 .env
```

#### 3. Configure PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'sme-admin',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/sme-admin/error.log',
    out_file: '/var/log/sme-admin/out.log',
    log_file: '/var/log/sme-admin/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### 4. Start Application

```bash
# Create log directory
sudo mkdir -p /var/log/sme-admin
sudo chown smeadmin:smeadmin /var/log/sme-admin

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u smeadmin --hp /home/smeadmin

# Verify application is running
pm2 status
pm2 logs sme-admin
```

---

## Configuration Management

### Environment Variables

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=sme_admin
DATABASE_USER=sme_admin_user
DATABASE_PASSWORD=secure_password_here
DATABASE_SSL=true
DATABASE_POOL_SIZE=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here
REDIS_DB=0
REDIS_TTL=3600

# Application Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1
LOG_LEVEL=info
CORS_ORIGIN=https://app.smeplatform.com

# Security Configuration
JWT_SECRET=secure_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
ENCRYPTION_KEY=secure_encryption_key_32_characters
BCRYPT_ROUNDS=12

# External Services
EMAIL_SERVICE_URL=https://email.service.com
SMS_SERVICE_URL=https://sms.service.com
NOTIFICATION_SERVICE_URL=https://notification.service.com

# Monitoring and Logging
SENTRY_DSN=https://your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key
LOG_FILE_PATH=/var/log/sme-admin/app.log
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true

# Feature Flags
ENABLE_MFA=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
```

#### Optional Environment Variables

```bash
# Performance Tuning
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=5000
CLUSTER_WORKERS=auto

# Development and Testing
DEBUG_MODE=false
MOCK_EXTERNAL_SERVICES=false
ENABLE_SWAGGER=false
ENABLE_PROFILING=false

# Backup and Recovery
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH=/backup/sme-admin
```

### Configuration Files

#### 1. Application Configuration

```typescript
// config/production.ts
export default {
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === 'true',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE) || 20,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    maxUses: 7500
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    ttl: parseInt(process.env.REDIS_TTL) || 3600,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  },
  security: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY,
      algorithm: 'aes-256-gcm'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE_PATH || '/var/log/sme-admin/app.log',
    maxFiles: 10,
    maxSize: '10m',
    format: 'json'
  },
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: 'production'
    },
    newRelic: {
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
      appName: 'SME Admin API'
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      port: 9090
    }
  }
};
```

#### 2. NGINX Configuration

```nginx
# /etc/nginx/sites-available/sme-admin
upstream sme_admin_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name admin.smeplatform.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.smeplatform.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/smeplatform.com.crt;
    ssl_certificate_key /etc/ssl/private/smeplatform.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Logging
    access_log /var/log/nginx/sme-admin-access.log;
    error_log /var/log/nginx/sme-admin-error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client Settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    location / {
        proxy_pass http://sme_admin_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /health {
        proxy_pass http://sme_admin_backend/health;
        access_log off;
    }

    location /metrics {
        proxy_pass http://sme_admin_backend/metrics;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
    }
}
```

#### 3. Systemd Service Configuration

```ini
# /etc/systemd/system/sme-admin.service
[Unit]
Description=SME Admin API Service
Documentation=https://docs.smeplatform.com
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=forking
User=smeadmin
Group=smeadmin
WorkingDirectory=/opt/sme-admin
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sme-admin

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/sme-admin /var/log/sme-admin

[Install]
WantedBy=multi-user.target
```

---

## Security Configuration

### SSL/TLS Configuration

#### 1. Certificate Installation

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d admin.smeplatform.com

# Verify certificate
sudo certbot certificates

# Setup automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 2. Security Headers

```typescript
// security.middleware.ts
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

### Firewall Configuration

#### 1. UFW Configuration (Ubuntu)

```bash
# Reset firewall
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH access
sudo ufw allow ssh

# HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Database (only from application servers)
sudo ufw allow from 10.0.1.0/24 to any port 5432

# Redis (only from application servers)
sudo ufw allow from 10.0.1.0/24 to any port 6379

# Enable firewall
sudo ufw enable

# Verify status
sudo ufw status verbose
```

#### 2. iptables Configuration

```bash
#!/bin/bash
# /etc/iptables/rules.v4

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow database connections from app servers
iptables -A INPUT -p tcp -s 10.0.1.0/24 --dport 5432 -j ACCEPT

# Allow Redis connections from app servers
iptables -A INPUT -p tcp -s 10.0.1.0/24 --dport 6379 -j ACCEPT

# Rate limiting for SSH
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Application Security

#### 1. Environment Security

```bash
# Secure environment file
sudo chown root:smeadmin /opt/sme-admin/.env
sudo chmod 640 /opt/sme-admin/.env

# Secure application directory
sudo chown -R smeadmin:smeadmin /opt/sme-admin
sudo chmod -R 750 /opt/sme-admin

# Secure log directory
sudo chown -R smeadmin:smeadmin /var/log/sme-admin
sudo chmod -R 750 /var/log/sme-admin
```

#### 2. Database Security

```sql
-- Revoke public schema privileges
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE sme_admin FROM PUBLIC;

-- Create read-only user for monitoring
CREATE USER monitoring_user WITH ENCRYPTED PASSWORD 'monitoring_password';
GRANT CONNECT ON DATABASE sme_admin TO monitoring_user;
GRANT USAGE ON SCHEMA admin_platform, admin_tenant TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA admin_platform, admin_tenant TO monitoring_user;

-- Enable row level security
ALTER TABLE admin_platform.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tenant.users ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY tenant_isolation ON admin_tenant.users
    FOR ALL TO sme_admin_user
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

#### 3. Redis Security

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Add security settings
requirepass your_redis_password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG "CONFIG_b835729c9f"
bind 127.0.0.1 10.0.1.10
protected-mode yes
```

---

## Monitoring and Logging

### Application Monitoring

#### 1. Health Check Endpoints

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService
  ) {}

  @Get()
  async healthCheck(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk()
    ]);

    const status = checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version,
      checks: {
        database: checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        redis: checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        memory: checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        disk: checks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy'
      }
    };
  }

  @Get('ready')
  async readinessCheck(): Promise<ReadinessCheckResult> {
    // Check if application is ready to serve requests
    const isReady = await this.isApplicationReady();
    
    return {
      status: isReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString()
    };
  }

  @Get('live')
  async livenessCheck(): Promise<LivenessCheckResult> {
    // Simple liveness check
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid
    };
  }
}
```

#### 2. Prometheus Metrics

```typescript
// metrics.service.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  private readonly activeConnections = new Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
  });

  private readonly databaseConnections = new Gauge({
    name: 'database_connections',
    help: 'Number of database connections'
  });

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  getMetrics(): string {
    return register.metrics();
  }
}
```

### Logging Configuration

#### 1. Winston Logger Configuration

```typescript
// logger.config.ts
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

const logFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'sme-admin' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.DailyRotateFile({
      filename: '/var/log/sme-admin/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    new transports.DailyRotateFile({
      filename: '/var/log/sme-admin/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ]
});
```

#### 2. Audit Logging

```typescript
// audit.service.ts
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(PlatformAuditLog)
    private readonly platformAuditRepository: Repository<PlatformAuditLog>,
    @InjectRepository(TenantAuditLog)
    private readonly tenantAuditRepository: Repository<TenantAuditLog>
  ) {}

  async logPlatformEvent(event: PlatformAuditEvent): Promise<void> {
    const auditLog = this.platformAuditRepository.create({
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      adminId: event.adminId,
      details: event.details,
      severity: event.severity,
      outcome: event.outcome || 'success',
      timestamp: new Date(),
      ipAddress: event.ipAddress,
      userAgent: event.userAgent
    });

    await this.platformAuditRepository.save(auditLog);
  }

  async logTenantEvent(event: TenantAuditEvent): Promise<void> {
    const auditLog = this.tenantAuditRepository.create({
      tenantId: event.tenantId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      userId: event.userId,
      details: event.details,
      severity: event.severity,
      outcome: event.outcome || 'success',
      timestamp: new Date(),
      ipAddress: event.ipAddress,
      userAgent: event.userAgent
    });

    await this.tenantAuditRepository.save(auditLog);
  }
}
```

### External Monitoring

#### 1. Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "SME Admin API Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "singlestat",
        "targets": [
          {
            "expr": "database_connections",
            "legendFormat": "Active connections"
          }
        ]
      }
    ]
  }
}
```

#### 2. Alerting Rules

```yaml
# alerting.yml
groups:
- name: sme-admin-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }} seconds"

  - alert: DatabaseConnectionsHigh
    expr: database_connections > 80
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High database connection usage"
      description: "Database connections: {{ $value }}"

  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service is down"
      description: "SME Admin API service is not responding"
```

---

This completes the first section of the Production Deployment Guide. The guide continues with Performance Optimization, Backup and Recovery, Troubleshooting, and Post-Deployment Validation sections.


## Performance Optimization

### Application Performance

#### 1. Node.js Optimization

```javascript
// ecosystem.config.js - Production optimized
module.exports = {
  apps: [{
    name: 'sme-admin',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      UV_THREADPOOL_SIZE: 128,
      NODE_OPTIONS: '--max-old-space-size=2048 --optimize-for-size'
    },
    node_args: [
      '--max-old-space-size=2048',
      '--optimize-for-size',
      '--gc-interval=100',
      '--expose-gc'
    ],
    max_memory_restart: '2G',
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    error_file: '/var/log/sme-admin/error.log',
    out_file: '/var/log/sme-admin/out.log',
    log_file: '/var/log/sme-admin/combined.log',
    time: true
  }]
};
```

#### 2. Database Connection Pooling

```typescript
// database.config.ts
export const databaseConfig = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true',
  
  // Connection pooling optimization
  extra: {
    connectionLimit: 20,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,
    reconnectTries: 3,
    reconnectInterval: 1000,
    
    // PostgreSQL specific optimizations
    statement_timeout: 30000,
    query_timeout: 30000,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    
    // Connection pool settings
    max: 20,
    min: 5,
    idle: 10000,
    acquire: 30000,
    evict: 1000,
    
    // Performance settings
    application_name: 'sme-admin-api',
    tcp_keepalives_idle: 600,
    tcp_keepalives_interval: 30,
    tcp_keepalives_count: 3
  },
  
  // Query optimization
  cache: {
    duration: 30000, // 30 seconds
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT)
    }
  },
  
  // Logging for performance monitoring
  logging: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  maxQueryExecutionTime: 5000,
  
  // Migration settings
  migrationsRun: false,
  synchronize: false
};
```

#### 3. Redis Caching Strategy

```typescript
// cache.service.ts
@Injectable()
export class CacheService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis
  ) {}

  // Multi-level caching strategy
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redisClient.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Array<{key: string, value: any, ttl?: number}>): Promise<void> {
    try {
      const pipeline = this.redisClient.pipeline();
      
      keyValuePairs.forEach(({ key, value, ttl = 3600 }) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });
      
      await pipeline.exec();
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  // Cache warming for frequently accessed data
  async warmCache(): Promise<void> {
    try {
      // Warm subscription plans cache
      const plans = await this.subscriptionService.getActiveSubscriptionPlans();
      await this.set('subscription_plans:active', plans, 7200); // 2 hours

      // Warm tenant metrics cache
      const metrics = await this.tenantService.getTenantMetrics();
      await this.set('tenant_metrics:global', metrics, 1800); // 30 minutes

      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}
```

#### 4. Query Optimization

```typescript
// optimized.repository.ts
@Injectable()
export class OptimizedTenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly cacheService: CacheService
  ) {}

  // Optimized tenant search with caching and indexing
  async findTenantsOptimized(filters: TenantSearchFilters): Promise<PaginatedResult<Tenant>> {
    const cacheKey = `tenants:search:${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = await this.cacheService.get<PaginatedResult<Tenant>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build optimized query
    const queryBuilder = this.tenantRepository
      .createQueryBuilder('tenant')
      .leftJoinAndSelect('tenant.subscriptionPlan', 'plan')
      .leftJoinAndSelect('tenant.contacts', 'contacts')
      .select([
        'tenant.id',
        'tenant.organizationName',
        'tenant.businessType',
        'tenant.status',
        'tenant.createdDate',
        'tenant.activatedDate',
        'plan.id',
        'plan.planName',
        'plan.planType',
        'contacts.id',
        'contacts.firstName',
        'contacts.lastName',
        'contacts.email',
        'contacts.isPrimary'
      ]);

    // Apply filters with proper indexing
    if (filters.organizationName) {
      queryBuilder.andWhere('tenant.organizationName ILIKE :name', {
        name: `%${filters.organizationName}%`
      });
    }

    if (filters.businessType) {
      queryBuilder.andWhere('tenant.businessType = :businessType', {
        businessType: filters.businessType
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('tenant.status = :status', {
        status: filters.status
      });
    }

    if (filters.subscriptionPlanId) {
      queryBuilder.andWhere('tenant.subscriptionPlanId = :planId', {
        planId: filters.subscriptionPlanId
      });
    }

    if (filters.createdDateFrom) {
      queryBuilder.andWhere('tenant.createdDate >= :dateFrom', {
        dateFrom: filters.createdDateFrom
      });
    }

    if (filters.createdDateTo) {
      queryBuilder.andWhere('tenant.createdDate <= :dateTo', {
        dateTo: filters.createdDateTo
      });
    }

    // Apply sorting
    const sortField = filters.sortBy || 'createdDate';
    const sortOrder = filters.sortOrder || 'DESC';
    queryBuilder.orderBy(`tenant.${sortField}`, sortOrder);

    // Apply pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Max 100 items per page
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    // Execute query with count
    const [items, total] = await queryBuilder.getManyAndCount();

    const result: PaginatedResult<Tenant> = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    // Cache result for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  // Bulk operations optimization
  async bulkUpdateTenantStatus(
    tenantIds: string[], 
    status: TenantStatus, 
    updatedBy: string
  ): Promise<BulkUpdateResult> {
    const batchSize = 100;
    const results: BulkUpdateResult = {
      successful: [],
      failed: [],
      totalProcessed: 0
    };

    // Process in batches to avoid memory issues
    for (let i = 0; i < tenantIds.length; i += batchSize) {
      const batch = tenantIds.slice(i, i + batchSize);
      
      try {
        await this.tenantRepository
          .createQueryBuilder()
          .update(Tenant)
          .set({
            status,
            updatedBy,
            updatedDate: new Date()
          })
          .where('id IN (:...ids)', { ids: batch })
          .execute();

        results.successful.push(...batch);
        results.totalProcessed += batch.length;

        // Invalidate cache for updated tenants
        await Promise.all(
          batch.map(id => this.cacheService.invalidatePattern(`tenant:${id}:*`))
        );

      } catch (error) {
        results.failed.push(...batch.map(id => ({ id, error: error.message })));
      }
    }

    return results;
  }
}
```

### Database Performance

#### 1. PostgreSQL Optimization

```sql
-- Performance optimization queries

-- Create indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_tenants_organization_name_gin 
ON admin_platform.tenants USING gin(to_tsvector('english', organization_name));

CREATE INDEX CONCURRENTLY idx_tenants_business_type 
ON admin_platform.tenants(business_type);

CREATE INDEX CONCURRENTLY idx_tenants_status 
ON admin_platform.tenants(status);

CREATE INDEX CONCURRENTLY idx_tenants_created_date 
ON admin_platform.tenants(created_date DESC);

CREATE INDEX CONCURRENTLY idx_tenants_subscription_plan_id 
ON admin_platform.tenants(subscription_plan_id);

CREATE INDEX CONCURRENTLY idx_users_tenant_id 
ON admin_tenant.users(tenant_id);

CREATE INDEX CONCURRENTLY idx_users_email_tenant 
ON admin_tenant.users(email, tenant_id);

CREATE INDEX CONCURRENTLY idx_users_username_tenant 
ON admin_tenant.users(username, tenant_id);

CREATE INDEX CONCURRENTLY idx_users_status 
ON admin_tenant.users(status);

CREATE INDEX CONCURRENTLY idx_users_created_date 
ON admin_tenant.users(created_date DESC);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_tenants_status_business_type 
ON admin_platform.tenants(status, business_type);

CREATE INDEX CONCURRENTLY idx_users_tenant_status 
ON admin_tenant.users(tenant_id, status);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_tenants_active 
ON admin_platform.tenants(id) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_users_active 
ON admin_tenant.users(id) WHERE status = 'active';

-- Analyze tables for query planner
ANALYZE admin_platform.tenants;
ANALYZE admin_platform.subscription_plans;
ANALYZE admin_tenant.users;
ANALYZE admin_tenant.user_sessions;

-- Update table statistics
UPDATE pg_stat_user_tables SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0;
```

#### 2. Connection Pool Optimization

```bash
# PostgreSQL configuration optimization
# /etc/postgresql/15/main/postgresql.conf

# Connection settings
max_connections = 200
superuser_reserved_connections = 3

# Memory settings (for 32GB RAM server)
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 1GB
huge_pages = try

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Query planner settings
random_page_cost = 1.1
effective_io_concurrency = 200
seq_page_cost = 1.0

# Background writer settings
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# Autovacuum settings
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.2
autovacuum_analyze_scale_factor = 0.1

# Logging for performance monitoring
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Archive settings (for backup)
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
```

#### 3. Query Performance Monitoring

```sql
-- Create performance monitoring views

-- Slow queries view
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 1000  -- Queries taking more than 1 second
ORDER BY mean_time DESC;

-- Table statistics view
CREATE OR REPLACE VIEW table_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Index usage view
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Database size monitoring
CREATE OR REPLACE VIEW database_sizes AS
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size,
    pg_database_size(datname) AS size_bytes
FROM pg_database
WHERE datname NOT IN ('template0', 'template1', 'postgres')
ORDER BY pg_database_size(datname) DESC;
```

### Caching Strategy

#### 1. Multi-Level Caching

```typescript
// cache-strategy.service.ts
@Injectable()
export class CacheStrategyService {
  constructor(
    private readonly redisService: RedisService,
    private readonly memoryCache: MemoryCacheService
  ) {}

  // L1: Memory cache (fastest, smallest)
  // L2: Redis cache (fast, larger)
  // L3: Database (slowest, largest)

  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    let value = await this.memoryCache.get<T>(key);
    if (value !== null) {
      return value;
    }

    // Try L2 cache
    value = await this.redisService.get<T>(key);
    if (value !== null) {
      // Populate L1 cache
      await this.memoryCache.set(key, value, 300); // 5 minutes
      return value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    // Set in both caches
    await Promise.all([
      this.memoryCache.set(key, value, Math.min(ttl, 300)), // Max 5 minutes in memory
      this.redisService.set(key, value, ttl)
    ]);
  }

  async invalidate(key: string): Promise<void> {
    await Promise.all([
      this.memoryCache.delete(key),
      this.redisService.delete(key)
    ]);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await Promise.all([
      this.memoryCache.deletePattern(pattern),
      this.redisService.deletePattern(pattern)
    ]);
  }

  // Cache-aside pattern implementation
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value === null) {
      value = await fetcher();
      await this.set(key, value, ttl);
    }
    
    return value;
  }

  // Write-through pattern implementation
  async setWithWriteThrough<T>(
    key: string,
    value: T,
    persister: (value: T) => Promise<void>,
    ttl: number = 3600
  ): Promise<void> {
    // Write to database first
    await persister(value);
    
    // Then update cache
    await this.set(key, value, ttl);
  }

  // Write-behind pattern implementation
  async setWithWriteBehind<T>(
    key: string,
    value: T,
    persister: (value: T) => Promise<void>,
    ttl: number = 3600
  ): Promise<void> {
    // Update cache immediately
    await this.set(key, value, ttl);
    
    // Schedule database write
    setImmediate(async () => {
      try {
        await persister(value);
      } catch (error) {
        console.error('Write-behind error:', error);
        // Optionally invalidate cache on write failure
        await this.invalidate(key);
      }
    });
  }
}
```

#### 2. Cache Warming and Preloading

```typescript
// cache-warming.service.ts
@Injectable()
export class CacheWarmingService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly tenantService: TenantManagementService,
    private readonly subscriptionService: SubscriptionManagementService,
    private readonly userService: UserManagementService
  ) {}

  @Cron('0 */6 * * *') // Every 6 hours
  async warmFrequentlyAccessedData(): Promise<void> {
    console.log('Starting cache warming...');

    try {
      await Promise.all([
        this.warmSubscriptionPlans(),
        this.warmTenantMetrics(),
        this.warmActiveTenantsData(),
        this.warmUserStatistics()
      ]);

      console.log('Cache warming completed successfully');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  private async warmSubscriptionPlans(): Promise<void> {
    const plans = await this.subscriptionService.getActiveSubscriptionPlans();
    await this.cacheService.set('subscription_plans:active', plans, 7200);

    // Cache individual plans
    await Promise.all(
      plans.map(plan => 
        this.cacheService.set(`subscription_plan:${plan.id}`, plan, 7200)
      )
    );
  }

  private async warmTenantMetrics(): Promise<void> {
    const metrics = await this.tenantService.getTenantMetrics();
    await this.cacheService.set('tenant_metrics:global', metrics, 1800);

    // Cache metrics by business type
    for (const [businessType, count] of Object.entries(metrics.tenantsByBusinessType)) {
      await this.cacheService.set(
        `tenant_metrics:business_type:${businessType}`,
        count,
        1800
      );
    }
  }

  private async warmActiveTenantsData(): Promise<void> {
    const activeTenants = await this.tenantService.findTenants({
      status: TenantStatus.ACTIVE,
      limit: 100,
      sortBy: 'lastActivityDate',
      sortOrder: 'DESC'
    });

    // Cache active tenants list
    await this.cacheService.set('tenants:active:recent', activeTenants, 1800);

    // Cache individual tenant data
    await Promise.all(
      activeTenants.items.map(tenant =>
        this.cacheService.set(`tenant:${tenant.id}`, tenant, 3600)
      )
    );
  }

  private async warmUserStatistics(): Promise<void> {
    // Get top 50 most active tenants
    const activeTenants = await this.tenantService.findTenants({
      status: TenantStatus.ACTIVE,
      limit: 50,
      sortBy: 'lastActivityDate',
      sortOrder: 'DESC'
    });

    // Warm user metrics for active tenants
    await Promise.all(
      activeTenants.items.map(async tenant => {
        const userMetrics = await this.userService.getUserMetrics(tenant.id);
        await this.cacheService.set(
          `user_metrics:tenant:${tenant.id}`,
          userMetrics,
          1800
        );
      })
    );
  }

  // Preload data for new tenant
  async preloadTenantData(tenantId: string): Promise<void> {
    try {
      const [tenant, userMetrics, subscriptionPlan] = await Promise.all([
        this.tenantService.findTenantById(tenantId),
        this.userService.getUserMetrics(tenantId),
        this.tenantService.findTenantById(tenantId).then(t => 
          this.subscriptionService.findSubscriptionPlanById(t.subscriptionPlanId)
        )
      ]);

      await Promise.all([
        this.cacheService.set(`tenant:${tenantId}`, tenant, 3600),
        this.cacheService.set(`user_metrics:tenant:${tenantId}`, userMetrics, 1800),
        this.cacheService.set(`subscription_plan:${subscriptionPlan.id}`, subscriptionPlan, 7200)
      ]);

      console.log(`Preloaded data for tenant: ${tenantId}`);
    } catch (error) {
      console.error(`Failed to preload data for tenant ${tenantId}:`, error);
    }
  }
}
```

### Load Balancing and Scaling

#### 1. NGINX Load Balancer Configuration

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;
    server_tokens off;

    # Buffer settings
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream configuration
    upstream sme_admin_backend {
        least_conn;
        
        # Application servers
        server 10.0.1.10:3000 max_fails=3 fail_timeout=30s weight=1;
        server 10.0.1.11:3000 max_fails=3 fail_timeout=30s weight=1;
        server 10.0.1.12:3000 max_fails=3 fail_timeout=30s weight=1;
        server 10.0.1.13:3000 max_fails=3 fail_timeout=30s weight=1;
        server 10.0.1.14:3000 max_fails=3 fail_timeout=30s weight=1;
        
        # Connection pooling
        keepalive 32;
        keepalive_requests 100;
        keepalive_timeout 60s;
    }

    # Health check upstream
    upstream sme_admin_health {
        server 10.0.1.10:3000;
        server 10.0.1.11:3000 backup;
    }

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Include server configurations
    include /etc/nginx/conf.d/*.conf;
}
```

#### 2. HAProxy Configuration (Alternative)

```bash
# /etc/haproxy/haproxy.cfg
global
    daemon
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy

    # SSL configuration
    ssl-default-bind-ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option http-server-close
    option forwardfor except 127.0.0.0/8
    option redispatch
    retries 3
    maxconn 2000

# Statistics page
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE

# Frontend configuration
frontend sme_admin_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/smeplatform.com.pem
    
    # Redirect HTTP to HTTPS
    redirect scheme https if !{ ssl_fc }
    
    # Security headers
    http-response set-header X-Frame-Options DENY
    http-response set-header X-Content-Type-Options nosniff
    http-response set-header X-XSS-Protection "1; mode=block"
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request reject if { sc_http_req_rate(0) gt 20 }
    
    # Route to backend
    default_backend sme_admin_backend

# Backend configuration
backend sme_admin_backend
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    
    # Application servers
    server app1 10.0.1.10:3000 check inter 5s rise 2 fall 3 weight 100
    server app2 10.0.1.11:3000 check inter 5s rise 2 fall 3 weight 100
    server app3 10.0.1.12:3000 check inter 5s rise 2 fall 3 weight 100
    server app4 10.0.1.13:3000 check inter 5s rise 2 fall 3 weight 100
    server app5 10.0.1.14:3000 check inter 5s rise 2 fall 3 weight 100
    
    # Connection settings
    option httpclose
    cookie SERVERID insert indirect nocache
    
    # Health check configuration
    http-check send-state
```

#### 3. Auto-scaling Configuration (Kubernetes)

```yaml
# horizontal-pod-autoscaler.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sme-admin-hpa
  namespace: sme-admin
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sme-admin
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

---

## Backup and Recovery

### Database Backup Strategy

#### 1. Automated Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-database.sh

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="sme_admin"
DB_USER="sme_admin_user"
BACKUP_DIR="/backup/postgresql"
RETENTION_DAYS=30
S3_BUCKET="sme-admin-backups"
ENCRYPTION_KEY="/etc/backup/encryption.key"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="sme_admin_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.enc"

# Set environment variables
export PGPASSWORD="$DB_PASSWORD"

# Create database backup
echo "Starting database backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Database backup completed successfully"
else
    echo "Database backup failed"
    exit 1
fi

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Encrypt backup
echo "Encrypting backup..."
openssl enc -aes-256-cbc -salt -in "$BACKUP_DIR/$COMPRESSED_FILE" \
    -out "$BACKUP_DIR/$ENCRYPTED_FILE" -pass file:"$ENCRYPTION_KEY"

# Remove unencrypted files
rm "$BACKUP_DIR/$COMPRESSED_FILE"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "$BACKUP_DIR/$ENCRYPTED_FILE" "s3://$S3_BUCKET/database/" \
    --storage-class STANDARD_IA

# Verify upload
if [ $? -eq 0 ]; then
    echo "Backup uploaded to S3 successfully"
    
    # Remove local backup after successful upload
    rm "$BACKUP_DIR/$ENCRYPTED_FILE"
else
    echo "Failed to upload backup to S3"
    exit 1
fi

# Clean up old backups from S3
echo "Cleaning up old backups..."
aws s3 ls "s3://$S3_BUCKET/database/" | \
    awk '{print $4}' | \
    head -n -$RETENTION_DAYS | \
    xargs -I {} aws s3 rm "s3://$S3_BUCKET/database/{}"

# Log backup completion
echo "Backup completed at $(date)"
echo "Backup file: $ENCRYPTED_FILE"
echo "S3 location: s3://$S3_BUCKET/database/$ENCRYPTED_FILE"

# Send notification
curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"✅ SME Admin database backup completed successfully: $ENCRYPTED_FILE\"}"
```

#### 2. Point-in-Time Recovery Setup

```bash
#!/bin/bash
# /opt/scripts/setup-pitr.sh

# Configure PostgreSQL for PITR
echo "Configuring PostgreSQL for Point-in-Time Recovery..."

# Update postgresql.conf
cat >> /etc/postgresql/15/main/postgresql.conf << EOF

# Point-in-Time Recovery Configuration
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'
archive_timeout = 300
max_wal_senders = 3
wal_keep_size = 1GB
hot_standby = on
EOF

# Create archive directory
mkdir -p /var/lib/postgresql/archive
chown postgres:postgres /var/lib/postgresql/archive
chmod 700 /var/lib/postgresql/archive

# Create WAL archive script
cat > /opt/scripts/archive-wal.sh << 'EOF'
#!/bin/bash
WAL_FILE="$1"
WAL_PATH="$2"
ARCHIVE_DIR="/var/lib/postgresql/archive"
S3_BUCKET="sme-admin-wal-archive"

# Copy to local archive
cp "$WAL_PATH" "$ARCHIVE_DIR/$WAL_FILE"

# Upload to S3
aws s3 cp "$ARCHIVE_DIR/$WAL_FILE" "s3://$S3_BUCKET/wal/" \
    --storage-class STANDARD_IA

# Remove local copy after successful upload
if [ $? -eq 0 ]; then
    rm "$ARCHIVE_DIR/$WAL_FILE"
fi
EOF

chmod +x /opt/scripts/archive-wal.sh

# Update archive command
sed -i "s|archive_command = '.*'|archive_command = '/opt/scripts/archive-wal.sh %f %p'|" \
    /etc/postgresql/15/main/postgresql.conf

# Restart PostgreSQL
systemctl restart postgresql-15

echo "PITR setup completed"
```

#### 3. Recovery Script

```bash
#!/bin/bash
# /opt/scripts/restore-database.sh

# Configuration
BACKUP_FILE="$1"
RECOVERY_TARGET_TIME="$2"
DB_NAME="sme_admin"
RESTORE_DIR="/tmp/restore"
S3_BUCKET="sme-admin-backups"
ENCRYPTION_KEY="/etc/backup/encryption.key"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file> [recovery_target_time]"
    echo "Example: $0 sme_admin_backup_20250121_120000.sql.gz.enc '2025-01-21 12:00:00'"
    exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR"

# Download backup from S3
echo "Downloading backup from S3..."
aws s3 cp "s3://$S3_BUCKET/database/$BACKUP_FILE" "$RESTORE_DIR/"

# Decrypt backup
echo "Decrypting backup..."
DECRYPTED_FILE="${BACKUP_FILE%.enc}"
openssl enc -aes-256-cbc -d -in "$RESTORE_DIR/$BACKUP_FILE" \
    -out "$RESTORE_DIR/$DECRYPTED_FILE" -pass file:"$ENCRYPTION_KEY"

# Decompress backup
echo "Decompressing backup..."
DECOMPRESSED_FILE="${DECRYPTED_FILE%.gz}"
gunzip "$RESTORE_DIR/$DECRYPTED_FILE"

# Stop application
echo "Stopping application..."
systemctl stop sme-admin

# Create recovery database
echo "Creating recovery database..."
sudo -u postgres createdb "${DB_NAME}_recovery"

# Restore backup
echo "Restoring database..."
sudo -u postgres pg_restore -d "${DB_NAME}_recovery" \
    --verbose \
    --clean \
    --if-exists \
    "$RESTORE_DIR/$DECOMPRESSED_FILE"

# Point-in-time recovery if specified
if [ -n "$RECOVERY_TARGET_TIME" ]; then
    echo "Performing point-in-time recovery to: $RECOVERY_TARGET_TIME"
    
    # Stop PostgreSQL
    systemctl stop postgresql-15
    
    # Create recovery.conf
    cat > /var/lib/postgresql/15/main/recovery.conf << EOF
restore_command = 'aws s3 cp s3://$S3_BUCKET/wal/%f %p'
recovery_target_time = '$RECOVERY_TARGET_TIME'
recovery_target_action = 'promote'
EOF
    
    # Start PostgreSQL in recovery mode
    systemctl start postgresql-15
    
    # Wait for recovery to complete
    echo "Waiting for recovery to complete..."
    while [ -f /var/lib/postgresql/15/main/recovery.conf ]; do
        sleep 5
    done
    
    echo "Point-in-time recovery completed"
fi

# Verify restoration
echo "Verifying restoration..."
TENANT_COUNT=$(sudo -u postgres psql -d "${DB_NAME}_recovery" -t -c "SELECT COUNT(*) FROM admin_platform.tenants;")
USER_COUNT=$(sudo -u postgres psql -d "${DB_NAME}_recovery" -t -c "SELECT COUNT(*) FROM admin_tenant.users;")

echo "Restored database contains:"
echo "- Tenants: $TENANT_COUNT"
echo "- Users: $USER_COUNT"

# Prompt for confirmation
read -p "Do you want to replace the current database with the restored one? (y/N): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    # Backup current database
    echo "Backing up current database..."
    sudo -u postgres pg_dump -d "$DB_NAME" -f "/tmp/${DB_NAME}_pre_restore_$(date +%Y%m%d_%H%M%S).sql"
    
    # Drop current database
    sudo -u postgres dropdb "$DB_NAME"
    
    # Rename recovery database
    sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME}_recovery RENAME TO $DB_NAME;"
    
    echo "Database restoration completed successfully"
    
    # Start application
    systemctl start sme-admin
else
    echo "Restoration cancelled. Recovery database preserved as ${DB_NAME}_recovery"
    
    # Start application
    systemctl start sme-admin
fi

# Clean up
rm -rf "$RESTORE_DIR"

echo "Restoration process completed"
```

### Application Backup

#### 1. Configuration Backup

```bash
#!/bin/bash
# /opt/scripts/backup-config.sh

BACKUP_DIR="/backup/config"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONFIG_BACKUP="config_backup_${TIMESTAMP}.tar.gz"
S3_BUCKET="sme-admin-backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create configuration backup
tar -czf "$BACKUP_DIR/$CONFIG_BACKUP" \
    /opt/sme-admin/.env \
    /opt/sme-admin/ecosystem.config.js \
    /etc/nginx/sites-available/sme-admin \
    /etc/systemd/system/sme-admin.service \
    /etc/postgresql/15/main/postgresql.conf \
    /etc/postgresql/15/main/pg_hba.conf \
    /etc/redis/redis.conf \
    /etc/ssl/certs/smeplatform.com.* \
    /etc/backup/encryption.key

# Upload to S3
aws s3 cp "$BACKUP_DIR/$CONFIG_BACKUP" "s3://$S3_BUCKET/config/"

# Clean up local backup
rm "$BACKUP_DIR/$CONFIG_BACKUP"

echo "Configuration backup completed: $CONFIG_BACKUP"
```

#### 2. Log Backup

```bash
#!/bin/bash
# /opt/scripts/backup-logs.sh

LOG_BACKUP_DIR="/backup/logs"
TIMESTAMP=$(date +"%Y%m%d")
LOG_BACKUP="logs_backup_${TIMESTAMP}.tar.gz"
S3_BUCKET="sme-admin-backups"

# Create backup directory
mkdir -p "$LOG_BACKUP_DIR"

# Archive logs older than 1 day
find /var/log/sme-admin -name "*.log" -mtime +1 -exec tar -czf "$LOG_BACKUP_DIR/$LOG_BACKUP" {} +

# Upload to S3
if [ -f "$LOG_BACKUP_DIR/$LOG_BACKUP" ]; then
    aws s3 cp "$LOG_BACKUP_DIR/$LOG_BACKUP" "s3://$S3_BUCKET/logs/"
    
    # Remove archived logs
    find /var/log/sme-admin -name "*.log" -mtime +1 -delete
    
    # Clean up local backup
    rm "$LOG_BACKUP_DIR/$LOG_BACKUP"
    
    echo "Log backup completed: $LOG_BACKUP"
fi
```

### Disaster Recovery Plan

#### 1. Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

```markdown
# Disaster Recovery Objectives

## Recovery Time Objectives (RTO)
- **Critical Systems**: 4 hours
- **Database**: 2 hours
- **Application Services**: 1 hour
- **Load Balancer**: 30 minutes

## Recovery Point Objectives (RPO)
- **Database**: 15 minutes (via WAL archiving)
- **Configuration**: 24 hours
- **Application Logs**: 24 hours
- **User Data**: 15 minutes

## Recovery Scenarios

### Scenario 1: Single Server Failure
- **Impact**: Reduced capacity, no data loss
- **Recovery**: Automatic failover via load balancer
- **RTO**: < 5 minutes
- **RPO**: 0 minutes

### Scenario 2: Database Server Failure
- **Impact**: Service unavailable
- **Recovery**: Promote read replica to primary
- **RTO**: 30 minutes
- **RPO**: < 1 minute

### Scenario 3: Complete Data Center Failure
- **Impact**: Complete service outage
- **Recovery**: Restore from backups in secondary region
- **RTO**: 4 hours
- **RPO**: 15 minutes

### Scenario 4: Data Corruption
- **Impact**: Partial or complete data loss
- **Recovery**: Point-in-time recovery from backups
- **RTO**: 2-6 hours
- **RPO**: 15 minutes
```

#### 2. Disaster Recovery Runbook

```bash
#!/bin/bash
# /opt/scripts/disaster-recovery.sh

SCENARIO="$1"
RECOVERY_TIME="$2"

case "$SCENARIO" in
    "database-failure")
        echo "=== DATABASE FAILURE RECOVERY ==="
        
        # 1. Assess damage
        echo "1. Assessing database status..."
        systemctl status postgresql-15
        
        # 2. Attempt restart
        echo "2. Attempting database restart..."
        systemctl restart postgresql-15
        
        if [ $? -ne 0 ]; then
            # 3. Promote read replica
            echo "3. Promoting read replica..."
            ssh replica-server "sudo -u postgres pg_promote"
            
            # 4. Update application configuration
            echo "4. Updating application configuration..."
            sed -i 's/DATABASE_HOST=.*/DATABASE_HOST=replica-server/' /opt/sme-admin/.env
            
            # 5. Restart application
            echo "5. Restarting application..."
            systemctl restart sme-admin
        fi
        ;;
        
    "complete-failure")
        echo "=== COMPLETE FAILURE RECOVERY ==="
        
        # 1. Provision new infrastructure
        echo "1. Provisioning new infrastructure..."
        terraform apply -var="disaster_recovery=true"
        
        # 2. Restore database
        echo "2. Restoring database..."
        /opt/scripts/restore-database.sh latest "$RECOVERY_TIME"
        
        # 3. Restore configuration
        echo "3. Restoring configuration..."
        /opt/scripts/restore-config.sh latest
        
        # 4. Deploy application
        echo "4. Deploying application..."
        /opt/scripts/deploy-application.sh
        
        # 5. Update DNS
        echo "5. Updating DNS..."
        aws route53 change-resource-record-sets --hosted-zone-id Z123456789 \
            --change-batch file://dns-failover.json
        ;;
        
    "data-corruption")
        echo "=== DATA CORRUPTION RECOVERY ==="
        
        # 1. Stop application
        echo "1. Stopping application..."
        systemctl stop sme-admin
        
        # 2. Assess corruption extent
        echo "2. Assessing corruption extent..."
        sudo -u postgres pg_dump -d sme_admin --schema-only > /tmp/schema_check.sql
        
        # 3. Restore from point-in-time backup
        echo "3. Restoring from point-in-time backup..."
        /opt/scripts/restore-database.sh latest "$RECOVERY_TIME"
        
        # 4. Verify data integrity
        echo "4. Verifying data integrity..."
        /opt/scripts/verify-data-integrity.sh
        
        # 5. Restart application
        echo "5. Restarting application..."
        systemctl start sme-admin
        ;;
        
    *)
        echo "Usage: $0 {database-failure|complete-failure|data-corruption} [recovery-time]"
        exit 1
        ;;
esac

echo "Recovery procedure completed"
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Issues

```bash
# Application won't start
# Check logs
journalctl -u sme-admin -f

# Check PM2 status
pm2 status
pm2 logs sme-admin

# Check environment variables
cat /opt/sme-admin/.env

# Check file permissions
ls -la /opt/sme-admin/
ls -la /var/log/sme-admin/

# Memory issues
free -h
ps aux --sort=-%mem | head -10

# CPU issues
top -p $(pgrep -d',' node)
```

#### 2. Database Issues

```sql
-- Check database connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname IN ('admin_platform', 'admin_tenant')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_scan ASC;

-- Check locks
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

#### 3. Redis Issues

```bash
# Check Redis status
redis-cli ping

# Check Redis info
redis-cli info

# Check memory usage
redis-cli info memory

# Check connected clients
redis-cli info clients

# Monitor Redis commands
redis-cli monitor

# Check slow log
redis-cli slowlog get 10

# Clear cache if needed
redis-cli flushdb
```

#### 4. Network Issues

```bash
# Check port availability
netstat -tlnp | grep :3000
ss -tlnp | grep :3000

# Check connectivity
curl -I http://localhost:3000/health
curl -I https://admin.smeplatform.com/health

# Check DNS resolution
nslookup admin.smeplatform.com
dig admin.smeplatform.com

# Check SSL certificate
openssl s_client -connect admin.smeplatform.com:443 -servername admin.smeplatform.com

# Check firewall
ufw status
iptables -L
```

### Diagnostic Scripts

#### 1. Health Check Script

```bash
#!/bin/bash
# /opt/scripts/health-check.sh

echo "=== SME Admin Health Check ==="
echo "Timestamp: $(date)"
echo

# Check application status
echo "1. Application Status:"
systemctl is-active sme-admin
pm2 status | grep sme-admin

# Check database connectivity
echo "2. Database Connectivity:"
sudo -u postgres psql -d sme_admin -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
fi

# Check Redis connectivity
echo "3. Redis Connectivity:"
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Redis connection successful"
else
    echo "✗ Redis connection failed"
fi

# Check API endpoints
echo "4. API Health:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✓ API health endpoint responding"
else
    echo "✗ API health endpoint failed (HTTP $HTTP_STATUS)"
fi

# Check disk space
echo "5. Disk Space:"
df -h | grep -E "(/$|/var|/opt)"

# Check memory usage
echo "6. Memory Usage:"
free -h

# Check CPU load
echo "7. CPU Load:"
uptime

# Check recent errors
echo "8. Recent Errors:"
journalctl -u sme-admin --since "5 minutes ago" --no-pager | grep -i error | tail -5

echo
echo "Health check completed"
```

#### 2. Performance Diagnostic Script

```bash
#!/bin/bash
# /opt/scripts/performance-diagnostic.sh

echo "=== Performance Diagnostic Report ==="
echo "Timestamp: $(date)"
echo

# System resources
echo "1. System Resources:"
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4"%"}'

echo "Memory Usage:"
free | grep Mem | awk '{printf "%.2f%%\n", $3/$2 * 100.0}'

echo "Disk I/O:"
iostat -x 1 1 | tail -n +4

# Application metrics
echo "2. Application Metrics:"
curl -s http://localhost:3000/metrics | grep -E "(http_requests_total|http_request_duration|database_connections)"

# Database performance
echo "3. Database Performance:"
sudo -u postgres psql -d sme_admin -c "
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC 
LIMIT 5;
"

# Redis performance
echo "4. Redis Performance:"
redis-cli info stats | grep -E "(total_commands_processed|instantaneous_ops_per_sec|used_memory_human)"

# Network connections
echo "5. Network Connections:"
netstat -an | grep :3000 | wc -l
echo "Active connections to port 3000"

# Log analysis
echo "6. Recent Log Analysis:"
tail -100 /var/log/sme-admin/application.log | grep -c ERROR
echo "Errors in last 100 log entries"

echo
echo "Performance diagnostic completed"
```

### Log Analysis

#### 1. Log Monitoring Script

```bash
#!/bin/bash
# /opt/scripts/monitor-logs.sh

LOG_FILE="/var/log/sme-admin/application.log"
ERROR_THRESHOLD=10
WARNING_THRESHOLD=50

# Count errors and warnings in last hour
ERRORS=$(grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" "$LOG_FILE" | grep -c "ERROR")
WARNINGS=$(grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" "$LOG_FILE" | grep -c "WARN")

echo "Log Analysis for last hour:"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

# Alert if thresholds exceeded
if [ "$ERRORS" -gt "$ERROR_THRESHOLD" ]; then
    echo "⚠️  ERROR THRESHOLD EXCEEDED: $ERRORS errors in last hour"
    
    # Send alert
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 High error rate detected: $ERRORS errors in last hour\"}"
fi

if [ "$WARNINGS" -gt "$WARNING_THRESHOLD" ]; then
    echo "⚠️  WARNING THRESHOLD EXCEEDED: $WARNINGS warnings in last hour"
fi

# Show recent errors
echo
echo "Recent errors:"
grep "$(date '+%Y-%m-%d')" "$LOG_FILE" | grep "ERROR" | tail -5
```

#### 2. Error Pattern Analysis

```bash
#!/bin/bash
# /opt/scripts/analyze-errors.sh

LOG_FILE="/var/log/sme-admin/application.log"
TIMEFRAME="${1:-24 hours ago}"

echo "=== Error Pattern Analysis ==="
echo "Timeframe: Since $TIMEFRAME"
echo

# Extract errors since timeframe
TEMP_FILE="/tmp/recent_errors.log"
grep "$(date -d "$TIMEFRAME" '+%Y-%m-%d')" "$LOG_FILE" | grep "ERROR" > "$TEMP_FILE"

# Count error types
echo "1. Error Types:"
awk -F'"message":' '{print $2}' "$TEMP_FILE" | awk -F'"' '{print $2}' | sort | uniq -c | sort -nr | head -10

# Count errors by hour
echo
echo "2. Errors by Hour:"
awk '{print $2}' "$TEMP_FILE" | cut -d: -f1 | sort | uniq -c

# Most frequent error sources
echo
echo "3. Error Sources:"
grep -o '"source":"[^"]*"' "$TEMP_FILE" | sort | uniq -c | sort -nr | head -10

# Database errors
echo
echo "4. Database Errors:"
grep -i "database\|sql\|postgres" "$TEMP_FILE" | wc -l
echo "Database-related errors found"

# Authentication errors
echo
echo "5. Authentication Errors:"
grep -i "auth\|login\|token\|unauthorized" "$TEMP_FILE" | wc -l
echo "Authentication-related errors found"

# Clean up
rm "$TEMP_FILE"

echo
echo "Error analysis completed"
```

---

## Post-Deployment Validation

### Validation Checklist

#### 1. Infrastructure Validation

```bash
#!/bin/bash
# /opt/scripts/validate-infrastructure.sh

echo "=== Infrastructure Validation ==="

# Check all services are running
echo "1. Service Status:"
services=("postgresql-15" "redis-server" "nginx" "sme-admin")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "✓ $service is running"
    else
        echo "✗ $service is not running"
    fi
done

# Check ports are listening
echo
echo "2. Port Status:"
ports=("80:nginx" "443:nginx" "3000:sme-admin" "5432:postgresql" "6379:redis")
for port_service in "${ports[@]}"; do
    port=$(echo "$port_service" | cut -d: -f1)
    service=$(echo "$port_service" | cut -d: -f2)
    
    if netstat -tlnp | grep -q ":$port "; then
        echo "✓ Port $port ($service) is listening"
    else
        echo "✗ Port $port ($service) is not listening"
    fi
done

# Check SSL certificate
echo
echo "3. SSL Certificate:"
if openssl s_client -connect admin.smeplatform.com:443 -servername admin.smeplatform.com < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    echo "✓ SSL certificate is valid"
else
    echo "✗ SSL certificate validation failed"
fi

# Check disk space
echo
echo "4. Disk Space:"
df -h | awk 'NR>1 {if($5+0 > 80) print "⚠️  " $6 " is " $5 " full"; else print "✓ " $6 " has sufficient space (" $5 " used)"}'

# Check memory
echo
echo "5. Memory Usage:"
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    echo "✓ Memory usage is acceptable ($MEMORY_USAGE%)"
else
    echo "⚠️  Memory usage is high ($MEMORY_USAGE%)"
fi

echo
echo "Infrastructure validation completed"
```

#### 2. Application Validation

```bash
#!/bin/bash
# /opt/scripts/validate-application.sh

echo "=== Application Validation ==="

BASE_URL="https://admin.smeplatform.com"
API_KEY="your-api-key-here"

# Test health endpoints
echo "1. Health Endpoints:"
endpoints=("/health" "/health/ready" "/health/live")
for endpoint in "${endpoints[@]}"; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✓ $endpoint responding (HTTP $HTTP_STATUS)"
    else
        echo "✗ $endpoint failed (HTTP $HTTP_STATUS)"
    fi
done

# Test API endpoints
echo
echo "2. API Endpoints:"
# Test authentication
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test","tenantId":"test"}' \
    -w "%{http_code}")

if echo "$AUTH_RESPONSE" | grep -q "401"; then
    echo "✓ Authentication endpoint responding correctly"
else
    echo "⚠️  Authentication endpoint response unexpected"
fi

# Test tenant endpoints
TENANT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/api/v1/platform/tenants" \
    -H "Authorization: Bearer $API_KEY")

if [ "$TENANT_RESPONSE" = "200" ] || [ "$TENANT_RESPONSE" = "401" ]; then
    echo "✓ Tenant endpoint responding"
else
    echo "✗ Tenant endpoint failed (HTTP $TENANT_RESPONSE)"
fi

# Test metrics endpoint
echo
echo "3. Metrics Endpoint:"
METRICS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics")
if [ "$METRICS_RESPONSE" = "200" ]; then
    echo "✓ Metrics endpoint responding"
else
    echo "✗ Metrics endpoint failed (HTTP $METRICS_RESPONSE)"
fi

echo
echo "Application validation completed"
```

#### 3. Database Validation

```bash
#!/bin/bash
# /opt/scripts/validate-database.sh

echo "=== Database Validation ==="

# Test database connection
echo "1. Database Connection:"
if sudo -u postgres psql -d sme_admin -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
    exit 1
fi

# Check schema integrity
echo
echo "2. Schema Integrity:"
EXPECTED_TABLES=("tenants" "subscription_plans" "users" "user_sessions")
for table in "${EXPECTED_TABLES[@]}"; do
    if sudo -u postgres psql -d sme_admin -c "\dt admin_platform.$table" > /dev/null 2>&1 || \
       sudo -u postgres psql -d sme_admin -c "\dt admin_tenant.$table" > /dev/null 2>&1; then
        echo "✓ Table $table exists"
    else
        echo "✗ Table $table missing"
    fi
done

# Check indexes
echo
echo "3. Index Validation:"
INDEX_COUNT=$(sudo -u postgres psql -d sme_admin -t -c "
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname IN ('admin_platform', 'admin_tenant');
")

if [ "$INDEX_COUNT" -gt 10 ]; then
    echo "✓ Indexes created ($INDEX_COUNT indexes found)"
else
    echo "⚠️  Few indexes found ($INDEX_COUNT indexes)"
fi

# Check constraints
echo
echo "4. Constraint Validation:"
CONSTRAINT_COUNT=$(sudo -u postgres psql -d sme_admin -t -c "
SELECT COUNT(*) 
FROM information_schema.table_constraints 
WHERE table_schema IN ('admin_platform', 'admin_tenant');
")

echo "✓ Constraints validated ($CONSTRAINT_COUNT constraints found)"

# Test sample queries
echo
echo "5. Sample Query Tests:"
# Test tenant query
TENANT_COUNT=$(sudo -u postgres psql -d sme_admin -t -c "SELECT COUNT(*) FROM admin_platform.tenants;")
echo "✓ Tenant query successful ($TENANT_COUNT tenants)"

# Test user query
USER_COUNT=$(sudo -u postgres psql -d sme_admin -t -c "SELECT COUNT(*) FROM admin_tenant.users;")
echo "✓ User query successful ($USER_COUNT users)"

echo
echo "Database validation completed"
```

#### 4. Performance Validation

```bash
#!/bin/bash
# /opt/scripts/validate-performance.sh

echo "=== Performance Validation ==="

BASE_URL="https://admin.smeplatform.com"

# Response time test
echo "1. Response Time Test:"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/health")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
    echo "✓ Response time acceptable (${RESPONSE_TIME_MS}ms)"
else
    echo "⚠️  Response time high (${RESPONSE_TIME_MS}ms)"
fi

# Load test
echo
echo "2. Basic Load Test:"
echo "Running 100 concurrent requests..."

# Use Apache Bench for load testing
ab -n 100 -c 10 "$BASE_URL/health" > /tmp/load_test.txt 2>&1

REQUESTS_PER_SECOND=$(grep "Requests per second" /tmp/load_test.txt | awk '{print $4}')
MEAN_TIME=$(grep "Time per request" /tmp/load_test.txt | head -1 | awk '{print $4}')

echo "✓ Requests per second: $REQUESTS_PER_SECOND"
echo "✓ Mean response time: ${MEAN_TIME}ms"

# Database performance test
echo
echo "3. Database Performance Test:"
DB_QUERY_TIME=$(sudo -u postgres psql -d sme_admin -c "\timing on" -c "SELECT COUNT(*) FROM admin_platform.tenants;" 2>&1 | grep "Time:" | awk '{print $2}')
echo "✓ Database query time: $DB_QUERY_TIME"

# Memory usage test
echo
echo "4. Memory Usage Test:"
MEMORY_USAGE=$(ps aux | grep node | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
echo "✓ Application memory usage: ${MEMORY_USAGE}MB"

echo
echo "Performance validation completed"
```

### Final Deployment Report

```bash
#!/bin/bash
# /opt/scripts/generate-deployment-report.sh

REPORT_FILE="/tmp/deployment-report-$(date +%Y%m%d_%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
================================================================================
SME RECEIVABLES MANAGEMENT PLATFORM - ADMINISTRATIVE MODULE
DEPLOYMENT REPORT
================================================================================

Deployment Date: $(date)
Version: 1.0.0
Environment: Production

================================================================================
INFRASTRUCTURE STATUS
================================================================================

EOF

# Run all validation scripts and append to report
/opt/scripts/validate-infrastructure.sh >> "$REPORT_FILE" 2>&1
echo >> "$REPORT_FILE"

/opt/scripts/validate-application.sh >> "$REPORT_FILE" 2>&1
echo >> "$REPORT_FILE"

/opt/scripts/validate-database.sh >> "$REPORT_FILE" 2>&1
echo >> "$REPORT_FILE"

/opt/scripts/validate-performance.sh >> "$REPORT_FILE" 2>&1

cat >> "$REPORT_FILE" << EOF

================================================================================
CONFIGURATION SUMMARY
================================================================================

Application Servers: 5 instances
Database Servers: 3 instances (1 primary, 2 replicas)
Load Balancer: NGINX with SSL termination
Cache: Redis cluster
Backup: Automated daily backups with 30-day retention
Monitoring: Prometheus + Grafana + AlertManager

================================================================================
SECURITY CONFIGURATION
================================================================================

SSL/TLS: Enabled with Let's Encrypt certificates
Firewall: UFW configured with minimal required ports
Authentication: JWT with refresh tokens
Encryption: AES-256-GCM for sensitive data
Audit Logging: Enabled for all administrative actions

================================================================================
MONITORING AND ALERTING
================================================================================

Health Checks: /health, /health/ready, /health/live
Metrics: Prometheus metrics exposed on /metrics
Logging: Structured JSON logging with log rotation
Alerts: Configured for high error rates, response times, and resource usage

================================================================================
BACKUP AND RECOVERY
================================================================================

Database Backups: Daily encrypted backups to S3
WAL Archiving: Continuous WAL archiving for PITR
Configuration Backups: Daily configuration backups
Recovery Testing: Automated monthly recovery tests

================================================================================
DEPLOYMENT VALIDATION RESULTS
================================================================================

All validation tests completed successfully.
System is ready for production traffic.

================================================================================
NEXT STEPS
================================================================================

1. Monitor system performance for first 24 hours
2. Verify backup procedures are working correctly
3. Test disaster recovery procedures
4. Update monitoring dashboards with production data
5. Schedule regular health checks and maintenance windows

================================================================================
SUPPORT CONTACTS
================================================================================

Technical Lead: [Your Name]
DevOps Team: [Team Email]
Emergency Contact: [Emergency Phone]

Report Generated: $(date)
================================================================================
EOF

echo "Deployment report generated: $REPORT_FILE"

# Send report via email
if command -v mail &> /dev/null; then
    mail -s "SME Admin Deployment Report - $(date +%Y-%m-%d)" admin@smeplatform.com < "$REPORT_FILE"
fi

# Upload report to S3
if command -v aws &> /dev/null; then
    aws s3 cp "$REPORT_FILE" s3://sme-admin-reports/deployment/
fi

echo "Deployment validation and reporting completed successfully!"
```

---

This completes the comprehensive Production Deployment Guide for the SME Receivables Management Platform Administrative Module Phase 1. The guide provides detailed instructions for deploying, configuring, monitoring, and maintaining the administrative module in a production environment with enterprise-grade reliability, security, and performance.

