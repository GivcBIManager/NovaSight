"""
NovaSight PySpark App Service
=============================

Business logic for PySpark application configuration and code generation.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.compute.application.pyspark_app_service` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.pyspark_app_service is deprecated. "
    "Use app.domains.compute.application.pyspark_app_service instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.compute.application.pyspark_app_service import (  # noqa: F401, E402
    PySparkAppService,
)

__all__ = [
    "PySparkAppService",
]
