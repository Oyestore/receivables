#!/bin/bash
# Deployment script for SME Platform
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is valid
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    log_info "Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    log_warn "No .env.$ENVIRONMENT file found, using defaults"
fi

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose is not installed"
    exit 1
fi

# Build Docker images
log_info "Building Docker images..."
docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml build

# Run database migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml run --rm backend npm run migration:run

# Create backup (production only)
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "Creating database backup..."
    docker-compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > "backups/backup_$TIMESTAMP.sql"
    log_info "Backup created: backups/backup_$TIMESTAMP.sql"
filog_info "Stopping old containers..."
docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml down

# Start new containers
log_info "Starting new containers..."
docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 10

# Health check
log_info "Running health checks..."
backend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3012/health || echo "000")
frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ "$backend_health" == "200" ]; then
    log_info "✅ Backend is healthy"
else
    log_error "❌ Backend health check failed (HTTP $backend_health)"
    exit 1
fi

if [ "$frontend_health" == "200" ]; then
    log_info "✅ Frontend is healthy"
else
    log_error "❌ Frontend health check failed (HTTP $frontend_health)"
    exit 1
fi

# Show running containers
log_info "Running containers:"
docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml ps

log_info "🎉 Deployment to $ENVIRONMENT completed successfully!"
log_info "Backend: http://localhost:3012"
log_info "Frontend: http://localhost:3000"
log_info "Grafana: http://localhost:3001"
log_info "Prometheus: http://localhost:9090"
