"""
NovaSight Platform — Tenant Resolver Implementation
======================================================

Concrete ``ITenantResolver`` and ``ITenantSchemaManager``
backed by ``flask.g`` and PostgreSQL DDL helpers.
"""

from __future__ import annotations

from typing import List, Optional
import logging

from flask import g

from app.platform.tenant.interfaces import ITenantResolver, ITenantSchemaManager

logger = logging.getLogger(__name__)


class TenantResolver(ITenantResolver):
    """
    Default tenant resolver — reads from ``flask.g`` populated by
    ``TenantContextMiddleware``.
    """

    def get_current_tenant_id(self) -> Optional[str]:
        return getattr(g, "tenant_id", None)

    def get_current_tenant(self) -> Optional[object]:
        return getattr(g, "tenant", None)

    def require_tenant_id(self) -> str:
        tid = self.get_current_tenant_id()
        if not tid:
            from flask import abort
            abort(401, description="Tenant context required")
        return tid


class TenantSchemaManager(ITenantSchemaManager):
    """
    Default schema manager — delegates to functions in
    ``app.platform.tenant.schema``.
    """

    def get_schema_name(self, tenant_slug: str) -> str:
        from app.platform.tenant.schema import get_tenant_schema_name
        return get_tenant_schema_name(tenant_slug)

    def create_schema(self, tenant_slug: str) -> bool:
        from app.platform.tenant.schema import create_tenant_schema
        return create_tenant_schema(tenant_slug)

    def drop_schema(self, tenant_slug: str, cascade: bool = False) -> bool:
        from app.platform.tenant.schema import drop_tenant_schema
        return drop_tenant_schema(tenant_slug, cascade=cascade)

    def schema_exists(self, schema_name: str) -> bool:
        from app.platform.tenant.schema import schema_exists
        return schema_exists(schema_name)

    def list_schemas(self) -> List[str]:
        from app.platform.tenant.schema import list_tenant_schemas
        return list_tenant_schemas()


# Module-level singletons
tenant_resolver = TenantResolver()
tenant_schema_manager = TenantSchemaManager()
