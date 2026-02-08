"""
NovaSight NL-to-SQL Service
============================

Converts natural language to SQL via the semantic layer.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.ai.application.nl_to_sql` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.nl_to_sql is deprecated. "
    "Use app.domains.ai.application.nl_to_sql instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.ai.application.nl_to_sql import (  # noqa: F401, E402
    NLToSQLError,
    QueryParsingError,
    SemanticResolutionError,
    SQLGenerationError,
    NLToSQLResult,
    NLToSQLService,
)

__all__ = [
    "NLToSQLError",
    "QueryParsingError",
    "SemanticResolutionError",
    "SQLGenerationError",
    "NLToSQLResult",
    "NLToSQLService",
]
