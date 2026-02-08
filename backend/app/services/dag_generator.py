"""
Backward-compatible shim for ``app.services.dag_generator``.

.. deprecated::
    Import from ``app.domains.orchestration.infrastructure.dag_generator`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.services.dag_generator' is deprecated. "
    "Use 'app.domains.orchestration.infrastructure.dag_generator' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.infrastructure.dag_generator import (  # noqa: F401
    DagGenerator,
    PySparkDAGGenerator,
)

__all__ = [
    "DagGenerator",
    "PySparkDAGGenerator",
]

