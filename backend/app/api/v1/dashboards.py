"""
Dashboard routes — Re-export Shim
===================================

.. deprecated::
    Routes are now registered by `app.domains.analytics.api.dashboard_routes`.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.api.v1.dashboards' is deprecated. "
    "Routes now live in 'app.domains.analytics.api.dashboard_routes'.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.analytics.api import dashboard_routes  # noqa: F401, E402
