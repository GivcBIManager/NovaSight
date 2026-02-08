"""
NovaSight PySpark App Schemas
=============================

Pydantic validation schemas for PySpark app CRUD operations.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.compute.schemas.pyspark_schemas` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.schemas.pyspark_schemas is deprecated. "
    "Use app.domains.compute.schemas.pyspark_schemas instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.compute.schemas.pyspark_schemas import (  # noqa: F401, E402
    SourceTypeEnum,
    WriteModeEnum,
    SCDTypeEnum,
    CDCTypeEnum,
    PySparkAppStatusEnum,
    ColumnConfigSchema,
    PySparkAppCreateSchema,
    PySparkAppUpdateSchema,
    PySparkAppResponseSchema,
    PySparkAppWithCodeSchema,
    PySparkAppListQuerySchema,
    PySparkAppListResponseSchema,
    PySparkCodePreviewSchema,
    PySparkCodeResponseSchema,
    QueryValidationRequestSchema,
    QueryValidationResponseSchema,
)

__all__ = [
    "SourceTypeEnum",
    "WriteModeEnum",
    "SCDTypeEnum",
    "CDCTypeEnum",
    "PySparkAppStatusEnum",
    "ColumnConfigSchema",
    "PySparkAppCreateSchema",
    "PySparkAppUpdateSchema",
    "PySparkAppResponseSchema",
    "PySparkAppWithCodeSchema",
    "PySparkAppListQuerySchema",
    "PySparkAppListResponseSchema",
    "PySparkCodePreviewSchema",
    "PySparkCodeResponseSchema",
    "QueryValidationRequestSchema",
    "QueryValidationResponseSchema",
]
