"""
NovaSight Platform – Observability: Metrics
============================================

Re-exports the Prometheus metrics middleware from its original location.
A full migration into this module is planned for a future phase.
"""

from app.middleware.metrics import (   # noqa: F401
    MetricsMiddleware,
    setup_metrics,
)
