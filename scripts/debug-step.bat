@echo off
REM NovaSight Step-by-Step Debug Runner
REM ====================================
REM This script runs debugging steps interactively

setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
cd /d %PROJECT_ROOT%

echo.
echo ============================================
echo   NovaSight Debug Runner
echo ============================================
echo.

if "%1"=="" goto menu
goto phase_%1

:menu
echo Available debug phases:
echo.
echo   1. Environment Verification
echo   2. Docker Services Health Check
echo   3. Backend Unit Tests
echo   4. Backend Integration Tests
echo   5. Frontend Unit Tests
echo   6. End-to-End Tests
echo   7. Multi-Agent Workflow Tests
echo   8. Security Tests
echo   9. Full System Integration
echo   0. Run All Phases
echo.
echo Usage: debug-step.bat [phase_number]
echo Example: debug-step.bat 3
echo.
goto :eof

:phase_1
echo.
echo ============================================
echo   Phase 1: Environment Verification
echo ============================================
echo.

echo [1.1] Checking Python version...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    goto :eof
)

echo [1.2] Checking Node.js version...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    goto :eof
)

echo [1.3] Checking Docker version...
docker --version
docker compose version

echo [1.4] Checking project structure...
if exist "backend\app\__init__.py" (
    echo       Backend structure: OK
) else (
    echo       Backend structure: MISSING
)

if exist "frontend\package.json" (
    echo       Frontend structure: OK
) else (
    echo       Frontend structure: MISSING
)

if exist "docker-compose.yml" (
    echo       Docker Compose: OK
) else (
    echo       Docker Compose: MISSING
)

echo.
echo Phase 1 Complete!
goto :eof

:phase_2
echo.
echo ============================================
echo   Phase 2: Docker Services Health Check
echo ============================================
echo.

echo [2.1] Starting core infrastructure...
docker compose up -d postgres redis clickhouse

echo [2.2] Waiting for services to be healthy (30 seconds)...
timeout /t 30 /nobreak >nul

echo [2.3] Checking service status...
docker compose ps

echo [2.4] Testing PostgreSQL...
docker exec novasight-postgres pg_isready -U novasight
if %errorlevel% equ 0 (
    echo       PostgreSQL: HEALTHY
) else (
    echo       PostgreSQL: UNHEALTHY
)

echo [2.5] Testing ClickHouse...
docker exec novasight-clickhouse wget -q --spider http://127.0.0.1:8123/ping
if %errorlevel% equ 0 (
    echo       ClickHouse: HEALTHY
) else (
    echo       ClickHouse: UNHEALTHY
)

echo [2.6] Testing Redis...
docker exec novasight-redis redis-cli ping
if %errorlevel% equ 0 (
    echo       Redis: HEALTHY
) else (
    echo       Redis: UNHEALTHY
)

echo.
echo Phase 2 Complete!
goto :eof

:phase_3
echo.
echo ============================================
echo   Phase 3: Backend Unit Tests
echo ============================================
echo.

cd /d %PROJECT_ROOT%\backend

echo [3.1] Checking virtual environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo       Virtual environment activated
) else (
    echo       Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
)

echo [3.2] Installing test dependencies...
pip install -q -r requirements-dev.txt

echo [3.3] Running unit tests...
echo.
pytest -m unit -v --tb=short

echo.
echo [3.4] Running individual test modules...
echo.
echo --- Authentication Tests ---
pytest tests/unit/test_auth.py tests/unit/test_auth_service.py -v --tb=line

echo.
echo --- Connector Tests ---
pytest tests/unit/test_connectors.py -v --tb=line

echo.
echo --- Template Engine Tests ---
pytest tests/unit/test_template_engine.py tests/unit/test_template_validators.py -v --tb=line

echo.
echo --- Security Tests ---
pytest tests/unit/test_encryption_service.py tests/unit/test_password_service.py -v --tb=line

echo.
echo Phase 3 Complete!
cd /d %PROJECT_ROOT%
goto :eof

:phase_4
echo.
echo ============================================
echo   Phase 4: Backend Integration Tests
echo ============================================
echo.

REM Ensure services are running
docker compose up -d postgres redis clickhouse

cd /d %PROJECT_ROOT%\backend

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo [4.1] Running integration tests...
pytest -m integration -v --tb=short

echo.
echo Phase 4 Complete!
cd /d %PROJECT_ROOT%
goto :eof

:phase_5
echo.
echo ============================================
echo   Phase 5: Frontend Unit Tests
echo ============================================
echo.

cd /d %PROJECT_ROOT%\frontend

echo [5.1] Installing dependencies...
call npm install

echo [5.2] Running TypeScript check...
call npx tsc --noEmit

echo [5.3] Running ESLint...
call npm run lint

echo [5.4] Running unit tests...
call npm test -- --run

echo.
echo Phase 5 Complete!
cd /d %PROJECT_ROOT%
goto :eof

:phase_6
echo.
echo ============================================
echo   Phase 6: End-to-End Tests
echo ============================================
echo.

REM Ensure all services are running
docker compose up -d

cd /d %PROJECT_ROOT%\frontend

echo [6.1] Installing Playwright browsers...
call npx playwright install --with-deps chromium

echo [6.2] Running E2E tests...
call npm run e2e

echo [6.3] Generating report...
call npm run e2e:report

echo.
echo Phase 6 Complete!
cd /d %PROJECT_ROOT%
goto :eof

:phase_7
echo.
echo ============================================
echo   Phase 7: Multi-Agent Workflow Tests
echo ============================================
echo.

cd /d %PROJECT_ROOT%

echo [7.1] Running multi-agent workflow tests...
python -m pytest tests/multi_agent_workflow_test.py -v

echo.
echo Phase 7 Complete!
goto :eof

:phase_8
echo.
echo ============================================
echo   Phase 8: Security Tests
echo ============================================
echo.

cd /d %PROJECT_ROOT%\backend

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo [8.1] Running security tests...
if exist "tests\security" (
    pytest tests/security/ -v
) else (
    echo       No security tests directory found
)

echo [8.2] Checking for hardcoded secrets...
findstr /s /i "password.*=" *.py 2>nul | findstr /v "test" | findstr /v "#"
findstr /s /i "secret.*=" *.py 2>nul | findstr /v "test" | findstr /v "#"

echo.
echo Phase 8 Complete!
cd /d %PROJECT_ROOT%
goto :eof

:phase_9
echo.
echo ============================================
echo   Phase 9: Full System Integration
echo ============================================
echo.

echo [9.1] Starting all services...
docker compose up -d

echo [9.2] Waiting for services to be ready (60 seconds)...
timeout /t 60 /nobreak >nul

echo [9.3] Running full test suite...
call scripts\run-all-tests.bat

echo.
echo Phase 9 Complete!
goto :eof

:phase_0
echo.
echo ============================================
echo   Running ALL Phases
echo ============================================
echo.

call :phase_1
call :phase_2
call :phase_3
call :phase_4
call :phase_5
call :phase_6
call :phase_7
call :phase_8
call :phase_9

echo.
echo ============================================
echo   All Phases Complete!
echo ============================================
goto :eof
