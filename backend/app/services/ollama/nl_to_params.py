"""
NovaSight NL-to-Parameters Service
===================================

Converts natural language queries to validated template parameters.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.ai.infrastructure.ollama.nl_to_params` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.ollama.nl_to_params is deprecated. "
    "Use app.domains.ai.infrastructure.ollama.nl_to_params instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.ai.infrastructure.ollama.nl_to_params import (  # noqa: F401, E402
    FilterCondition,
    OrderBySpec,
    QueryIntent,
    DataExplorationSuggestion,
    QueryExplanation,
    NLToParametersService,
)

__all__ = [
    "FilterCondition",
    "OrderBySpec",
    "QueryIntent",
    "DataExplorationSuggestion",
    "QueryExplanation",
    "NLToParametersService",
]
