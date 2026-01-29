@echo off
REM NovaSight - Run All Tests Script
REM =================================
REM This script runs all project tests in sequence

setlocal enabledelayedexpansion

echo.
echo ============================================
echo   NovaSight Test Runner
echo ============================================
echo.

set PROJECT_ROOT=%~dp0..
cd /d %PROJECT_ROOT%

REM Track test results
set BACKEND_RESULT=0
set FRONTEND_RESULT=0
set E2E_RESULT=0

REM ============================================
REM Step 1: Check Prerequisites
REM ============================================
echo [1/6] Checking prerequisites...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.11+
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    exit /b 1
)

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Docker not found. Integration tests will be skipped.
)

echo       Prerequisites check passed.
echo.

REM ============================================
REM Step 2: Start Docker Services
REM ============================================
echo [2/6] Starting Docker services...

docker compose up -d postgres redis clickhouse 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Failed to start Docker services. Integration tests may fail.
) else (
    echo       Docker services started.
    REM Wait for services to be healthy
    timeout /t 10 /nobreak >nul
)
echo.

REM ============================================
REM Step 3: Backend Unit Tests
REM ============================================
echo [3/6] Running backend unit tests...
echo.

cd /d %PROJECT_ROOT%\backend

REM Check if virtual environment exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Install dependencies if needed
pip show pytest >nul 2>&1
if %errorlevel% neq 0 (
    echo       Installing test dependencies...
    pip install -r requirements-dev.txt -q
)

echo       Running pytest...
pytest -m unit -v --tb=short
set BACKEND_RESULT=%errorlevel%

if %BACKEND_RESULT% equ 0 (
    echo       [PASS] Backend unit tests passed.
) else (
    echo       [FAIL] Backend unit tests failed.
)
echo.

REM ============================================
REM Step 4: Backend Integration Tests
REM ============================================
echo [4/6] Running backend integration tests...
echo.

pytest -m integration -v --tb=short
if %errorlevel% neq 0 (
    echo       [WARN] Backend integration tests failed or skipped.
) else (
    echo       [PASS] Backend integration tests passed.
)
echo.

REM ============================================
REM Step 5: Frontend Unit Tests
REM ============================================
echo [5/6] Running frontend unit tests...
echo.

cd /d %PROJECT_ROOT%\frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo       Installing npm dependencies...
    npm install --silent
)

echo       Running vitest...
call npm test -- --run
set FRONTEND_RESULT=%errorlevel%

if %FRONTEND_RESULT% equ 0 (
    echo       [PASS] Frontend unit tests passed.
) else (
    echo       [FAIL] Frontend unit tests failed.
)
echo.

REM ============================================
REM Step 6: E2E Tests
REM ============================================
echo [6/6] Running E2E tests...
echo.

REM Check if Playwright is installed
if not exist "node_modules\@playwright" (
    echo       Installing Playwright...
    npm install @playwright/test --silent
    npx playwright install chromium --with-deps
)

REM Check if frontend is running
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 (
    echo       WARNING: Frontend not running on http://localhost:5173
    echo       Starting frontend in background...
    start /b npm run dev >nul 2>&1
    timeout /t 10 /nobreak >nul
)

REM Check if backend is running
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo       WARNING: Backend not running on http://localhost:5000
    echo       Skipping E2E tests. Please start backend manually.
    set E2E_RESULT=1
    goto :summary
)

call npm run e2e -- --project=chromium
set E2E_RESULT=%errorlevel%

if %E2E_RESULT% equ 0 (
    echo       [PASS] E2E tests passed.
) else (
    echo       [FAIL] E2E tests failed.
)
echo.

:summary
REM ============================================
REM Summary
REM ============================================
echo.
echo ============================================
echo   Test Results Summary
echo ============================================
echo.

if %BACKEND_RESULT% equ 0 (
    echo   Backend Unit Tests:     PASSED
) else (
    echo   Backend Unit Tests:     FAILED
)

if %FRONTEND_RESULT% equ 0 (
    echo   Frontend Unit Tests:    PASSED
) else (
    echo   Frontend Unit Tests:    FAILED
)

if %E2E_RESULT% equ 0 (
    echo   E2E Tests:              PASSED
) else (
    echo   E2E Tests:              FAILED
)

echo.
echo ============================================

REM Calculate overall result
set /a TOTAL_FAILURES=%BACKEND_RESULT%+%FRONTEND_RESULT%+%E2E_RESULT%

if %TOTAL_FAILURES% equ 0 (
    echo   Overall: ALL TESTS PASSED
    echo ============================================
    exit /b 0
) else (
    echo   Overall: SOME TESTS FAILED
    echo ============================================
    exit /b 1
)

endlocal
