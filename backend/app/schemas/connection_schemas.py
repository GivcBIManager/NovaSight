"""
NovaSight Connection Schemas — Re-export Shim
===============================================

.. deprecated::
    Import from ``app.domains.datasources.schemas.connection_schemas`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.schemas.connection_schemas' is deprecated. "
    "Use 'app.domains.datasources.schemas.connection_schemas' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.schemas.connection_schemas import (  # noqa: F401, E402
    DatabaseTypeEnum,
    ConnectionStatusEnum,
    ConnectionConfigSchema,
    ConnectionCreateSchema,
    ConnectionUpdateSchema,
    ConnectionTestSchema,
    ConnectionResponseSchema,
    ColumnSchema,
    TableSchema,
    SchemaResponseSchema,
    ConnectionTestResultSchema,
    ConnectionListQuerySchema,
    PaginationSchema,
    ConnectionListResponseSchema,
)

__all__ = [
    "DatabaseTypeEnum",
    "ConnectionStatusEnum",
    "ConnectionConfigSchema",
    "ConnectionCreateSchema",
    "ConnectionUpdateSchema",
    "ConnectionTestSchema",
    "ConnectionResponseSchema",
    "ColumnSchema",
    "TableSchema",
    "SchemaResponseSchema",
    "ConnectionTestResultSchema",
    "ConnectionListQuerySchema",
    "PaginationSchema",
    "ConnectionListResponseSchema",
]
