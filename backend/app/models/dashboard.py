"""
NovaSight Dashboard Models
==========================

Models for dashboard management including dashboards and widgets.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.analytics.domain.models` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.models.dashboard is deprecated. "
    "Use app.domains.analytics.domain.models instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.analytics.domain.models import (  # noqa: F401, E402
    WidgetType,
    Dashboard,
    Widget,
)

__all__ = [
    "WidgetType",
    "Dashboard",
    "Widget",
]
