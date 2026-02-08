"""
NovaSight Semantic Layer Service
=================================

Business logic for semantic layer operations.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.transformation.application.semantic_service` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.semantic_service is deprecated. "
    "Use app.domains.transformation.application.semantic_service instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.application.semantic_service import (  # noqa: F401, E402
    SemanticServiceError,
    ModelNotFoundError,
    DimensionNotFoundError,
    MeasureNotFoundError,
    QueryBuildError,
    SemanticService,
)

__all__ = [
    "SemanticServiceError",
    "ModelNotFoundError",
    "DimensionNotFoundError",
    "MeasureNotFoundError",
    "QueryBuildError",
    "SemanticService",
]
