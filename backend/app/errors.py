"""
NovaSight Error Handlers
========================

Global error handlers and custom exceptions.

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.errors.exceptions`` instead.
"""

# Re-export everything from the canonical location
from app.platform.errors.exceptions import (   # noqa: F401
    NovaSightException,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    TenantNotFoundError,
    ConnectionTestError,
    TemplateRenderError,
    DagsterAPIError,
    register_error_handlers,
)
