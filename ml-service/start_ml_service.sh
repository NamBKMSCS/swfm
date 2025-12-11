#!/bin/bash

# ML Service Startup Script
# This script orchestrates the complete ML service startup process:
# 1. Start MLflow tracking server
# 2. Start the ML API service
# 3. Initial model training with current data
# 4. Start auto-training scheduler
# 5. Start auto-prediction service

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
MLFLOW_PORT=5000
API_PORT=8000
AUTO_TRAIN_INTERVAL=3600  # 1 hour in seconds (adjust as needed)

# Load environment variables if present
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

# Postgres (MLflow backend store) configuration
PG_CONTAINER_NAME=${MLFLOW_DB_CONTAINER_NAME:-swfm-mlflow-postgres}
PG_IMAGE=${MLFLOW_DB_IMAGE:-postgres:14}
PG_PORT=${MLFLOW_DB_PORT:-5432}
PG_DB=${MLFLOW_DB_NAME:-mlflow}
PG_USER=${MLFLOW_DB_USER:-mlflow}
PG_PASSWORD=${MLFLOW_DB_PASSWORD:-mlflow}
PG_DATA_DIR="$SCRIPT_DIR/mlflow_pgdata"

# Create logs directory
mkdir -p "$LOG_DIR"

# Print colored message
print_msg() {
    echo -e "${2}${1}${NC}"
}

# Print section header
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Check if process is running
check_process() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Check if a docker container is running
check_container_running() {
    local name="$1"
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        return 0
    else
        return 1
    fi
}

# Wait for Postgres container to be healthy
wait_for_postgres() {
    local name="$1"
    local max_attempts=30
    local attempt=0

    print_msg "Waiting for Postgres to be ready..." "$YELLOW"
    while [ $attempt -lt $max_attempts ]; do
        if docker exec "$name" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
            print_msg "✓ Postgres is ready" "$GREEN"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    print_msg "✗ Postgres failed to become ready" "$RED"
    return 1
}

# Wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    print_msg "Waiting for $name to be ready..." "$YELLOW"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_msg "✓ $name is ready!" "$GREEN"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    print_msg "✗ $name failed to start" "$RED"
    return 1
}

# Stop existing processes
stop_services() {
    print_header "Stopping Existing Services"
    
    # Stop auto-training
    if pgrep -f "auto_train_predict.py" > /dev/null; then
        print_msg "Stopping auto-training process..." "$YELLOW"
        pkill -f "auto_train_predict.py"
        sleep 2
    fi
    
    # Stop API service
    if check_process $API_PORT; then
        print_msg "Stopping ML API service on port $API_PORT..." "$YELLOW"
        lsof -ti:$API_PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Stop MLflow
    if check_process $MLFLOW_PORT; then
        print_msg "Stopping MLflow on port $MLFLOW_PORT..." "$YELLOW"
        lsof -ti:$MLFLOW_PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi

    # Stop Postgres container (optional)
    if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER_NAME}$"; then
        print_msg "Stopping Postgres container ${PG_CONTAINER_NAME}..." "$YELLOW"
        docker stop "$PG_CONTAINER_NAME" >/dev/null 2>&1 || true
        sleep 2
    fi
    
    print_msg "✓ All services stopped" "$GREEN"
}

# Start MLflow tracking server
start_mlflow() {
    print_header "Starting MLflow Tracking Server"
    
    if check_process $MLFLOW_PORT; then
        print_msg "MLflow already running on port $MLFLOW_PORT" "$YELLOW"
        return 0
    fi
    
    cd "$SCRIPT_DIR"
    
    # Compose backend URI for Postgres
    local backend_uri="postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}"

    print_msg "Starting MLflow on port $MLFLOW_PORT with Postgres backend..." "$YELLOW"
    nohup mlflow server \
        --backend-store-uri "$backend_uri" \
        --default-artifact-root ./mlartifacts \
        --host 0.0.0.0 \
        --port $MLFLOW_PORT \
        > "$LOG_DIR/mlflow.log" 2>&1 &
    
    sleep 3
    
    if wait_for_service "http://localhost:$MLFLOW_PORT" "MLflow"; then
        print_msg "✓ MLflow started successfully" "$GREEN"
        print_msg "  Access at: http://localhost:$MLFLOW_PORT" "$BLUE"
        return 0
    else
        print_msg "✗ Failed to start MLflow" "$RED"
        return 1
    fi
}

# Start Postgres (MLflow backend store) in Docker
start_mlflow_postgres() {
    print_header "Starting Postgres for MLflow"

    mkdir -p "$PG_DATA_DIR"

    if check_container_running "$PG_CONTAINER_NAME"; then
        print_msg "Postgres container ${PG_CONTAINER_NAME} already running" "$YELLOW"
    else
        print_msg "Launching Postgres container ${PG_CONTAINER_NAME}..." "$YELLOW"
        docker run -d \
            --name "$PG_CONTAINER_NAME" \
            -e POSTGRES_DB="$PG_DB" \
            -e POSTGRES_USER="$PG_USER" \
            -e POSTGRES_PASSWORD="$PG_PASSWORD" \
            -p "$PG_PORT:5432" \
            -v "$PG_DATA_DIR:/var/lib/postgresql/data" \
            --health-cmd "pg_isready -U $PG_USER -d $PG_DB" \
            --health-interval 10s \
            --health-timeout 5s \
            --health-retries 10 \
            "$PG_IMAGE" >/dev/null 2>&1
    fi

    wait_for_postgres "$PG_CONTAINER_NAME" || return 1
    print_msg "✓ Postgres started for MLflow backend" "$GREEN"
}

# Start ML API service
start_api_service() {
    print_header "Starting ML API Service"
    
    if check_process $API_PORT; then
        print_msg "API service already running on port $API_PORT" "$YELLOW"
        return 0
    fi
    
    cd "$SCRIPT_DIR"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_msg "Creating virtual environment..." "$YELLOW"
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    
    if [ ! -f "venv/.deps_installed" ]; then
        print_msg "Installing dependencies..." "$YELLOW"
        pip install -r requirements.txt > "$LOG_DIR/pip_install.log" 2>&1
        touch venv/.deps_installed
    fi
    
    print_msg "Starting API service on port $API_PORT..." "$YELLOW"
    nohup uvicorn app.main:app \
        --host 0.0.0.0 \
        --port $API_PORT \
        --reload \
        > "$LOG_DIR/api_service.log" 2>&1 &
    
    sleep 5
    
    if wait_for_service "http://localhost:$API_PORT/health" "ML API"; then
        print_msg "✓ API service started successfully" "$GREEN"
        print_msg "  Access at: http://localhost:$API_PORT" "$BLUE"
        print_msg "  Docs at: http://localhost:$API_PORT/docs" "$BLUE"
        return 0
    else
        print_msg "✗ Failed to start API service" "$RED"
        cat "$LOG_DIR/api_service.log"
        return 1
    fi
}

# Initial model training
initial_training() {
    print_header "Initial Model Training"
    
    cd "$SCRIPT_DIR"
    source venv/bin/activate
    
    print_msg "Training unified models with current data..." "$YELLOW"
    print_msg "This may take several minutes..." "$YELLOW"
    
    python3 pretrain_and_predict.py > "$LOG_DIR/initial_training.log" 2>&1
    
    if [ $? -eq 0 ]; then
        print_msg "✓ Initial training completed successfully" "$GREEN"
        tail -20 "$LOG_DIR/initial_training.log"
        return 0
    else
        print_msg "✗ Initial training failed" "$RED"
        tail -50 "$LOG_DIR/initial_training.log"
        return 1
    fi
}

# Start auto-training service
start_auto_training() {
    print_header "Starting Auto-Training Service"
    
    cd "$SCRIPT_DIR"
    source venv/bin/activate
    
    if pgrep -f "auto_train_predict.py" > /dev/null; then
        print_msg "Auto-training already running" "$YELLOW"
        return 0
    fi
    
    print_msg "Starting auto-training (interval: ${AUTO_TRAIN_INTERVAL}s)..." "$YELLOW"
    nohup python3 auto_train_predict.py \
        --interval $AUTO_TRAIN_INTERVAL \
        > "$LOG_DIR/auto_training.log" 2>&1 &
    
    sleep 2
    
    if pgrep -f "auto_train_predict.py" > /dev/null; then
        print_msg "✓ Auto-training service started" "$GREEN"
        print_msg "  Check logs: tail -f $LOG_DIR/auto_training.log" "$BLUE"
        return 0
    else
        print_msg "✗ Failed to start auto-training" "$RED"
        return 1
    fi
}

# Display service status
show_status() {
    print_header "Service Status"
    
    echo -e "${BLUE}MLflow:${NC}"
    if check_process $MLFLOW_PORT; then
        echo -e "  ${GREEN}✓ Running${NC} on http://localhost:$MLFLOW_PORT"
    else
        echo -e "  ${RED}✗ Not running${NC}"
    fi
    
    echo -e "${BLUE}ML API:${NC}"
    if check_process $API_PORT; then
        echo -e "  ${GREEN}✓ Running${NC} on http://localhost:$API_PORT"
    else
        echo -e "  ${RED}✗ Not running${NC}"
    fi
    
    echo -e "${BLUE}Auto-Training:${NC}"
    if pgrep -f "auto_train_predict.py" > /dev/null; then
        echo -e "  ${GREEN}✓ Running${NC}"
    else
        echo -e "  ${RED}✗ Not running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Logs:${NC}"
    echo "  MLflow:        tail -f $LOG_DIR/mlflow.log"
    echo "  API Service:   tail -f $LOG_DIR/api_service.log"
    echo "  Auto-Training: tail -f $LOG_DIR/auto_training.log"
    echo ""
}

# Main execution
main() {
    print_header "ML Service Startup"
    print_msg "Starting complete ML service stack..." "$GREEN"
    
    # Stop any existing services
    stop_services
    
    # Start Postgres backend first
    start_mlflow_postgres || exit 1

    # Start services in order
    start_mlflow || exit 1
    start_api_service || exit 1
    
    # Initial training
    print_msg "Do you want to run initial training now? (y/n)" "$YELLOW"
    read -t 10 -r response || response="y"
    if [[ "$response" =~ ^[Yy]$ ]]; then
        initial_training || print_msg "Initial training failed, but continuing..." "$YELLOW"
    else
        print_msg "Skipping initial training" "$YELLOW"
    fi
    
    # Start auto-training
    start_auto_training || print_msg "Auto-training failed to start, but services are running" "$YELLOW"
    
    # Show status
    show_status
    
    print_header "Startup Complete!"
    print_msg "All services are running. Press Ctrl+C to view logs..." "$GREEN"
    
    # Follow logs
    sleep 2
    tail -f "$LOG_DIR/api_service.log"
}

# Handle script arguments
case "${1:-}" in
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    restart)
        stop_services
        sleep 2
        main
        ;;
    *)
        main
        ;;
esac
