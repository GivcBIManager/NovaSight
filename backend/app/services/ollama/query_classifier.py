"""
NovaSight Query Classifier
===========================

Classifies natural language queries into query types and extracts entities.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.ai.infrastructure.ollama.query_classifier` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.ollama.query_classifier is deprecated. "
    "Use app.domains.ai.infrastructure.ollama.query_classifier instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.ai.infrastructure.ollama.query_classifier import (  # noqa: F401, E402
    QueryType,
    TimeRange,
    QueryEntities,
    ClassifiedIntent,
    QueryClassifier,
)

__all__ = [
    "QueryType",
    "TimeRange",
    "QueryEntities",
    "ClassifiedIntent",
    "QueryClassifier",
]
