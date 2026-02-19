#!/bin/bash
# =========================================
# Create additional databases
# =========================================
# This script creates the dagster database in the same postgres server
# Run after the main postgres init

set -e

# Function to create a database if it doesn't exist
create_database_if_not_exists() {
    local database="$1"
    local user="$2"
    
    echo "Checking if database '$database' exists..."
    
    if psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='$database'" | grep -q 1; then
        echo "Database '$database' already exists"
    else
        echo "Creating database '$database'..."
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
            CREATE DATABASE $database;
            GRANT ALL PRIVILEGES ON DATABASE $database TO $user;
EOSQL
        echo "Database '$database' created successfully"
    fi
}

# Create dagster database
# Uses the same user as the main novasight database for simplicity
create_database_if_not_exists "dagster" "$POSTGRES_USER"

echo "All additional databases created"
