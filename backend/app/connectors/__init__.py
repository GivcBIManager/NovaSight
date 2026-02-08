"""
NovaSight Data Source Connectors — Re-export Shim
===================================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors import (  # noqa: F401, E402
    BaseConnector,
    ConnectionConfig,
    ColumnInfo,
    TableInfo,
    ConnectorException,
    ConnectionTestException,
    ConnectorRegistry,
    PostgreSQLConnector,
    MySQLConnector,
)

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
