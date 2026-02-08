"""
NovaSight Connection Pool — Re-export Shim
============================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors.utils.connection_pool`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors.utils.connection_pool' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors.utils.connection_pool' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors.utils.connection_pool import (  # noqa: F401, E402
    ConnectionPool,
    PooledConnection,
)

__all__ = ["ConnectionPool", "PooledConnection"]
