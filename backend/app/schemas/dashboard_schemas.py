"""
NovaSight Dashboard Schemas
============================

Pydantic schemas for dashboard API request/response validation.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.analytics.schemas.dashboard_schemas` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.schemas.dashboard_schemas is deprecated. "
    "Use app.domains.analytics.schemas.dashboard_schemas instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.analytics.schemas.dashboard_schemas import (  # noqa: F401, E402
    WidgetTypeEnum,
    FilterOperatorEnum,
    SortOrderEnum,
    QueryFilterSchema,
    QueryOrderBySchema,
    WidgetQueryConfigSchema,
    WidgetVizConfigSchema,
    GridPositionSchema,
    DrilldownConfigSchema,
    WidgetCreateSchema,
    WidgetUpdateSchema,
    WidgetResponseSchema,
    DashboardThemeSchema,
    DashboardCreateSchema,
    DashboardUpdateSchema,
    DashboardLayoutUpdateSchema,
    DashboardShareSchema,
    DashboardResponseSchema,
    DashboardListResponseSchema,
    WidgetDataRequestSchema,
    WidgetDataResponseSchema,
    DashboardCloneSchema,
)

__all__ = [
    "WidgetTypeEnum",
    "FilterOperatorEnum",
    "SortOrderEnum",
    "QueryFilterSchema",
    "QueryOrderBySchema",
    "WidgetQueryConfigSchema",
    "WidgetVizConfigSchema",
    "GridPositionSchema",
    "DrilldownConfigSchema",
    "WidgetCreateSchema",
    "WidgetUpdateSchema",
    "WidgetResponseSchema",
    "DashboardThemeSchema",
    "DashboardCreateSchema",
    "DashboardUpdateSchema",
    "DashboardLayoutUpdateSchema",
    "DashboardShareSchema",
    "DashboardResponseSchema",
    "DashboardListResponseSchema",
    "WidgetDataRequestSchema",
    "WidgetDataResponseSchema",
    "DashboardCloneSchema",
]
