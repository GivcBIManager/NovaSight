"""
NovaSight PySpark Apps API Endpoints
====================================

REST API for PySpark application configuration and code generation.

.. deprecated::
    Routes are now registered by `app.domains.compute.api.pyspark_routes`.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.api.v1.pyspark_apps' is deprecated. "
    "Routes now live in 'app.domains.compute.api.pyspark_routes'.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.compute.api import pyspark_routes  # noqa: F401, E402
