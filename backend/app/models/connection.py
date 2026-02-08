"""
NovaSight Data Connection Model
===============================

Database connection configuration model.

.. deprecated::
    This module is a backward-compatibility shim.
    Use ``app.domains.datasources.domain.models`` instead.
"""

import warnings

warnings.warn(
    "app.models.connection is deprecated. "
    "Use app.domains.datasources.domain.models instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.domain.models import (  # noqa: F401
    DataConnection,
    DatabaseType,
    ConnectionStatus,
)

__all__ = ["DataConnection", "DatabaseType", "ConnectionStatus"]
