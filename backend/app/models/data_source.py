"""
NovaSight Data Source Models
============================

Models for data source schema metadata including tables and columns.

.. deprecated::
    This module is a backward-compatibility shim.
    Use ``app.domains.datasources.domain.value_objects`` instead.
"""

import warnings

warnings.warn(
    "app.models.data_source is deprecated. "
    "Use app.domains.datasources.domain.value_objects instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.domain.value_objects import (  # noqa: F401
    DataSourceColumn,
    DataSourceTable,
    DataSourceSchema,
)


__all__ = [
    "DataSourceColumn",
    "DataSourceTable",
    "DataSourceSchema",
]
