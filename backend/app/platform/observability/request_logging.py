"""
NovaSight Platform – Observability: Request Logging
=====================================================

Re-exports the request-logging middleware from its original location.
A full migration into this module is planned for a future phase.
"""

from app.middleware.request_logging import (   # noqa: F401
    RequestLoggingMiddleware,
)
