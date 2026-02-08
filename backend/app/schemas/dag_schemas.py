"""
Backward-compatible shim for ``app.schemas.dag_schemas``.

.. deprecated::
    Import from ``app.domains.orchestration.schemas.dag_schemas`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.schemas.dag_schemas' is deprecated. "
    "Use 'app.domains.orchestration.schemas.dag_schemas' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.schemas.dag_schemas import (  # noqa: F401
    TriggerRule,
    TaskType,
    TaskConfigCreate,
    SparkSubmitTaskConfig,
    DbtRunTaskConfig,
    EmailTaskConfig,
    DagConfigCreate,
    DagConfigUpdate,
    DagConfigResponse,
)

__all__ = [
    "TriggerRule",
    "TaskType",
    "TaskConfigCreate",
    "SparkSubmitTaskConfig",
    "DbtRunTaskConfig",
    "EmailTaskConfig",
    "DagConfigCreate",
    "DagConfigUpdate",
    "DagConfigResponse",
]
