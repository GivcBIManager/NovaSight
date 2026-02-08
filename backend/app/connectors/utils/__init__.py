"""
NovaSight Connector Utilities — Re-export Shim
================================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors.utils`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors.utils' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors.utils' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors.utils import (  # noqa: F401, E402
    TypeMapper,
    ConnectionPool,
)

__all__ = ["TypeMapper", "ConnectionPool"]
