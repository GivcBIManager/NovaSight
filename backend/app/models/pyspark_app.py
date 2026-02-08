"""
NovaSight PySpark App Model
===========================

PySpark application configuration model for data extraction and transformation.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.compute.domain.models` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.models.pyspark_app is deprecated. "
    "Use app.domains.compute.domain.models instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.compute.domain.models import (  # noqa: F401, E402
    PySparkAppStatus,
    SourceType,
    WriteMode,
    SCDType,
    CDCType,
    PySparkApp,
)

__all__ = [
    "PySparkAppStatus",
    "SourceType",
    "WriteMode",
    "SCDType",
    "CDCType",
    "PySparkApp",
]
