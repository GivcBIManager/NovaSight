"""
Backward-compatible shim for ``app.services.pipeline_generator``.

.. deprecated::
    Import from ``app.domains.orchestration.application.pipeline_service`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.services.pipeline_generator' is deprecated. "
    "Use 'app.domains.orchestration.application.pipeline_service' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.application.pipeline_service import (  # noqa: F401
    PipelineGenerator,
    FullPipelineBuilder,
    PipelineGeneratorError,
    PipelineValidationError,
    get_pipeline_generator,
)

__all__ = [
    "PipelineGenerator",
    "FullPipelineBuilder",
    "PipelineGeneratorError",
    "PipelineValidationError",
    "get_pipeline_generator",
]
