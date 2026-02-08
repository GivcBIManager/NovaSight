"""
NovaSight Platform — Tenant Interfaces
========================================

Abstract contracts for tenant resolution, schema management,
and tenant-scoped context.  Domain code should depend on these
interfaces rather than on ``flask.g`` or concrete middleware.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional


# ── Tenant context ────────────────────────────────────────────────


class ITenantResolver(ABC):
    """
    Resolves the current tenant from the request context.

    Concrete implementations read from JWT claims, ``flask.g``,
    or other request-scoped stores.
    """

    @abstractmethod
    def get_current_tenant_id(self) -> Optional[str]:
        """Return the current tenant's UUID, or ``None``."""
        ...

    @abstractmethod
    def get_current_tenant(self) -> Optional[object]:
        """Return the current ``Tenant`` model instance, or ``None``."""
        ...

    @abstractmethod
    def require_tenant_id(self) -> str:
        """
        Return the tenant ID or raise an error.

        Use this in code paths where tenant context is mandatory.
        """
        ...


# ── Schema management ────────────────────────────────────────────


class ITenantSchemaManager(ABC):
    """
    Manages PostgreSQL schema lifecycle for tenant isolation.
    """

    @abstractmethod
    def get_schema_name(self, tenant_slug: str) -> str:
        """Return the PostgreSQL schema name for *tenant_slug*."""
        ...

    @abstractmethod
    def create_schema(self, tenant_slug: str) -> bool:
        """Create the tenant schema.  Return ``True`` on success."""
        ...

    @abstractmethod
    def drop_schema(self, tenant_slug: str, cascade: bool = False) -> bool:
        """Drop the tenant schema.  Return ``True`` on success."""
        ...

    @abstractmethod
    def schema_exists(self, schema_name: str) -> bool:
        """Return ``True`` if *schema_name* exists in the database."""
        ...

    @abstractmethod
    def list_schemas(self) -> List[str]:
        """Return a list of all ``tenant_*`` schema names."""
        ...
