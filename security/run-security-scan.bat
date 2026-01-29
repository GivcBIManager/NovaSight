@echo off
REM =============================================================================
REM NovaSight Security Scanning Script (Windows)
REM =============================================================================
REM This script runs comprehensive security scans including:
REM - SAST (Static Application Security Testing)
REM - Dependency vulnerability scanning
REM - Secret detection
REM =============================================================================

setlocal enabledelayedexpansion

echo ============================================
echo      NovaSight Security Scanning Suite     
echo ============================================
echo.

set "PROJECT_ROOT=%~dp0.."
set "REPORTS_DIR=%PROJECT_ROOT%\security\reports"
set "TIMESTAMP=%DATE:~-4%%DATE:~-10,2%%DATE:~-7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

REM Create reports directory
if not exist "%REPORTS_DIR%" mkdir "%REPORTS_DIR%"

echo Timestamp: %DATE% %TIME%
echo Reports directory: %REPORTS_DIR%
echo.

REM =============================================================================
REM 1. SAST - Bandit
REM =============================================================================

echo [1/4] Running Bandit (Python SAST)...
where bandit >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    cd /d "%PROJECT_ROOT%"
    bandit -r backend\app -f json -o "%REPORTS_DIR%\bandit_%TIMESTAMP%.json" --configfile .bandit 2>nul
    bandit -r backend\app -f txt --configfile .bandit
    echo [OK] Bandit scan complete
) else (
    echo [WARN] Bandit not installed. Run: pip install bandit
)
echo.

REM =============================================================================
REM 2. Dependency Scanning
REM =============================================================================

echo [2/4] Running Dependency Scans...

REM pip-audit
where pip-audit >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Scanning Python dependencies...
    pip-audit -r "%PROJECT_ROOT%\backend\requirements.txt" --format json > "%REPORTS_DIR%\pip_audit_%TIMESTAMP%.json" 2>&1
    pip-audit -r "%PROJECT_ROOT%\backend\requirements.txt"
) else (
    echo   [WARN] pip-audit not installed. Run: pip install pip-audit
)

REM npm audit
if exist "%PROJECT_ROOT%\frontend\package.json" (
    echo   Scanning Node.js dependencies...
    cd /d "%PROJECT_ROOT%\frontend"
    call npm audit --json > "%REPORTS_DIR%\npm_audit_%TIMESTAMP%.json" 2>&1
    call npm audit
    cd /d "%PROJECT_ROOT%"
)

echo [OK] Dependency scans complete
echo.

REM =============================================================================
REM 3. Secret Scanning
REM =============================================================================

echo [3/4] Running Secret Scans...
where gitleaks >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    cd /d "%PROJECT_ROOT%"
    gitleaks detect --source . --report-format json --report-path "%REPORTS_DIR%\gitleaks_%TIMESTAMP%.json"
    echo [OK] Gitleaks scan complete
) else (
    echo [WARN] Gitleaks not installed
)
echo.

REM =============================================================================
REM 4. Security Tests
REM =============================================================================

echo [4/4] Running Security Test Suite...
where pytest >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    cd /d "%PROJECT_ROOT%"
    pytest backend\tests\security\ -v --tb=short --junitxml="%REPORTS_DIR%\security_tests_%TIMESTAMP%.xml"
    echo [OK] Security tests complete
) else (
    echo [WARN] pytest not installed
)
echo.

REM =============================================================================
REM Summary
REM =============================================================================

echo ============================================
echo            Security Scan Summary           
echo ============================================
echo.
echo Scan completed at: %DATE% %TIME%
echo Reports generated in: %REPORTS_DIR%
echo.
dir /b "%REPORTS_DIR%\*%TIMESTAMP%*" 2>nul
echo.
echo [OK] Security scans completed

endlocal
