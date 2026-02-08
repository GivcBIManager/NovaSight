"""
NovaSight dbt Model Generator Service
=======================================

Automated dbt model generation from data source schemas.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.transformation.infrastructure.dbt_model_generator` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.dbt_model_generator is deprecated. "
    "Use app.domains.transformation.infrastructure.dbt_model_generator instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.infrastructure.dbt_model_generator import (  # noqa: F401, E402
    DbtModelGeneratorError,
    ModelGenerationError,
    TemplateNotFoundError,
    DbtModelGenerator,
    get_dbt_model_generator,
)

__all__ = [
    "DbtModelGeneratorError",
    "ModelGenerationError",
    "TemplateNotFoundError",
    "DbtModelGenerator",
    "get_dbt_model_generator",
]
