"""
NovaSight AI Assistant API
===========================

Endpoints for natural language query processing and AI-assisted analytics.

.. deprecated::
    Routes are now registered by `app.domains.ai.api.assistant_routes`.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.api.v1.assistant' is deprecated. "
    "Routes now live in 'app.domains.ai.api.assistant_routes'.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.ai.api import assistant_routes  # noqa: F401, E402
