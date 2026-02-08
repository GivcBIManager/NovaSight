"""
NovaSight Semantic Layer Models
================================

Database models for the semantic layer.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.transformation.domain.models` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.models.semantic is deprecated. "
    "Use app.domains.transformation.domain.models instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.domain.models import (  # noqa: F401, E402
    DimensionType,
    AggregationType,
    ModelType,
    RelationshipType,
    JoinType,
    SemanticModel,
    Dimension,
    Measure,
    Relationship,
)

__all__ = [
    "DimensionType",
    "AggregationType",
    "ModelType",
    "RelationshipType",
    "JoinType",
    "SemanticModel",
    "Dimension",
    "Measure",
    "Relationship",
]
