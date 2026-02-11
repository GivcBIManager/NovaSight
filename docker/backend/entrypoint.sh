#!/bin/bash
# ============================================================
# NovaSight Backend Entrypoint
# ============================================================
# Runs DB migrations and seeds default users before starting
# the Flask application.
#
# Environment variables:
#   SEED_USERS     - "true" (default) to auto-seed test users
#   SEED_PASSWORD  - Override password for all test users
#   FLASK_ENV      - development | testing | production
#   SKIP_MIGRATIONS - "true" to skip Alembic migrations
# ============================================================

set -e

# ── Logging Functions ──
log_info()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  | $1"; }
log_warn()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN  | $1"; }
log_error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR | $1" >&2; }
log_debug() { [ "${DEBUG:-false}" = "true" ] && echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEBUG | $1"; }

echo "╔═══════════════════════════════════════════════════════╗"
echo "║           NovaSight Backend Starting...               ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
log_info "Environment: FLASK_ENV=${FLASK_ENV:-development}"
log_info "Database URL: ${DATABASE_URL:-not set}"

# ── 1. Wait for PostgreSQL ──
log_info "Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY_COUNT=0
DB_ERROR=""

until python -c "
import psycopg2, os, sys
from urllib.parse import urlparse
try:
    url = os.environ.get('DATABASE_URL', 'postgresql://novasight:novasight@postgres:5432/novasight_platform')
    parsed = urlparse(url)
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        dbname=parsed.path.lstrip('/'),
        connect_timeout=5
    )
    conn.close()
except psycopg2.OperationalError as e:
    print(f'DB_ERROR:{e}', file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f'DB_ERROR:{type(e).__name__}: {e}', file=sys.stderr)
    sys.exit(1)
" 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    DB_ERROR=$(python -c "
import psycopg2, os, sys
from urllib.parse import urlparse
try:
    url = os.environ.get('DATABASE_URL', 'postgresql://novasight:novasight@postgres:5432/novasight_platform')
    parsed = urlparse(url)
    conn = psycopg2.connect(host=parsed.hostname, port=parsed.port or 5432, user=parsed.username, password=parsed.password, dbname=parsed.path.lstrip('/'), connect_timeout=2)
    conn.close()
except Exception as e:
    print(str(e))
" 2>&1 || true)
    
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "PostgreSQL not ready after ${MAX_RETRIES} attempts"
        log_error "Last error: ${DB_ERROR}"
        log_warn "Continuing anyway - application may fail to start"
        break
    fi
    log_warn "Database not ready (${RETRY_COUNT}/${MAX_RETRIES}): ${DB_ERROR}"
    sleep 2
done

if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    log_info "Database connection established successfully"
fi

# ── 2. Run Alembic migrations ──
if [ "${SKIP_MIGRATIONS}" != "true" ]; then
    log_info "Running database migrations..."
    MIGRATION_OUTPUT=$(flask db upgrade 2>&1) && MIGRATION_STATUS=$? || MIGRATION_STATUS=$?
    
    if [ $MIGRATION_STATUS -eq 0 ]; then
        log_info "Migrations completed successfully"
    else
        # Check if it's just "already exists" errors
        if echo "$MIGRATION_OUTPUT" | grep -q "already exists\|duplicate\|nothing to do"; then
            log_info "Migrations skipped - database already up to date"
        else
            log_warn "Migration command returned non-zero exit code: $MIGRATION_STATUS"
            log_warn "Migration output: $MIGRATION_OUTPUT"
        fi
    fi
else
    log_info "Skipping migrations (SKIP_MIGRATIONS=true)"
fi

# ── 3. Seed default users ──
if [ "${SEED_USERS:-true}" = "true" ] || [ "${SEED_USERS}" = "1" ] || [ "${SEED_USERS}" = "yes" ]; then
    log_info "Seeding default test users..."
    SEED_OUTPUT=$(flask seed users 2>&1) && SEED_STATUS=$? || SEED_STATUS=$?
    
    if [ $SEED_STATUS -eq 0 ]; then
        log_info "User seeding completed"
    else
        if echo "$SEED_OUTPUT" | grep -q "already exists\|already seeded"; then
            log_info "Users already seeded - skipping"
        else
            log_warn "Seed command returned non-zero: $SEED_STATUS"
            log_debug "Seed output: $SEED_OUTPUT"
        fi
    fi
else
    log_info "Skipping user seeding (SEED_USERS=${SEED_USERS})"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           NovaSight Backend Ready! 🚀                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ── 4. Start the application ──
exec "$@"
