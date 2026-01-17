#!/bin/bash

# SME Platform Deployment Script
# This script handles the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check environment file
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_warning "Please update .env file with your configuration before proceeding."
        print_warning "Important: Update AUTH_SECRET, JWT_SECRET, and OAuth credentials"
        read -p "Press Enter to continue after updating .env file..."
    else
        print_success ".env file found"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Stop existing services
    docker-compose down
    
    # Build images
    print_status "Building Docker images..."
    docker-compose build
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    print_status "Checking service health..."
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "PostgreSQL is healthy"
    else
        print_error "PostgreSQL is not healthy"
        return 1
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not healthy"
        return 1
    fi
    
    # Check Frontend
    if curl -f http://localhost:5176/api/health &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend is still starting..."
    fi
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    # Wait for PostgreSQL to be ready
    until docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; do
        print_status "Waiting for PostgreSQL to be ready..."
        sleep 2
    done
    
    # The database schema is auto-initialized by the application
    print_success "Database initialization completed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test authentication endpoints
    print_status "Testing authentication endpoints..."
    
    # Test health endpoint
    if curl -f http://localhost:5176/api/health &> /dev/null; then
        print_success "Health endpoint working"
    else
        print_error "Health endpoint not working"
        return 1
    fi
    
    # Test providers endpoint
    if curl -f http://localhost:5176/api/auth/providers &> /dev/null; then
        print_success "Providers endpoint working"
    else
        print_error "Providers endpoint not working"
        return 1
    fi
    
    print_success "All tests passed"
}

# Show deployment information
show_deployment_info() {
    print_success "Deployment completed successfully!"
    echo ""
    echo "=== DEPLOYMENT INFORMATION ==="
    echo "Frontend URL: http://localhost:5176"
    echo "API URL: http://localhost:5176/api"
    echo "PostgreSQL: localhost:5438"
    echo "Redis: localhost:6379"
    echo ""
    echo "=== USEFUL COMMANDS ==="
    echo "View logs: docker-compose logs -f"
    echo "Stop services: docker-compose down"
    echo "Restart services: docker-compose restart"
    echo "Check status: docker-compose ps"
    echo ""
    echo "=== NEXT STEPS ==="
    echo "1. Update OAuth provider credentials in .env"
    echo "2. Configure SSL certificates for production"
    echo "3. Set up monitoring and logging"
    echo "4. Configure backup strategies"
    echo ""
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    docker-compose down
    docker system prune -f
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    echo "=========================================="
    echo "    SME Platform Deployment Script    "
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_docker
            check_env_file
            deploy_services
            init_database
            run_tests
            show_deployment_info
            ;;
        "update")
            print_status "Updating deployment..."
            check_docker
            deploy_services
            run_tests
            show_deployment_info
            ;;
        "stop")
            print_status "Stopping services..."
            docker-compose down
            print_success "Services stopped"
            ;;
        "restart")
            print_status "Restarting services..."
            docker-compose restart
            check_service_health
            print_success "Services restarted"
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "status")
            docker-compose ps
            check_service_health
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  deploy    - Full deployment (default)"
            echo "  update    - Update existing deployment"
            echo "  stop      - Stop all services"
            echo "  restart   - Restart all services"
            echo "  logs      - Show logs"
            echo "  status    - Show service status"
            echo "  cleanup   - Clean up containers and images"
            echo "  help      - Show this help message"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for available commands"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'print_warning "Script interrupted. Cleaning up..."; docker-compose down; exit 1' INT

# Run main function
main "$@"
