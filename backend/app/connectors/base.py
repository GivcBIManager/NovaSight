"""
NovaSight Base Connector — Re-export Shim
===========================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors.base`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors.base' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors.base' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors.base import (  # noqa: F401, E402
    BaseConnector,
    ConnectionConfig,
    ConnectorException,
    ConnectionTestException,
)
from app.domains.datasources.domain.value_objects import (  # noqa: F401, E402
    ColumnInfo,
    TableInfo,
)

__all__ = [
    "BaseConnector",
    "ConnectionConfig",
    "ColumnInfo",
    "TableInfo",
    "ConnectorException",
    "ConnectionTestException",
]
