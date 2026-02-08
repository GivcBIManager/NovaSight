"""
NovaSight Type Mapping — Re-export Shim
=========================================

.. deprecated::
    Import from ``app.domains.datasources.infrastructure.connectors.utils.type_mapping`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.connectors.utils.type_mapping' is deprecated. "
    "Use 'app.domains.datasources.infrastructure.connectors.utils.type_mapping' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.infrastructure.connectors.utils.type_mapping import TypeMapper  # noqa: F401, E402

__all__ = ["TypeMapper"]
