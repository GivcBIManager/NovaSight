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

echo "╔═══════════════════════════════════════════════════════╗"
echo "║           NovaSight Backend Starting...               ║"
echo "╚═══════════════════════════════════════════════════════╝"

# ── 1. Wait for PostgreSQL ──
echo "⏳ Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY_COUNT=0
# Use pg_isready or simple python check with psycopg2
until python -c "
import psycopg2
import os
url = os.environ.get('DATABASE_URL', 'postgresql://novasight:novasight@postgres:5432/novasight_platform')
# Parse the URL
from urllib.parse import urlparse
parsed = urlparse(url)
conn = psycopg2.connect(
    host=parsed.hostname,
    port=parsed.port or 5432,
    user=parsed.username,
    password=parsed.password,
    dbname=parsed.path.lstrip('/')
)
conn.close()
print('Connected!')
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ PostgreSQL not ready after ${MAX_RETRIES} attempts. Continuing anyway..."
        break
    fi
    echo "  Waiting for database... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done
echo "✅ Database connection ready"

# ── 2. Run Alembic migrations ──
if [ "${SKIP_MIGRATIONS}" != "true" ]; then
    echo "🔄 Running database migrations..."
    flask db upgrade 2>&1 || {
        echo "⚠️  Migrations failed (tables may already exist). Continuing..."
    }
    echo "✅ Migrations complete"
else
    echo "⏭️  Skipping migrations (SKIP_MIGRATIONS=true)"
fi

# ── 3. Seed default users ──
if [ "${SEED_USERS:-true}" = "true" ] || [ "${SEED_USERS}" = "1" ] || [ "${SEED_USERS}" = "yes" ]; then
    echo "🌱 Seeding default test users..."
    flask seed users 2>&1 || {
        echo "⚠️  Seeding failed (may already be seeded). Continuing..."
    }
else
    echo "⏭️  Skipping user seeding (SEED_USERS=${SEED_USERS})"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           NovaSight Backend Ready! 🚀                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ── 4. Start the application ──
exec "$@"
