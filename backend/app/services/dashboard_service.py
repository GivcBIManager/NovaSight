"""
NovaSight Dashboard Service
============================

Business logic for dashboard and widget operations.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.analytics.application.dashboard_service` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.dashboard_service is deprecated. "
    "Use app.domains.analytics.application.dashboard_service instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.analytics.application.dashboard_service import (  # noqa: F401, E402
    DashboardServiceError,
    DashboardNotFoundError,
    WidgetNotFoundError,
    DashboardAccessDeniedError,
    DashboardValidationError,
    DashboardService,
)

__all__ = [
    "DashboardServiceError",
    "DashboardNotFoundError",
    "WidgetNotFoundError",
    "DashboardAccessDeniedError",
    "DashboardValidationError",
    "DashboardService",
]
