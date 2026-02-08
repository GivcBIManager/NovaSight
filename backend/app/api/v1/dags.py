"""
Backward-compatible shim for ``app.api.v1.dags``.

.. deprecated::
    Import from ``app.domains.orchestration.api.dag_routes`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.api.v1.dags' is deprecated. "
    "Use 'app.domains.orchestration.api.dag_routes' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.api.dag_routes import (  # noqa: F401
    list_dags,
    create_dag,
    get_dag,
    update_dag,
    delete_dag,
    validate_dag,
    deploy_dag,
    trigger_dag,
    pause_dag,
    unpause_dag,
    list_dag_runs,
    get_dag_run,
    get_task_logs,
    generate_pyspark_dag,
    generate_pyspark_pipeline_dag,
    list_pyspark_dags,
    get_pyspark_dag,
    delete_pyspark_dag,
    update_pyspark_dag_schedule,
)

__all__ = [
    "list_dags",
    "create_dag",
    "get_dag",
    "update_dag",
    "delete_dag",
    "validate_dag",
    "deploy_dag",
    "trigger_dag",
    "pause_dag",
    "unpause_dag",
    "list_dag_runs",
    "get_dag_run",
    "get_task_logs",
    "generate_pyspark_dag",
    "generate_pyspark_pipeline_dag",
    "list_pyspark_dags",
    "get_pyspark_dag",
    "delete_pyspark_dag",
    "update_pyspark_dag_schedule",
]
