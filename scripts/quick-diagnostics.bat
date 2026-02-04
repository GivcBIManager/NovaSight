@echo off
REM NovaSight Quick Diagnostics
REM ===========================
REM Runs quick health checks on all components

setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
cd /d %PROJECT_ROOT%

echo.
echo ============================================
echo   NovaSight Quick Diagnostics
echo ============================================
echo   %date% %time%
echo ============================================
echo.

set ERRORS=0

REM ============================================
REM Prerequisites Check
REM ============================================
echo [Prerequisites]
echo.

python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo   Python:        %%i [OK]
) else (
    echo   Python:        NOT FOUND [ERROR]
    set /a ERRORS+=1
)

node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=1" %%i in ('node --version') do echo   Node.js:       %%i [OK]
) else (
    echo   Node.js:       NOT FOUND [ERROR]
    set /a ERRORS+=1
)

docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo   Docker:        Installed [OK]
) else (
    echo   Docker:        NOT FOUND [WARNING]
)

echo.

REM ============================================
REM Docker Services Check
REM ============================================
echo [Docker Services]
echo.

docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo   Docker daemon not running [WARNING]
    goto file_check
)

for %%s in (postgres clickhouse redis) do (
    docker ps --filter "name=novasight-%%s" --filter "status=running" -q >nul 2>&1
    docker ps --filter "name=novasight-%%s" --filter "status=running" | findstr /i "novasight-%%s" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   %%s:    Running [OK]
    ) else (
        echo   %%s:    Not Running [INFO]
    )
)

for %%s in (backend frontend) do (
    docker ps --filter "name=novasight-%%s" --filter "status=running" | findstr /i "novasight-%%s" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   %%s:     Running [OK]
    ) else (
        echo   %%s:     Not Running [INFO]
    )
)

echo.

:file_check
REM ============================================
REM File Structure Check
REM ============================================
echo [File Structure]
echo.

if exist "backend\app\__init__.py" (
    echo   backend/app:        Present [OK]
) else (
    echo   backend/app:        MISSING [ERROR]
    set /a ERRORS+=1
)

if exist "frontend\src" (
    echo   frontend/src:       Present [OK]
) else (
    echo   frontend/src:       MISSING [ERROR]
    set /a ERRORS+=1
)

if exist "docker-compose.yml" (
    echo   docker-compose.yml: Present [OK]
) else (
    echo   docker-compose.yml: MISSING [ERROR]
    set /a ERRORS+=1
)

if exist "pytest.ini" (
    echo   pytest.ini:         Present [OK]
) else (
    echo   pytest.ini:         MISSING [WARNING]
)

echo.

REM ============================================
REM Dependencies Check
REM ============================================
echo [Dependencies]
echo.

if exist "backend\venv\Scripts\python.exe" (
    echo   Backend venv:       Present [OK]
) else (
    echo   Backend venv:       Not Created [INFO]
)

if exist "frontend\node_modules" (
    echo   Frontend modules:   Installed [OK]
) else (
    echo   Frontend modules:   Not Installed [INFO]
)

echo.

REM ============================================
REM Test Files Check
REM ============================================
echo [Test Files]
echo.

set /a UNIT_TESTS=0
for %%f in (backend\tests\unit\test_*.py) do set /a UNIT_TESTS+=1
echo   Backend unit tests:        %UNIT_TESTS% files found

set /a INT_TESTS=0
for %%f in (backend\tests\integration\test_*.py) do set /a INT_TESTS+=1
echo   Backend integration tests: %INT_TESTS% files found

set /a E2E_TESTS=0
for %%f in (frontend\e2e\tests\*.spec.ts) do set /a E2E_TESTS+=1
echo   E2E tests:                 %E2E_TESTS% files found

echo.

REM ============================================
REM Summary
REM ============================================
echo ============================================
if !ERRORS! equ 0 (
    echo   Status: ALL CHECKS PASSED
    set FINAL_ERRORS=0
) else (
    echo   Status: !ERRORS! ERROR[S] FOUND
    set FINAL_ERRORS=!ERRORS!
)
echo ============================================
echo.

REM ============================================
REM Suggested Next Steps
REM ============================================
echo [Suggested Next Steps]
echo.
echo   1. Start services:     docker compose up -d postgres redis clickhouse
echo   2. Run backend tests:  cd backend ^&^& pytest -m unit -v
echo   3. Run frontend tests: cd frontend ^&^& npm test
echo   4. Run all tests:      .\scripts\run-all-tests.bat
echo.

exit /b 0
