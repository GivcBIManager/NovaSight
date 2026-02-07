"""
NovaSight Infrastructure Config Service  SHIM
================================================

.. deprecated::
    This module re-exports from `app.domains.tenants.infrastructure.config_service`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.services.infrastructure_config_service is deprecated; "
    "use app.domains.tenants.infrastructure.config_service",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.tenants.infrastructure.config_service import (  # noqa: F401
    InfrastructureConfigService,
    InfrastructureConfigError,
    InfrastructureConfigNotFoundError,
    InfrastructureConnectionError,
)
