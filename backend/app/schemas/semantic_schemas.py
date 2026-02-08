"""
NovaSight Semantic Layer Schemas
=================================

Pydantic schemas for semantic layer API validation.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.transformation.schemas.semantic_schemas` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.schemas.semantic_schemas is deprecated. "
    "Use app.domains.transformation.schemas.semantic_schemas instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.schemas.semantic_schemas import (  # noqa: F401, E402
    DimensionTypeEnum,
    AggregationTypeEnum,
    ModelTypeEnum,
    RelationshipTypeEnum,
    FilterOperatorEnum,
    SortOrderEnum,
    SemanticModelCreateSchema,
    SemanticModelUpdateSchema,
    SemanticModelResponseSchema,
    DimensionCreateSchema,
    DimensionUpdateSchema,
    DimensionResponseSchema,
    MeasureCreateSchema,
    MeasureUpdateSchema,
    MeasureResponseSchema,
    RelationshipCreateSchema,
    RelationshipResponseSchema,
    QueryFilterSchema,
    QueryOrderBySchema,
    SemanticQuerySchema,
    QueryResultSchema,
    AvailableFieldSchema,
    ExploreSchema,
)

__all__ = [
    "DimensionTypeEnum",
    "AggregationTypeEnum",
    "ModelTypeEnum",
    "RelationshipTypeEnum",
    "FilterOperatorEnum",
    "SortOrderEnum",
    "SemanticModelCreateSchema",
    "SemanticModelUpdateSchema",
    "SemanticModelResponseSchema",
    "DimensionCreateSchema",
    "DimensionUpdateSchema",
    "DimensionResponseSchema",
    "MeasureCreateSchema",
    "MeasureUpdateSchema",
    "MeasureResponseSchema",
    "RelationshipCreateSchema",
    "RelationshipResponseSchema",
    "QueryFilterSchema",
    "QueryOrderBySchema",
    "SemanticQuerySchema",
    "QueryResultSchema",
    "AvailableFieldSchema",
    "ExploreSchema",
]
