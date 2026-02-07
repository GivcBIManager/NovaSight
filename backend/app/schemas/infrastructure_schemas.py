"""
NovaSight Infrastructure Schemas  SHIM
=========================================

.. deprecated::
    This module re-exports from `app.domains.tenants.schemas.infrastructure_schemas`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.schemas.infrastructure_schemas is deprecated; "
    "use app.domains.tenants.schemas.infrastructure_schemas",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.tenants.schemas.infrastructure_schemas import (  # noqa: F401
    BaseInfrastructureConfigSchema,
    ClickHouseSettingsSchema,
    ClickHouseConfigCreateSchema,
    SparkSettingsSchema,
    SparkConfigCreateSchema,
    AirflowSettingsSchema,
    AirflowConfigCreateSchema,
    OllamaSettingsSchema,
    OllamaConfigCreateSchema,
    InfrastructureConfigResponseSchema,
    InfrastructureConfigListSchema,
    InfrastructureConfigUpdateSchema,
    InfrastructureConfigTestSchema,
    InfrastructureConfigTestResultSchema,
)
