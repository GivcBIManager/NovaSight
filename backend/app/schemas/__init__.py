"""
NovaSight Pydantic Schemas
==========================

Request/Response validation schemas.
"""

from app.schemas.auth_schemas import LoginRequest, TokenResponse
from app.schemas.dag_schemas import (
    DagConfigCreate,
    DagConfigUpdate,
    TaskConfigCreate,
    DagConfigResponse,
)
from app.schemas.connection_schemas import (
    ConnectionCreateSchema,
    ConnectionUpdateSchema,
    ConnectionTestSchema,
    ConnectionResponseSchema,
    ConnectionTestResultSchema,
    ConnectionListQuerySchema,
    ConnectionListResponseSchema,
    SchemaResponseSchema,
    TableSchema,
    ColumnSchema,
)

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "DagConfigCreate",
    "DagConfigUpdate",
    "TaskConfigCreate",
    "DagConfigResponse",
    "ConnectionCreateSchema",
    "ConnectionUpdateSchema",
    "ConnectionTestSchema",
    "ConnectionResponseSchema",
    "ConnectionTestResultSchema",
    "ConnectionListQuerySchema",
    "ConnectionListResponseSchema",
    "SchemaResponseSchema",
    "TableSchema",
    "ColumnSchema",
]
