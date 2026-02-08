"""
Backward-compatible shim for ``app.services.airflow_client``.

.. deprecated::
    Import from ``app.domains.orchestration.infrastructure.airflow_client`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.services.airflow_client' is deprecated. "
    "Use 'app.domains.orchestration.infrastructure.airflow_client' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.infrastructure.airflow_client import (  # noqa: F401
    AirflowClient,
    DagRun,
    TaskInstance,
)

__all__ = [
    "AirflowClient",
    "DagRun",
    "TaskInstance",
]
