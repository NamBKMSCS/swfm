#!/bin/bash

# Docker ML Service Startup Script
# Starts all ML services using Docker Compose

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_msg() {
    echo -e "${2}${1}${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    print_msg "Error: .env file not found!" "$YELLOW"
    print_msg "Please create .env file with required variables:" "$YELLOW"
    echo "  SUPABASE_URL=your_supabase_url"
    echo "  SUPABASE_KEY=your_supabase_key"
    exit 1
fi

cd "$SCRIPT_DIR"

case "${1:-up}" in
    up|start)
        print_header "Starting ML Services with Docker"
        print_msg "Building and starting containers..." "$YELLOW"
        docker-compose -f docker-compose.ml.yml up -d --build
        
        print_msg "Waiting for services to be ready..." "$YELLOW"
        sleep 10
        
        print_header "Service Status"
        docker-compose -f docker-compose.ml.yml ps
        
        echo ""
        print_msg "Services started successfully!" "$GREEN"
        echo ""
        echo "Access points:"
        echo "  MLflow UI:    http://localhost:5000"
        echo "  ML API:       http://localhost:8000"
        echo "  API Docs:     http://localhost:8000/docs"
        echo ""
        echo "View logs:"
        echo "  All services:  docker-compose -f docker-compose.ml.yml logs -f"
        echo "  MLflow:        docker-compose -f docker-compose.ml.yml logs -f mlflow"
        echo "  API:           docker-compose -f docker-compose.ml.yml logs -f ml-api"
        echo "  Trainer:       docker-compose -f docker-compose.ml.yml logs -f ml-trainer"
        ;;
    
    down|stop)
        print_header "Stopping ML Services"
        docker-compose -f docker-compose.ml.yml down
        print_msg "Services stopped" "$GREEN"
        ;;
    
    restart)
        print_header "Restarting ML Services"
        docker-compose -f docker-compose.ml.yml restart
        print_msg "Services restarted" "$GREEN"
        ;;
    
    logs)
        print_header "Viewing Logs"
        docker-compose -f docker-compose.ml.yml logs -f "${2:-}"
        ;;
    
    status|ps)
        print_header "Service Status"
        docker-compose -f docker-compose.ml.yml ps
        ;;
    
    build)
        print_header "Building Docker Images"
        docker-compose -f docker-compose.ml.yml build
        print_msg "Build complete" "$GREEN"
        ;;
    
    clean)
        print_header "Cleaning Up"
        print_msg "Stopping and removing containers..." "$YELLOW"
        docker-compose -f docker-compose.ml.yml down -v
        print_msg "Cleanup complete" "$GREEN"
        ;;
    
    *)
        echo "Usage: $0 {up|down|restart|logs|status|build|clean}"
        echo ""
        echo "Commands:"
        echo "  up/start   - Start all services"
        echo "  down/stop  - Stop all services"
        echo "  restart    - Restart all services"
        echo "  logs       - View logs (optional: specify service name)"
        echo "  status/ps  - Show service status"
        echo "  build      - Build Docker images"
        echo "  clean      - Stop and remove all containers and volumes"
        exit 1
        ;;
esac
