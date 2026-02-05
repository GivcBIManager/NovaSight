#!/bin/bash
# ============================================
# NovaSight Database Setup Script
# ============================================
# Initializes databases, runs migrations, and seeds data
#
# Usage: ./scripts/setup-db.sh [options]
#
# Options:
#   --fresh      Drop and recreate all tables
#   --seed       Seed sample data for testing
#   --migrate    Run migrations only (default)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Options
FRESH=false
SEED=false
MIGRATE=true

for arg in "$@"; do
    case $arg in
        --fresh)
            FRESH=true
            ;;
        --seed)
            SEED=true
            ;;
        --migrate)
            MIGRATE=true
            ;;
    esac
done

echo ""
echo -e "${BLUE}NovaSight Database Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Determine compose command
COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
fi

cd "$PROJECT_ROOT"

# Check if services are running
echo -e "${BLUE}[1/4]${NC} Checking database services..."
if ! $COMPOSE_CMD ps postgres 2>/dev/null | grep -q "running"; then
    echo -e "${YELLOW}PostgreSQL not running. Starting...${NC}"
    $COMPOSE_CMD up -d postgres
    sleep 10
fi

echo -e "${GREEN}✓${NC} PostgreSQL is running"

# Fresh install - drop all tables
if [ "$FRESH" = true ]; then
    echo ""
    echo -e "${YELLOW}WARNING: This will delete all data. Continue? (y/N)${NC}"
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    
    echo -e "${BLUE}[2/4]${NC} Dropping existing tables..."
    $COMPOSE_CMD exec -T backend python -c "
from app import create_app, db
app = create_app()
with app.app_context():
    db.drop_all()
    print('All tables dropped.')
"
    echo -e "${GREEN}✓${NC} Tables dropped"
fi

# Run migrations
if [ "$MIGRATE" = true ]; then
    echo -e "${BLUE}[3/4]${NC} Running database migrations..."
    
    $COMPOSE_CMD exec -T backend flask db upgrade
    
    echo -e "${GREEN}✓${NC} Migrations complete"
fi

# Seed data
if [ "$SEED" = true ]; then
    echo -e "${BLUE}[4/4]${NC} Seeding sample data..."
    
    $COMPOSE_CMD exec -T backend flask seed-data
    
    echo -e "${GREEN}✓${NC} Sample data seeded"
fi

# Initialize ClickHouse
echo ""
echo -e "${BLUE}Initializing ClickHouse...${NC}"
if $COMPOSE_CMD ps clickhouse 2>/dev/null | grep -q "running"; then
    $COMPOSE_CMD exec -T clickhouse clickhouse-client --query "CREATE DATABASE IF NOT EXISTS novasight"
    echo -e "${GREEN}✓${NC} ClickHouse initialized"
else
    echo -e "${YELLOW}ClickHouse not running. Skipping...${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}Database setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Default admin user:"
echo "  Email: admin@novasight.io"
echo "  Password: Admin123!"
echo ""
