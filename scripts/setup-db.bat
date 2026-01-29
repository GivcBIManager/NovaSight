@echo off
REM ============================================
REM NovaSight Database Setup Script (Windows)
REM ============================================
REM Initializes databases, runs migrations, and seeds data
REM
REM Usage: scripts\setup-db.bat [options]
REM
REM Options:
REM   --fresh      Drop and recreate all tables
REM   --seed       Seed sample data for testing
REM   --migrate    Run migrations only (default)

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
cd /d "%PROJECT_ROOT%"

set "FRESH=false"
set "SEED=false"
set "MIGRATE=true"

:parse_args
if "%~1"=="" goto :end_parse
if /i "%~1"=="--fresh" set "FRESH=true"
if /i "%~1"=="--seed" set "SEED=true"
if /i "%~1"=="--migrate" set "MIGRATE=true"
shift
goto :parse_args
:end_parse

echo.
echo NovaSight Database Setup
echo ========================================
echo.

REM Determine compose command
docker compose version >nul 2>nul
if errorlevel 1 (
    set "COMPOSE_CMD=docker-compose"
) else (
    set "COMPOSE_CMD=docker compose"
)

REM Check if PostgreSQL is running
echo [1/4] Checking database services...
%COMPOSE_CMD% ps postgres 2>nul | findstr /i "running" >nul
if errorlevel 1 (
    echo PostgreSQL not running. Starting...
    %COMPOSE_CMD% up -d postgres
    timeout /t 10 /nobreak >nul
)
echo [OK] PostgreSQL is running

REM Fresh install
if "%FRESH%"=="true" (
    echo.
    echo WARNING: This will delete all data.
    set /p "CONFIRM=Continue? (y/N): "
    if /i not "!CONFIRM!"=="y" (
        echo Cancelled.
        exit /b 0
    )
    
    echo [2/4] Dropping existing tables...
    %COMPOSE_CMD% exec -T backend flask db downgrade base
    echo [OK] Tables dropped
)

REM Run migrations
if "%MIGRATE%"=="true" (
    echo [3/4] Running database migrations...
    %COMPOSE_CMD% exec -T backend flask db upgrade
    echo [OK] Migrations complete
)

REM Seed data
if "%SEED%"=="true" (
    echo [4/4] Seeding sample data...
    %COMPOSE_CMD% exec -T backend flask seed-data
    echo [OK] Sample data seeded
)

REM Initialize ClickHouse
echo.
echo Initializing ClickHouse...
%COMPOSE_CMD% ps clickhouse 2>nul | findstr /i "running" >nul
if not errorlevel 1 (
    %COMPOSE_CMD% exec -T clickhouse clickhouse-client --query "CREATE DATABASE IF NOT EXISTS novasight"
    echo [OK] ClickHouse initialized
) else (
    echo [WARN] ClickHouse not running. Skipping...
)

echo.
echo ========================================
echo Database setup complete!
echo ========================================
echo.
echo Default admin user:
echo   Email: admin@novasight.io
echo   Password: admin123
echo.
