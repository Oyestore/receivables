# SME Receivable Platform - Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm >= 9.x

### 1. Install Dependencies

```bash
# Platform root
npm install

# Module 12 (if not already done)
cd Module_12_Administration
npm install
cd ..
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and update:
# - DATABASE_URL
# - JWT_SECRET and JWT_REFRESH_SECRET
# - PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD
# - CORS_ORIGIN
```

### 3. Database Setup

```bash
# Create database
createdb sme_platform

# Generate initial migration
npm run migration:generate -- ./migrations/InitialSchema

# Run migrations
npm run migration:run
```

### 4. Start Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 📊 Platform Structure

```
platform/
├── Module_12_Administration/    # ✅ Completed
├── Module_01_Invoice/           # To be integrated
├── Module_02_Distribution/      # To be integrated
├── Module_03_Payment/           # To be integrated
├── Module_04_Analytics/         # ✅ Completed
├── app.module.ts                # Main app module
├── main.ts                      # Bootstrap file
├── data-source.ts               # TypeORM config
└── package.json                 # Platform dependencies
```

## 🔐 First Login

After database seeding (automatic in development):

```
Email: admin@platform.local
Password: Admin@2025

(Change these in .env before production!)
```

## 📡 API Endpoints

### Base URL
- Development: `http://localhost:3000/api`
- Swagger Docs: `http://localhost:3000/api/docs`

### Authentication
- POST `/auth/login` - Login
- POST `/auth/refresh` - Refresh token
- POST `/auth/logout` - Logout

### Users (Protected)
- GET `/api/tenant/:tenantId/users` - List users
- POST `/api/tenant/:tenantId/users` - Create user
- GET `/api/tenant/:tenantId/users/:id` - Get user
- PUT `/api/tenant/:tenantId/users/:id` - Update user
- DELETE `/api/tenant/:tenantId/users/:id` - Delete user

### Platform Admin (Platform Admin Only)
- GET `/api/platform/tenants` - List all tenants
- POST `/api/platform/tenants` - Create tenant
- GET `/api/platform/tenants/:id` - Get tenant
- PUT `/api/platform/tenants/:id` - Update tenant

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 📦 Production Deployment

### 1. Build

```bash
npm run build
```

### 2. Environment Setup

```env
NODE_ENV=production
AUTO_SEED=false
JWT_SECRET=<strong-random-secret>
DATABASE_URL=<production-db-url>
CORS_ORIGIN=<your-frontend-url>
```

### 3. Database Migrations

```bash
# Run migrations (not synchronize!)
npm run migration:run
```

### 4. Start

```bash
npm run start:prod
```

### 5. Process Manager (PM2)

```bash
npm install -g pm2

# Start
pm2 start dist/main.js --name sme-platform

# Monitor
pm2 monit

# Logs
pm2 logs sme-platform
```

## 🔒 Security Checklist

- [ ] Change JWT_SECRET and JWT_REFRESH_SECRET
- [ ] Change PLATFORM_ADMIN_PASSWORD
- [ ] Set AUTO_SEED=false
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable helmet security headers
- [ ] Configure database SSL
- [ ] Set up monitoring (Sentry, New Relic)
- [ ] Regular database backups
- [ ] Implement MFA for admin users

## 🐳 Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/sme_platform
    depends_on:
      - db
  
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: sme_platform
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 📈 Monitoring

### Health Check
```
GET /health
```

### Metrics (if enabled)
```
GET /metrics
```

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"
**Solution**: Check DATABASE_URL and ensure PostgreSQL is running

### Issue: "JWT secret not configured"
**Solution**: Set JWT_SECRET in .env file

### Issue: "Module not found"
**Solution**: Run `npm install` in platform root

### Issue: "Migration failed"
**Solution**: Check database permissions and connection

## 📚 Next Steps

1. ✅ Module 12 (Administration) - Integrated
2. ⏳ Integrate Module 01 (Invoice Generation)
3. ⏳ Integrate Module 02 (Distribution)
4. ⏳ Integrate Module 03 (Payment)
5. ⏳ Integrate Module 04 (Analytics) - Already complete
6. ⏳ Complete remaining modules

## 🎯 Current Status

**Module 12 Administration**: ✅ Production Ready
- Authentication & Authorization
- Multi-tenant Management
- RBAC
- Audit Logging
- User Management

**Platform Integration**: ✅ Ready
- Main application bootstrapped
- Database configured
- API documentation enabled
- Security middleware active

---

**Last Updated**: January 21, 2025  
**Status**: Production Ready - Module 12
