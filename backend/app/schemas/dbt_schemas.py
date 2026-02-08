"""
Pydantic schemas for dbt operations
=====================================

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.transformation.schemas.dbt_schemas` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.schemas.dbt_schemas is deprecated. "
    "Use app.domains.transformation.schemas.dbt_schemas instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.schemas.dbt_schemas import (  # noqa: F401, E402
    Materialization,
    JoinType,
    TestType,
    DbtRunRequest,
    DbtTestRequest,
    DbtBuildRequest,
    DbtCompileRequest,
    DbtSeedRequest,
    DbtSnapshotRequest,
    DbtListRequest,
    DbtResultResponse,
    DbtLineageNode,
    DbtLineageResponse,
    DbtDebugResponse,
    ColumnDefinition,
    JoinDefinition,
    ModelDefinition,
    ModelCreateRequest,
    ModelCreateResponse,
)

__all__ = [
    "Materialization",
    "JoinType",
    "TestType",
    "DbtRunRequest",
    "DbtTestRequest",
    "DbtBuildRequest",
    "DbtCompileRequest",
    "DbtSeedRequest",
    "DbtSnapshotRequest",
    "DbtListRequest",
    "DbtResultResponse",
    "DbtLineageNode",
    "DbtLineageResponse",
    "DbtDebugResponse",
    "ColumnDefinition",
    "JoinDefinition",
    "ModelDefinition",
    "ModelCreateRequest",
    "ModelCreateResponse",
]
