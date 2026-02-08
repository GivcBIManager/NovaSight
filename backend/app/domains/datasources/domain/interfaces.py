"""
NovaSight Data Sources Domain — Interfaces
============================================

Abstract contracts for data-source capabilities consumed by
other domains (transformation, compute, orchestration, etc.).

These interfaces live in the **domain layer** so that external
domains can depend on them without reaching into the datasources
application or infrastructure layers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from app.domains.datasources.domain.value_objects import (
    DataSourceColumn,
    DataSourceSchema,
    DataSourceTable,
)


# ── Connection provider ──────────────────────────────────────────


class IConnectionProvider(ABC):
    """
    Provides access to data-source connections for a given tenant.

    External domains should depend on this interface when they need
    to retrieve connection metadata or credentials.
    """

    @abstractmethod
    def get_connection(self, connection_id: str) -> Optional[Any]:
        """
        Return the ``DataConnection`` record for *connection_id*
        within the current tenant, or ``None``.
        """
        ...

    @abstractmethod
    def list_connections(
        self,
        page: int = 1,
        per_page: int = 20,
        db_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Return a paginated dict of connections for the current tenant.
        """
        ...

    @abstractmethod
    def test_connection(self, connection_id: str) -> Dict[str, Any]:
        """
        Test connectivity for *connection_id*.

        Returns a dict with at least ``{"success": bool, "message": str}``.
        """
        ...


# ── Schema introspection provider ────────────────────────────────


class ISchemaProvider(ABC):
    """
    Provides schema introspection (tables, columns) for a connection.

    The transformation domain (dbt model generator) and other
    consumers depend on this to discover source table structure.
    """

    @abstractmethod
    def get_schema(
        self,
        connection_id: str,
        schema_name: Optional[str] = None,
    ) -> DataSourceSchema:
        """
        Introspect and return the schema metadata for *connection_id*.

        Args:
            connection_id: UUID of the data connection.
            schema_name: Optional database schema to inspect.

        Returns:
            A ``DataSourceSchema`` value object containing tables and columns.
        """
        ...

    @abstractmethod
    def get_tables(
        self,
        connection_id: str,
        schema_name: Optional[str] = None,
    ) -> List[DataSourceTable]:
        """
        Return the list of tables for *connection_id*.
        """
        ...

    @abstractmethod
    def get_columns(
        self,
        connection_id: str,
        table_name: str,
        schema_name: Optional[str] = None,
    ) -> List[DataSourceColumn]:
        """
        Return the list of columns for a specific table.
        """
        ...
