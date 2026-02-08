"""
dbt API endpoints
==================

REST API for dbt operations with multi-tenant support.

.. deprecated::
    Routes are now registered by `app.domains.transformation.api.dbt_routes`.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.api.v1.dbt' is deprecated. "
    "Routes now live in 'app.domains.transformation.api.dbt_routes'.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.api import dbt_routes  # noqa: F401, E402
