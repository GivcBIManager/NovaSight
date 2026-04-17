"""
NovaSight Tenants Domain — Provisioning
=========================================

Canonical location: ``app.domains.tenants.infrastructure.provisioning``

Infrastructure provisioning for new tenants:
 * PostgreSQL schema creation / deletion
 * ClickHouse database creation / deletion
"""

import logging
from typing import TYPE_CHECKING, Optional

from sqlalchemy import text

from app.extensions import db

if TYPE_CHECKING:
    from app.domains.tenants.domain.models import Tenant

logger = logging.getLogger(__name__)


class ProvisioningService:
    """Creates and destroys infrastructure resources for tenants."""

    def provision(self, tenant: "Tenant") -> None:
        """
        Full provisioning: PG schema + ClickHouse database.

        Raises on failure so the caller can roll back.
        """
        self.create_pg_schema(tenant)
        self.create_ch_database(tenant)
        logger.info("Provisioned resources for tenant: %s", tenant.slug)

    def deprovision(self, tenant: "Tenant", force: bool = False) -> None:
        """
        Full deprovisioning: Drop PG schema + ClickHouse database.

        Args:
            tenant: The tenant to deprovision
            force: If True, drop even if data exists (DANGEROUS)

        Raises on failure so the caller can handle accordingly.
        """
        # Drop ClickHouse database first (contains analytics data)
        self.drop_ch_database(tenant, force=force)
        # Then drop PostgreSQL schema
        self.drop_pg_schema(tenant, force=force)
        logger.info("Deprovisioned resources for tenant: %s", tenant.slug)

    # ------------------------------------------------------------------
    # PostgreSQL
    # ------------------------------------------------------------------

    def create_pg_schema(self, tenant: "Tenant") -> None:
        """Create a tenant-specific PostgreSQL schema."""
        try:
            from app.services.template_engine import template_engine

            engine = template_engine()  # Call to get the TemplateEngine instance
            sql = engine.render(
                "sql/tenant_schema.sql.j2",
                {
                    "tenant_id": str(tenant.id),
                    "tenant_slug": tenant.slug,
                },
            )
            db.session.execute(text(sql))
            logger.info(
                "Created PostgreSQL schema for tenant: %s", tenant.slug
            )
        except Exception as e:
            logger.error(
                "Failed to create PG schema for %s: %s", tenant.slug, e
            )
            raise

    # ------------------------------------------------------------------
    # ClickHouse
    # ------------------------------------------------------------------

    def create_ch_database(self, tenant: "Tenant") -> None:
        """Create a tenant-specific ClickHouse database."""
        try:
            from app.services.template_engine import template_engine
            from app.domains.analytics.infrastructure.clickhouse_client import ClickHouseClient

            engine = template_engine()  # Call to get the TemplateEngine instance
            sql = engine.render(
                "clickhouse/tenant_database.sql.j2",
                {
                    "tenant_id": str(tenant.id),
                    "tenant_slug": tenant.slug,
                },
            )
            client = ClickHouseClient()

            # clickhouse-driver does NOT support multi-statement execution.
            # The rendered template contains multiple DDL statements separated
            # by semicolons (CREATE DATABASE, CREATE TABLE, CREATE VIEW, etc.).
            # We must split them and execute each one individually.
            executed = 0
            for statement in sql.split(";"):
                statement = statement.strip()
                # Skip empty strings and pure SQL comments
                if not statement or all(
                    line.strip().startswith("--") or not line.strip()
                    for line in statement.splitlines()
                ):
                    continue
                client.execute(statement)
                executed += 1

            logger.info(
                "Created ClickHouse database for tenant: %s (%d statements executed)",
                tenant.slug,
                executed,
            )
        except Exception as e:
            logger.error(
                "Failed to create CH database for %s: %s", tenant.slug, e
            )
            raise

    def drop_pg_schema(self, tenant: "Tenant", force: bool = False) -> None:
        """
        Drop a tenant-specific PostgreSQL schema.
        
        Args:
            tenant: The tenant whose schema to drop
            force: If True, use CASCADE to drop even with dependencies
        """
        import re
        schema_name = f"tenant_{re.sub(r'[^a-z0-9_]', '_', tenant.slug.lower())}"
        
        try:
            cascade = "CASCADE" if force else "RESTRICT"
            sql = f"DROP SCHEMA IF EXISTS {schema_name} {cascade}"
            db.session.execute(text(sql))
            db.session.commit()
            logger.info(
                "Dropped PostgreSQL schema for tenant: %s (force=%s)",
                tenant.slug, force
            )
        except Exception as e:
            logger.error(
                "Failed to drop PG schema for %s: %s", tenant.slug, e
            )
            raise

    def drop_ch_database(self, tenant: "Tenant", force: bool = False) -> None:
        """
        Drop a tenant-specific ClickHouse database.
        
        Args:
            tenant: The tenant whose database to drop
            force: If True, drop even if tables contain data
        """
        import re
        from app.domains.analytics.infrastructure.clickhouse_client import ClickHouseClient
        
        db_name = f"tenant_{re.sub(r'[^a-z0-9_]', '_', tenant.slug.lower())}"
        
        try:
            client = ClickHouseClient()
            
            if not force:
                # Check if database has data before dropping
                check_sql = f"""
                    SELECT sum(rows) as total_rows
                    FROM system.parts
                    WHERE database = '{db_name}'
                    AND active = 1
                """
                result = client.execute(check_sql)
                if result.rows and result.rows[0] and result.rows[0][0] > 0:
                    raise ValueError(
                        f"Database {db_name} contains {result.rows[0][0]} rows. "
                        "Use force=True to drop anyway."
                    )
            
            # Drop the database
            drop_sql = f"DROP DATABASE IF EXISTS {db_name}"
            client.execute(drop_sql)
            
            logger.info(
                "Dropped ClickHouse database for tenant: %s (force=%s)",
                tenant.slug, force
            )
        except Exception as e:
            logger.error(
                "Failed to drop CH database for %s: %s", tenant.slug, e
            )
            raise

    # ------------------------------------------------------------------
    # Utility methods
    # ------------------------------------------------------------------

    def get_tenant_database_name(self, tenant: "Tenant") -> str:
        """Get the ClickHouse database name for a tenant."""
        import re
        return f"tenant_{re.sub(r'[^a-z0-9_]', '_', tenant.slug.lower())}"

    def database_exists(self, tenant: "Tenant") -> bool:
        """Check if the tenant's ClickHouse database exists."""
        from app.domains.analytics.infrastructure.clickhouse_client import ClickHouseClient
        
        db_name = self.get_tenant_database_name(tenant)
        try:
            client = ClickHouseClient()
            result = client.execute(
                f"SELECT 1 FROM system.databases WHERE name = '{db_name}'"
            )
            return bool(result.rows)
        except Exception:
            return False
