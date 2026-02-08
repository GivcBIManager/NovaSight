"""
NovaSight Connector Registry — Re-export Shim
===============================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors.registry`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors.registry' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors.registry' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors.registry import ConnectorRegistry  # noqa: F401, E402

__all__ = ["ConnectorRegistry"]
