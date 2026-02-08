"""
NovaSight Data Sources — Connectors Package
=============================================

Pluggable connector architecture for database integrations.

Canonical location: ``app.domains.datasources.infrastructure.connectors``
"""

from app.domains.datasources.infrastructure.connectors.base import (
    BaseConnector,
    ConnectionConfig,
    ConnectorException,
    ConnectionTestException,
)
from app.domains.datasources.domain.value_objects import ColumnInfo, TableInfo
from app.domains.datasources.infrastructure.connectors.registry import ConnectorRegistry
from app.domains.datasources.infrastructure.connectors.postgresql import PostgreSQLConnector
from app.domains.datasources.infrastructure.connectors.mysql import MySQLConnector

__all__ = [
    "BaseConnector",
    "ConnectionConfig",
    "ColumnInfo",
    "TableInfo",
    "ConnectorException",
    "ConnectionTestException",
    "ConnectorRegistry",
    "PostgreSQLConnector",
    "MySQLConnector",
]