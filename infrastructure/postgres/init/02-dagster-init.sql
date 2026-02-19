-- =========================================
-- Dagster Database Initialization
-- =========================================
-- Creates a separate database for Dagster storage
-- within the same PostgreSQL server
-- 
-- NOTE: This runs after 01-init.sql

-- Create dagster database if not exists
-- PostgreSQL doesn't support CREATE DATABASE IF NOT EXISTS, 
-- so we use a DO block to check first
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dagster') THEN
        -- We cannot create database inside a transaction block
        -- So we need to use dblink or create it differently
        RAISE NOTICE 'Dagster database will be created via separate command';
    END IF;
END
$$;

-- Note: The actual database creation is handled by docker-compose
-- environment variable or a separate shell script since CREATE DATABASE
-- cannot run inside a transaction.
