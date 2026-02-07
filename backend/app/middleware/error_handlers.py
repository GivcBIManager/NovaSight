"""
NovaSight Error Handlers
========================

Global error handlers for consistent JSON error responses.

.. deprecated::
    This module is a backward-compatibility shim.
    Import ``register_error_handlers`` from
    ``app.platform.errors.exceptions`` instead.
"""

from app.platform.errors.exceptions import register_error_handlers   # noqa: F401

