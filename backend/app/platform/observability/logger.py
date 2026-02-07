"""
NovaSight Platform – Observability: Logger
===========================================

Re-exports the structured logger from its original location.
A full migration into this module is planned for a future phase.
"""

from app.utils.logger import (   # noqa: F401
    JSONFormatter,
    ContextLogger,
    setup_logging,
)
