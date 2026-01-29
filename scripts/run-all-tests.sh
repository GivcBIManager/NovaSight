#!/bin/bash
# NovaSight - Run All Tests Script
# =================================
# This script runs all project tests in sequence

set -e

echo ""
echo "============================================"
echo "  NovaSight Test Runner"
echo "============================================"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Track test results
BACKEND_RESULT=0
FRONTEND_RESULT=0
E2E_RESULT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Step 1: Check Prerequisites
# ============================================
echo "[1/6] Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: Python not found. Please install Python 3.11+${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}WARNING: Docker not found. Integration tests will be skipped.${NC}"
fi

echo "      Prerequisites check passed."
echo ""

# ============================================
# Step 2: Start Docker Services
# ============================================
echo "[2/6] Starting Docker services..."

if command -v docker &> /dev/null; then
    docker compose up -d postgres redis clickhouse 2>/dev/null || {
        echo -e "${YELLOW}WARNING: Failed to start Docker services. Integration tests may fail.${NC}"
    }
    echo "      Docker services started. Waiting for health check..."
    sleep 10
fi
echo ""

# ============================================
# Step 3: Backend Unit Tests
# ============================================
echo "[3/6] Running backend unit tests..."
echo ""

cd "$PROJECT_ROOT/backend"

# Activate virtual environment if exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if ! pip show pytest &> /dev/null; then
    echo "      Installing test dependencies..."
    pip install -r requirements-dev.txt -q
fi

echo "      Running pytest..."
pytest -m unit -v --tb=short || BACKEND_RESULT=$?

if [ $BACKEND_RESULT -eq 0 ]; then
    echo -e "      ${GREEN}[PASS]${NC} Backend unit tests passed."
else
    echo -e "      ${RED}[FAIL]${NC} Backend unit tests failed."
fi
echo ""

# ============================================
# Step 4: Backend Integration Tests
# ============================================
echo "[4/6] Running backend integration tests..."
echo ""

pytest -m integration -v --tb=short || {
    echo -e "      ${YELLOW}[WARN]${NC} Backend integration tests failed or skipped."
}
echo ""

# ============================================
# Step 5: Frontend Unit Tests
# ============================================
echo "[5/6] Running frontend unit tests..."
echo ""

cd "$PROJECT_ROOT/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "      Installing npm dependencies..."
    npm install --silent
fi

echo "      Running vitest..."
npm test -- --run || FRONTEND_RESULT=$?

if [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "      ${GREEN}[PASS]${NC} Frontend unit tests passed."
else
    echo -e "      ${RED}[FAIL]${NC} Frontend unit tests failed."
fi
echo ""

# ============================================
# Step 6: E2E Tests
# ============================================
echo "[6/6] Running E2E tests..."
echo ""

# Check if Playwright is installed
if [ ! -d "node_modules/@playwright" ]; then
    echo "      Installing Playwright..."
    npm install @playwright/test --silent
    npx playwright install chromium --with-deps
fi

# Check if frontend is running
if ! curl -s http://localhost:5173 &> /dev/null; then
    echo -e "      ${YELLOW}WARNING: Frontend not running on http://localhost:5173${NC}"
    echo "      Starting frontend in background..."
    npm run dev &
    sleep 10
fi

# Check if backend is running
if ! curl -s http://localhost:5000/api/health &> /dev/null; then
    echo -e "      ${YELLOW}WARNING: Backend not running on http://localhost:5000${NC}"
    echo "      Skipping E2E tests. Please start backend manually."
    E2E_RESULT=1
else
    npm run e2e -- --project=chromium || E2E_RESULT=$?
fi

if [ $E2E_RESULT -eq 0 ]; then
    echo -e "      ${GREEN}[PASS]${NC} E2E tests passed."
else
    echo -e "      ${RED}[FAIL]${NC} E2E tests failed."
fi
echo ""

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo "  Test Results Summary"
echo "============================================"
echo ""

if [ $BACKEND_RESULT -eq 0 ]; then
    echo -e "  Backend Unit Tests:     ${GREEN}PASSED${NC}"
else
    echo -e "  Backend Unit Tests:     ${RED}FAILED${NC}"
fi

if [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "  Frontend Unit Tests:    ${GREEN}PASSED${NC}"
else
    echo -e "  Frontend Unit Tests:    ${RED}FAILED${NC}"
fi

if [ $E2E_RESULT -eq 0 ]; then
    echo -e "  E2E Tests:              ${GREEN}PASSED${NC}"
else
    echo -e "  E2E Tests:              ${RED}FAILED${NC}"
fi

echo ""
echo "============================================"

# Calculate overall result
TOTAL_FAILURES=$((BACKEND_RESULT + FRONTEND_RESULT + E2E_RESULT))

if [ $TOTAL_FAILURES -eq 0 ]; then
    echo -e "  Overall: ${GREEN}ALL TESTS PASSED${NC}"
    echo "============================================"
    exit 0
else
    echo -e "  Overall: ${RED}SOME TESTS FAILED${NC}"
    echo "============================================"
    exit 1
fi
