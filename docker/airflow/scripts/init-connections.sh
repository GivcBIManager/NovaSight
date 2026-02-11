#!/bin/bash
# NovaSight Airflow Connections Initialization Script
# =====================================================
# This script creates all required Airflow connections for NovaSight

set -e

echo "=== Initializing NovaSight Airflow Connections ==="

# Wait for Airflow DB to be ready
echo "Waiting for Airflow database..."
sleep 10

# Create Spark connection
# NOTE: For Airflow 3.x Spark provider, the host must include the spark:// protocol prefix
# and spark-home is deprecated - use spark-binary instead (must be on PATH, not full path)
echo "Creating Spark connection..."
airflow connections delete spark_default 2>/dev/null || true
airflow connections add spark_default \
    --conn-type spark \
    --conn-host "spark://spark-master" \
    --conn-port 7077 \
    --conn-extra '{"queue": "root.default", "deploy-mode": "client", "spark-binary": "spark-submit"}'

echo "Spark connection 'spark_default' created successfully"

# Create ClickHouse connection
echo "Creating ClickHouse connection..."
airflow connections delete clickhouse_default 2>/dev/null || true
airflow connections add clickhouse_default \
    --conn-type http \
    --conn-host clickhouse \
    --conn-port 8123 \
    --conn-login default \
    --conn-password clickhouse \
    --conn-extra '{"database": "default"}'

echo "ClickHouse connection 'clickhouse_default' created successfully"

# Create PostgreSQL connection (NovaSight main DB)
echo "Creating NovaSight PostgreSQL connection..."
airflow connections delete novasight_postgres 2>/dev/null || true
airflow connections add novasight_postgres \
    --conn-type postgres \
    --conn-host postgres \
    --conn-port 5432 \
    --conn-login novasight \
    --conn-password novasight \
    --conn-schema novasight

echo "PostgreSQL connection 'novasight_postgres' created successfully"

# Create HTTP connection for NovaSight API
echo "Creating NovaSight API connection..."
airflow connections delete novasight_api 2>/dev/null || true
airflow connections add novasight_api \
    --conn-type http \
    --conn-host backend \
    --conn-port 5000 \
    --conn-extra '{"endpoint": "/api"}'

echo "NovaSight API connection 'novasight_api' created successfully"

echo "=== All connections initialized successfully ==="
