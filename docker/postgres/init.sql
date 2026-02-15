-- =========================================
-- NovaSight PostgreSQL Initialization
-- =========================================
-- This script only creates extensions and helper functions.
-- Tables are created by SQLAlchemy's db.create_all() from the models.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- TENANT SCHEMA CREATION FUNCTION
-- =========================================
-- Used to create per-tenant schemas for multi-tenancy

CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug TEXT)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'tenant_' || tenant_slug;
    
    -- Create the schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Create tenant-specific data connections table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.data_connections (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            db_type VARCHAR(50) NOT NULL,
            host VARCHAR(255) NOT NULL,
            port INTEGER NOT NULL,
            database VARCHAR(255) NOT NULL,
            schema_name VARCHAR(255),
            username VARCHAR(255) NOT NULL,
            password_encrypted TEXT NOT NULL,
            ssl_mode VARCHAR(50),
            ssl_cert TEXT,
            extra_params JSONB NOT NULL DEFAULT ''{}'',
            status VARCHAR(50) NOT NULL DEFAULT ''active'',
            last_tested_at TIMESTAMP WITH TIME ZONE,
            last_test_result JSONB,
            created_by UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', schema_name);
    
    -- Create tenant-specific ingestion jobs table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.ingestion_jobs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            connection_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            source_type VARCHAR(50) NOT NULL,
            source_config JSONB NOT NULL,
            destination_table VARCHAR(255) NOT NULL,
            load_strategy VARCHAR(50) NOT NULL DEFAULT ''full'',
            incremental_column VARCHAR(255),
            schedule_cron VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT ''active'',
            last_run_at TIMESTAMP WITH TIME ZONE,
            last_run_status VARCHAR(50),
            created_by UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', schema_name);
    
    -- Create tenant-specific DAG configs table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.dag_configs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            dag_id VARCHAR(64) NOT NULL UNIQUE,
            description TEXT,
            current_version INTEGER NOT NULL DEFAULT 1,
            schedule_type VARCHAR(50) NOT NULL DEFAULT ''manual'',
            schedule_cron VARCHAR(100),
            schedule_preset VARCHAR(50),
            timezone VARCHAR(50) NOT NULL DEFAULT ''UTC'',
            start_date TIMESTAMP WITH TIME ZONE,
            catchup BOOLEAN NOT NULL DEFAULT FALSE,
            max_active_runs INTEGER NOT NULL DEFAULT 1,
            default_retries INTEGER NOT NULL DEFAULT 1,
            default_retry_delay_minutes INTEGER NOT NULL DEFAULT 5,
            notification_emails TEXT[] NOT NULL DEFAULT ''{}'',
            email_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
            email_on_success BOOLEAN NOT NULL DEFAULT FALSE,
            tags TEXT[] NOT NULL DEFAULT ''{}'',
            status VARCHAR(50) NOT NULL DEFAULT ''draft'',
            deployed_at TIMESTAMP WITH TIME ZONE,
            deployed_version INTEGER,
            created_by UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', schema_name);
    
    -- Create tenant-specific task configs table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.task_configs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            dag_config_id UUID NOT NULL,
            task_id VARCHAR(64) NOT NULL,
            task_type VARCHAR(50) NOT NULL,
            config JSONB NOT NULL DEFAULT ''{}'',
            timeout_minutes INTEGER NOT NULL DEFAULT 60,
            retries INTEGER NOT NULL DEFAULT 1,
            retry_delay_minutes INTEGER NOT NULL DEFAULT 5,
            trigger_rule VARCHAR(50) NOT NULL DEFAULT ''all_success'',
            depends_on TEXT[] NOT NULL DEFAULT ''{}'',
            position_x INTEGER NOT NULL DEFAULT 0,
            position_y INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT uq_dag_task UNIQUE (dag_config_id, task_id)
        )', schema_name);
    
    -- Create tenant-specific dbt models table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.dbt_models (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            model_type VARCHAR(50) NOT NULL DEFAULT ''transform'',
            sql_content TEXT NOT NULL,
            materialization VARCHAR(50) NOT NULL DEFAULT ''view'',
            tags TEXT[] NOT NULL DEFAULT ''{}'',
            depends_on TEXT[] NOT NULL DEFAULT ''{}'',
            columns JSONB NOT NULL DEFAULT ''[]'',
            tests JSONB NOT NULL DEFAULT ''[]'',
            status VARCHAR(50) NOT NULL DEFAULT ''draft'',
            last_run_at TIMESTAMP WITH TIME ZONE,
            last_run_status VARCHAR(50),
            created_by UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', schema_name);
    
    RAISE NOTICE 'Created tenant schema: %', schema_name;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- DROP TENANT SCHEMA FUNCTION
-- =========================================

CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_slug TEXT)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'tenant_' || tenant_slug;
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
    RAISE NOTICE 'Dropped tenant schema: %', schema_name;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- UPDATED_AT TRIGGER FUNCTION
-- =========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- Note: Tables, indexes, roles, and seed data
-- are created by the backend entrypoint script
-- using SQLAlchemy's db.create_all() and Flask seed commands.
-- This ensures schema is always in sync with models.
-- =========================================

DO $$ BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NovaSight PostgreSQL extensions ready';
    RAISE NOTICE 'Tables will be created by Flask app';
    RAISE NOTICE '========================================';
END $$;
