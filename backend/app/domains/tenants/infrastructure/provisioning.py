"""
NovaSight Tenants Domain — Provisioning
=========================================

Canonical location: ``app.domains.tenants.infrastructure.provisioning``

Infrastructure provisioning for new tenants:
 * PostgreSQL schema creation
 * ClickHouse database creation
"""

import logging
from typing import TYPE_CHECKING

from sqlalchemy import text

from app.extensions import db

if TYPE_CHECKING:
    from app.domains.tenants.domain.models import Tenant

logger = logging.getLogger(__name__)


class ProvisioningService:
    """Creates infrastructure resources for a tenant."""

    def provision(self, tenant: "Tenant") -> None:
        """
        Full provisioning: PG schema + ClickHouse database.

        Raises on failure so the caller can roll back.
        """
        self.create_pg_schema(tenant)
        self.create_ch_database(tenant)
        logger.info("Provisioned resources for tenant: %s", tenant.slug)

    # ------------------------------------------------------------------
    # PostgreSQL
    # ------------------------------------------------------------------

    def create_pg_schema(self, tenant: "Tenant") -> None:
        """Create a tenant-specific PostgreSQL schema."""
        try:
            from app.services.template_engine import template_engine

            sql = template_engine.render(
                "sql/tenant_schema.sql.j2",
                {"tenant_slug": tenant.slug},
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
            from app.services.clickhouse_client import ClickHouseClient

            sql = template_engine.render(
                "clickhouse/tenant_database.sql.j2",
                {
                    "tenant_id": str(tenant.id),
                    "tenant_slug": tenant.slug,
                },
            )
            client = ClickHouseClient()
            client.execute(sql)
            logger.info(
                "Created ClickHouse database for tenant: %s", tenant.slug
            )
        except Exception as e:
            logger.error(
                "Failed to create CH database for %s: %s", tenant.slug, e
            )
            raise
