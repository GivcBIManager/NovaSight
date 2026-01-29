# NovaSight Testing Guide

This document provides step-by-step instructions for running all tests in the NovaSight project.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Backend Tests](#backend-tests)
4. [Frontend Tests](#frontend-tests)
5. [E2E Tests with Playwright](#e2e-tests-with-playwright)
6. [Integration Tests](#integration-tests)
7. [Multi-Agent Workflow Tests](#multi-agent-workflow-tests)
8. [CI/CD Pipeline Tests](#cicd-pipeline-tests)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.11+ | Backend testing |
| Node.js | 18+ | Frontend & E2E testing |
| Docker | 24+ | Integration tests |
| Docker Compose | 2.20+ | Service orchestration |

### Verify Installation

```bash
# Check versions
python --version    # Python 3.11+
node --version      # v18+
npm --version       # 9+
docker --version    # 24+
docker compose version
```

---

## Quick Start

Run all tests with a single command:

```bash
# From project root
# Option 1: Run all tests sequentially
./scripts/run-all-tests.sh    # Linux/Mac
.\scripts\run-all-tests.bat   # Windows

# Option 2: Manual execution
docker compose up -d postgres redis clickhouse   # Start services
cd backend && pytest                             # Backend tests
cd frontend && npm test                          # Frontend unit tests
cd frontend && npm run e2e                       # E2E tests
```

---

## Backend Tests

### Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Running Tests

#### All Backend Tests
```bash
# From backend/ directory
pytest
```

#### Unit Tests Only
```bash
pytest -m unit
```

#### Integration Tests Only
```bash
# Requires Docker services running
docker compose up -d postgres redis clickhouse
pytest -m integration
```

#### Specific Test Files
```bash
# Single file
pytest tests/unit/test_auth.py

# Specific test function
pytest tests/unit/test_auth.py::test_login_success

# Pattern matching
pytest -k "auth"
pytest -k "dashboard and not slow"
```

#### With Coverage Report
```bash
# Generate coverage report
pytest --cov=app --cov-report=html --cov-report=term

# View HTML report
# Open htmlcov/index.html in browser
```

#### Parallel Execution (Faster)
```bash
# Run tests in parallel using all CPU cores
pytest -n auto

# Specify number of workers
pytest -n 4
```

### Test Categories

| Marker | Description | Command |
|--------|-------------|---------|
| `unit` | Fast unit tests | `pytest -m unit` |
| `integration` | Requires database | `pytest -m integration` |
| `slow` | Tests > 1 second | `pytest -m slow` |
| `security` | Security tests | `pytest -m security` |
| `container` | Requires Docker | `pytest -m container` |

### Backend Test Structure

```
backend/tests/
├── conftest.py              # Shared fixtures
├── factories.py             # Test data factories
├── fixtures/                # Test data files
├── unit/                    # Unit tests
│   ├── test_auth.py
│   ├── test_auth_service.py
│   ├── test_connection_api.py
│   ├── test_connectors.py
│   ├── test_dag_generator.py
│   ├── test_dashboard_api.py
│   ├── test_template_engine.py
│   └── ... (25+ test files)
└── integration/             # Integration tests
    ├── conftest.py
    ├── test_admin_flow.py
    ├── test_auth_flow.py
    ├── test_dashboard_flow.py
    ├── test_datasource_flow.py
    ├── test_query_flow.py
    └── test_semantic_flow.py
```

---

## Frontend Tests

### Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Running Unit Tests

#### All Unit Tests
```bash
npm test
```

#### Watch Mode (Development)
```bash
npm test -- --watch
```

#### With Coverage
```bash
npm run test:coverage
```

#### Specific Test File
```bash
npm test -- src/components/Button.test.tsx
```

### Frontend Test Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── *.test.tsx       # Component tests
│   ├── hooks/
│   │   └── *.test.ts        # Hook tests
│   └── services/
│       └── *.test.ts        # Service tests
└── vitest.config.ts         # Test configuration
```

---

## E2E Tests with Playwright

### Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not done)
npm install

# Install Playwright browsers
npm run e2e:install

# Or manually:
npx playwright install --with-deps
```

### Start Application

E2E tests require the full application stack running:

```bash
# Terminal 1: Start backend services
docker compose up -d

# Terminal 2: Start backend
cd backend
python run.py

# Terminal 3: Start frontend
cd frontend
npm run dev
```

### Running E2E Tests

#### All E2E Tests
```bash
npm run e2e
```

#### Interactive UI Mode (Recommended for Development)
```bash
npm run e2e:ui
```

#### Headed Mode (See Browser)
```bash
npm run e2e:headed
```

#### Debug Mode
```bash
npm run e2e:debug
```

#### Specific Test File
```bash
npx playwright test e2e/tests/auth.spec.ts
```

#### Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

#### Mobile Viewport
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

#### Generate Test Code (Record Actions)
```bash
npm run e2e:codegen
```

### View Test Reports

```bash
# Generate and open HTML report
npm run e2e:report

# Or manually:
npx playwright show-report
```

### E2E Test Structure

```
frontend/e2e/
├── .auth/                   # Authentication state storage
│   └── user.json
├── fixtures.ts              # Page Object fixtures
├── global-setup.ts          # Pre-test setup (auth)
├── global-teardown.ts       # Post-test cleanup
├── pages/                   # Page Object Models
│   ├── index.ts
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── DataSourcesPage.ts
│   ├── QueryPage.ts
│   └── ConnectionsPage.ts
├── tests/                   # Test specifications
│   ├── auth.spec.ts
│   ├── dashboard-builder.spec.ts
│   ├── data-sources.spec.ts
│   ├── query-interface.spec.ts
│   └── admin.spec.ts
└── utils/
    └── test-utils.ts        # Helper functions
```

### E2E Test Configuration

Key settings in `playwright.config.ts`:

| Setting | Value | Description |
|---------|-------|-------------|
| `baseURL` | `http://localhost:5173` | Frontend URL |
| `timeout` | 60000 | Test timeout (60s) |
| `retries` | 2 (CI) | Retry failed tests |
| `workers` | 1 (CI) | Parallel workers |

---

## Integration Tests

### Prerequisites

Start all required services:

```bash
# Start Docker services
docker compose up -d postgres redis clickhouse

# Verify services are healthy
docker compose ps

# Check logs if issues
docker compose logs postgres
docker compose logs clickhouse
```

### Database Setup

```bash
# Initialize database (first time)
./scripts/init-db.sh

# Or manually:
docker compose exec postgres psql -U novasight -d novasight_platform -f /docker-entrypoint-initdb.d/init.sql
```

### Run Integration Tests

```bash
cd backend
pytest -m integration -v
```

### Full Stack Integration

For complete integration testing:

```bash
# Terminal 1: Services
docker compose up -d

# Terminal 2: Run integration tests
cd backend
pytest -m integration --docker

# Terminal 3: Run E2E tests
cd frontend
npm run e2e
```

---

## Multi-Agent Workflow Tests

These tests validate the complete multi-agent orchestration system.

### Setup

```bash
cd tests

# Install test dependencies
pip install -r requirements.txt
```

### Run Workflow Tests

```bash
# All workflow tests
python -m pytest multi_agent_workflow_test.py -v

# With detailed output
python -m pytest multi_agent_workflow_test.py -v -s
```

See [WORKFLOW_TEST_EXECUTION.md](../tests/WORKFLOW_TEST_EXECUTION.md) for detailed workflow testing instructions.

---

## CI/CD Pipeline Tests

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests

### Local CI Simulation

```bash
# Install act (GitHub Actions local runner)
# https://github.com/nektos/act

# Run CI locally
act -j test

# Run specific workflow
act -W .github/workflows/test.yml
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

---

## Test Commands Reference

### Backend (pytest)

| Command | Description |
|---------|-------------|
| `pytest` | Run all tests |
| `pytest -m unit` | Unit tests only |
| `pytest -m integration` | Integration tests |
| `pytest -m "not slow"` | Skip slow tests |
| `pytest -k "auth"` | Tests matching "auth" |
| `pytest -n auto` | Parallel execution |
| `pytest --cov=app` | With coverage |
| `pytest -v` | Verbose output |
| `pytest -x` | Stop on first failure |
| `pytest --lf` | Run last failed |
| `pytest --pdb` | Debug on failure |

### Frontend (Vitest)

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:coverage` | With coverage |
| `npm test -- --watch` | Watch mode |
| `npm test -- --ui` | UI mode |

### E2E (Playwright)

| Command | Description |
|---------|-------------|
| `npm run e2e` | Run all E2E tests |
| `npm run e2e:ui` | Interactive UI |
| `npm run e2e:headed` | See browser |
| `npm run e2e:debug` | Debug mode |
| `npm run e2e:report` | View report |
| `npm run e2e:codegen` | Record tests |
| `npm run e2e:install` | Install browsers |

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Restart PostgreSQL
docker compose restart postgres

# Check connection
docker compose exec postgres psql -U novasight -c "SELECT 1"
```

#### 2. Playwright Browsers Not Installed

```bash
# Install all browsers
npx playwright install --with-deps

# Install specific browser
npx playwright install chromium
```

#### 3. Port Already in Use

```bash
# Find process using port
# Windows:
netstat -ano | findstr :5000
# Linux/Mac:
lsof -i :5000

# Kill process or change port
```

#### 4. Test Timeout

```bash
# Increase timeout for slow tests
pytest --timeout=600

# Playwright: Set in config or command
npx playwright test --timeout=120000
```

#### 5. Flaky Tests

```bash
# Retry failed tests
pytest --reruns 3

# Playwright retries
npx playwright test --retries=3
```

### Reset Test Environment

```bash
# Reset Docker volumes
docker compose down -v

# Clean frontend
cd frontend
rm -rf node_modules
npm install
npx playwright install --with-deps

# Clean backend
cd backend
rm -rf __pycache__ .pytest_cache .coverage htmlcov
pip install -r requirements-dev.txt
```

### Debug Mode

```bash
# Backend: Drop into debugger on failure
pytest --pdb

# Backend: Print statements visible
pytest -s

# Playwright: Interactive debugging
PWDEBUG=1 npx playwright test
```

---

## Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| Backend Core | 80% |
| Backend API | 75% |
| Frontend Components | 70% |
| E2E Critical Paths | 100% |

---

## Support

For testing issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review test output and logs
3. Check GitHub Issues for known problems
4. Create a new issue with:
   - Test command used
   - Full error output
   - Environment details (OS, versions)

---

*NovaSight Testing Guide v1.0*
