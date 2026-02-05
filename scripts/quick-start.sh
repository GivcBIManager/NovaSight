#!/bin/bash
# ============================================
# NovaSight Quick Start Script
# ============================================
# Minimal startup for quick testing - just the essentials
#
# Usage: ./scripts/quick-start.sh [options]
#
# This script starts only the core services needed for testing:
# - PostgreSQL (metadata store)
# - Redis (cache)
# - ClickHouse (data warehouse)
# - Backend API
# - Frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}NovaSight Quick Start${NC}                                      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Minimal services for rapid testing                         ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
REBUILD=false
for arg in "$@"; do
    case $arg in
        --rebuild)
            REBUILD=true
            ;;
    esac
done

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}ERROR: Docker not found. Please install Docker Desktop.${NC}"
    exit 1
fi

# Determine compose command
COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
fi

# Check/create .env
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
fi

BUILD_FLAG=""
if [ "$REBUILD" = true ]; then
    BUILD_FLAG="--build"
    echo -e "${BLUE}Forcing rebuild...${NC}"
fi

# Start core infrastructure
echo -e "${BLUE}Starting core infrastructure...${NC}"
$COMPOSE_CMD up -d postgres redis clickhouse $BUILD_FLAG

echo -e "${BLUE}Waiting for databases (10 seconds)...${NC}"
sleep 10

# Start application
echo -e "${BLUE}Starting application services...${NC}"
$COMPOSE_CMD up -d backend frontend $BUILD_FLAG

echo -e "${BLUE}Waiting for services to initialize (5 seconds)...${NC}"
sleep 5

# Health check
echo ""
echo -e "${BLUE}Checking service health...${NC}"
echo ""

check_service() {
    local name=$1
    local url=$2
    if curl -s -o /dev/null -w '' --connect-timeout 2 "$url" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $name is healthy"
        return 0
    else
        echo -e "  ${YELLOW}○${NC} $name is starting..."
        return 1
    fi
}

check_service "Backend API" "http://localhost:5000/health" || true
check_service "Frontend" "http://localhost:5173" || true

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Quick Start Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  🌐 Frontend:    http://localhost:5173"
echo "  🔌 Backend:     http://localhost:5000"
echo "  📚 API Docs:    http://localhost:5000/api/v1/docs"
echo ""
echo "Default credentials:"
echo "  Email: admin@novasight.io"
echo "  Pass:  Admin123!"
echo ""
echo "Commands:"
echo "  View logs:      docker compose logs -f backend frontend"
echo "  Stop:           docker compose down"
echo "  Full start:     ./scripts/start-dev.sh"
echo ""
