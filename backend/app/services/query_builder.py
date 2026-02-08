"""
NovaSight Query Builder
========================

Builds SQL queries from validated parameters using templates.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.analytics.infrastructure.query_builder` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.query_builder is deprecated. "
    "Use app.domains.analytics.infrastructure.query_builder instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.analytics.infrastructure.query_builder import (  # noqa: F401, E402
    QueryBuilderError,
    InvalidInputError,
    TemplateRenderError,
    QueryBuilder,
)

__all__ = [
    "QueryBuilderError",
    "InvalidInputError",
    "TemplateRenderError",
    "QueryBuilder",
]
