"""
Backward-compatible shim for ``app.models.dag``.

.. deprecated::
    Import from ``app.domains.orchestration.domain.models`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.models.dag' is deprecated. "
    "Use 'app.domains.orchestration.domain.models' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.domain.models import (  # noqa: F401
    DagConfig,
    DagVersion,
    TaskConfig,
    DagStatus,
    ScheduleType,
    TriggerRule,
    TaskType,
)

__all__ = [
    "DagConfig",
    "DagVersion",
    "TaskConfig",
    "DagStatus",
    "ScheduleType",
    "TriggerRule",
    "TaskType",
]
