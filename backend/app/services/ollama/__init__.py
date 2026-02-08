"""
NovaSight Ollama Integration
=============================

Local LLM integration for natural language processing.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.ai.infrastructure.ollama` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.ollama is deprecated. "
    "Use app.domains.ai.infrastructure.ollama instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.ai.infrastructure.ollama import (  # noqa: F401, E402
    OllamaClient,
    OllamaError,
    OllamaConnectionError,
    NLToParametersService,
    QueryIntent,
    PromptTemplates,
    QueryClassifier,
    QueryType,
    ClassifiedIntent,
    QueryEntities,
    TimeRange,
)

__all__ = [
    "OllamaClient",
    "OllamaError",
    "OllamaConnectionError",
    "NLToParametersService",
    "QueryIntent",
    "PromptTemplates",
    "QueryClassifier",
    "QueryType",
    "ClassifiedIntent",
    "QueryEntities",
    "TimeRange",
]
