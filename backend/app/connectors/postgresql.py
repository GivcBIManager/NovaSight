"""
NovaSight PostgreSQL Connector — Re-export Shim
=================================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors.postgresql`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors.postgresql' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors.postgresql' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors.postgresql import PostgreSQLConnector  # noqa: F401, E402

__all__ = ["PostgreSQLConnector"]
