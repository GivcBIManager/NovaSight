"""
NovaSight Semantic Layer API
==============================

REST API endpoints for the semantic layer.

.. deprecated::
    Routes are now registered by `app.domains.transformation.api.semantic_routes`.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.api.v1.semantic' is deprecated. "
    "Routes now live in 'app.domains.transformation.api.semantic_routes'.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.api import semantic_routes  # noqa: F401, E402
