@echo off
REM ============================================
REM Stop Dagster Services (Windows)
REM ============================================
REM This script stops all Dagster services
REM
REM Usage: scripts\stop-dagster.bat

echo Stopping Dagster services...
docker-compose stop dagster-daemon dagster-webserver dagster-postgres
echo Dagster services stopped.
