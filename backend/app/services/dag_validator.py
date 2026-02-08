"""
Backward-compatible shim for ``app.services.dag_validator``.

.. deprecated::
    Import from ``app.domains.orchestration.domain.validators`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.services.dag_validator' is deprecated. "
    "Use 'app.domains.orchestration.domain.validators' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.domain.validators import (  # noqa: F401
    DagValidator,
)

__all__ = [
    "DagValidator",
]
