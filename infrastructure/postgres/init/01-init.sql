-- =========================================
-- NovaSight PostgreSQL Initialization
-- =========================================
-- This script only creates extensions.
-- Tables are created by SQLAlchemy's db.create_all() from the models
-- to ensure schema is always in sync.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
