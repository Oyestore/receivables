# Developer Quick-Start Guide

Get the SME Receivable Platform running locally in 10 minutes!

---

## 🚀 **Quick Start** (TL;DR)

```bash
# 1. Clone & Install
git clone <repository-url>
cd SME_Platform_12_Separate_Modules

# 2. Generate secrets
cd platform/scripts
./generate-secrets.ps1 -Environment local

# 3. Start everything with Docker
cd ../..
docker-compose -f docker-compose.full.yml up -d

# 4. Verify
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

Done! Platform is running. 🎉

---

## 📋 **Prerequisites**

### Required Software

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))

### Optional (for advanced features)

- **Kubernetes** (minikube or Docker Desktop K8s)
- **Helm** 3+ ([Install](https://helm.sh/docs/intro/install/))
- **PostgreSQL** client (psql)

---

## 🏗️ **Local Development Setup**

### Option 1: Docker Compose (Recommended)

**Fastest way to get started. Everything included.**

```powershell
# Navigate to project root
cd c:\Users\91858\Downloads\SME_Platform_12_Separate_Modules

# Start all services (Postgres, Redis, Backend, Frontend, Monitoring)
docker-compose -f docker-compose.full.yml up -d

# Check all containers running
docker ps

# View logs
docker-compose -f docker-compose.full.yml logs -f backend
```

**Services Started**:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 4000)
- Frontend (port 3000)
- Prometheus (port 9090)
- Grafana (port 3001)
- Node Exporter (port 9100)

**Stop Everything**:
```bash
docker-compose -f docker-compose.full.yml down
```

---

### Option 2: Manual Setup

**For development with hot-reload.**

#### Step 1: Install Dependencies

```bash
# Backend
cd platform
npm install

# Frontend
cd ../frontend
npm install
```

#### Step 2: Setup Database

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name sme-postgres \
  -e POSTGRES_DB=sme_platform_db \
  -e POSTGRES_USER=sme_user \
  -e POSTGRES_PASSWORD=sme_password \
  -p 5432:5432 \
  postgres:15-alpine

# Start Redis
docker run -d \
  --name sme-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### Step 3: Configure Environment

```bash
# Copy .env.example to .env
cd platform
copy .env.example .env

# Edit .env with your values
# At minimum, set:
# - DATABASE_URL
# - JWT_SECRET (generate with: openssl rand -base64 64)
# - REDIS_URL
```

#### Step 4: Run Migrations

```bash
cd platform
npm run migration:run
```

#### Step 5: Start Servers

```bash
# Terminal 1 - Backend
cd platform
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Access**:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API Docs: http://localhost:4000/api/docs

---

## 🧪 **Running Tests**

### Unit Tests

```bash
# Backend
cd platform
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

```bash
# Frontend
cd frontend
npm test

# With coverage
npm test -- --coverage
```

### E2E Tests (Cypress)

```bash
cd frontend

# Interactive mode
npm run cypress:open

# Headless mode
npm run cypress:run

# Specific test
npm run cypress:run -- --spec "cypress/e2e/login.cy.ts"
```

### Integration Tests

```bash
cd platform
npm run test:e2e
```

---

## 🔧 **Common Development Tasks**

### Create New Migration

```bash
cd platform
npm run migration:create -- -n CreateNewTable
```

### Revert Last Migration

```bash
npm run migration:revert
```

### Generate New Module

```bash
nest g module new-module
nest g controller new-module
nest g service new-module
```

### Lint Code

```bash
# Backend
cd platform
npm run lint        # Check
npm run lint:fix    # Fix

# Frontend
cd frontend
npm run lint
npm run lint:fix
```

### Format Code

```bash
npm run format
```

### Type Check

```bash
npm run type-check
```

---

## 📊 **Monitoring & Debugging**

### View Logs

```bash
# Docker Compose logs
docker-compose -f docker-compose.full.yml logs -f backend
docker-compose -f docker-compose.full.yml logs -f frontend

# Specific container
docker logs -f sme-backend

# Backend logs (manual setup)
# Logs are in console output
```

### Database Access

```bash
# Using Docker
docker exec -it sme-postgres psql -U sme_user -d sme_platform_db

# Common queries
SELECT * FROM users LIMIT 10;
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10;
```

### Redis Access

```bash
docker exec -it sme-redis redis-cli

# Common commands
KEYS *
GET authToken:*
FLUSHALL  # Clear all (use carefully!)
```

### Check API Health

```bash
# Health endpoint
curl http://localhost:4000/health

# Should return: {"status":"ok"}
```

---

## 🐛 **Troubleshooting**

### Port Already in Use

```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Kill process (Windows)
taskkill /PID <process_id> /F

# Or change port in .env
PORT=4001
```

### Database Connection Failed

```bash
# Check if PostgreSQL running
docker ps | grep postgres

# Restart PostgreSQL
docker restart sme-postgres

# Verify connection
psql -h localhost -U sme_user -d sme_platform_db
```

### Frontend Build Fails

```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

### Backend Won't Start

```bash
# Check .env file exists
ls .env

# Check database migrations
npm run migration:show

# Run pending migrations
npm run migration:run
```

---

## 🎨 **Working with Design System**

Import and use design system components:

```tsx
import { Button } from '@/design-system/components/Button';
import { GradientCard } from '@/design-system/components/GradientCard';

function MyComponent() {
  return (
    <GradientCard title="Hello">
      <Button variant="primary">Click Me</Button>
    </GradientCard>
  );
}
```

**Available Components**:
- Button
- GradientCard
- StatCard
- StatusBadge
- DashboardHeader

**Themes**: 10 pre-built themes in `design-system/styles.css`

---

## 📚 **Useful Commands Reference**

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
```

### Testing
```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:e2e     # E2E tests
npm run test:cov     # Coverage
```

### Database
```bash
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last
npm run migration:show     # Show status
```

### Code Quality
```bash
npm run lint         # Check linting
npm run lint:fix     # Fix issues
npm run format       # Format code
npm run type-check   # TypeScript check
```

---

## 🔗 **Important URLs**

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Backend API | http://localhost:4000 | - |
| API Docs (Swagger) | http://localhost:4000/api/docs | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin/admin |
| PostgreSQL | localhost:5432 | sme_user/sme_password |
| Redis | localhost:6379 | - |

---

## 💡 **Best Practices**

1. **Always run tests before committing**
   ```bash
   npm test && git commit
   ```

2. **Use feature branches**
   ```bash
   git checkout -b feature/new-feature
   ```

3. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

4. **Review logs regularly**
   ```bash
   docker-compose logs -f --tail=100
   ```

5. **Use environment variables** (never commit secrets!)

---

## 📞 **Need Help?**

- **Documentation**: `/docs` folder
- **API Reference**: http://localhost:4000/api/docs
- **Troubleshooting**: `docs/admin/TROUBLESHOOTING_GUIDE.md`
- **Team Chat**: #dev-support (Slack)
- **Email**: dev-team@smeplatform.com

---

## 🎯 **Next Steps**

1. ✅ Get platform running locally
2. ✅ Explore API documentation
3. ✅ Run test suite
4. ✅ Create a test account
5. ✅ Create your first invoice
6. ✅ Review codebase structure
7. ✅ Pick your first task from backlog

**Happy Coding!** 🚀

---

*Developer Quick-Start Guide v1.0*  
*Last Updated: December 14, 2025*
