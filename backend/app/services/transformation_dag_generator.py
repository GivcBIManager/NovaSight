"""
Backward-compatible shim for ``app.services.transformation_dag_generator``.

.. deprecated::
    Import from ``app.domains.orchestration.infrastructure.transformation_dag_generator`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.services.transformation_dag_generator' is deprecated. "
    "Use 'app.domains.orchestration.infrastructure.transformation_dag_generator' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.infrastructure.transformation_dag_generator import (  # noqa: F401
    TransformationDAGGenerator,
    TransformationDAGGeneratorError,
    get_transformation_dag_generator,
)

__all__ = [
    "TransformationDAGGenerator",
    "TransformationDAGGeneratorError",
    "get_transformation_dag_generator",
]
