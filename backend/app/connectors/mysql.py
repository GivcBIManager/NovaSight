"""
NovaSight MySQL Connector — Re-export Shim
============================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors.mysql`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors.mysql' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors.mysql' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors.mysql import MySQLConnector  # noqa: F401, E402

__all__ = ["MySQLConnector"]
