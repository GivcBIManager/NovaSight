"""
NovaSight ClickHouse Client
============================

Client for executing queries against ClickHouse data warehouse.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.analytics.infrastructure.clickhouse_client` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.clickhouse_client is deprecated. "
    "Use app.domains.analytics.infrastructure.clickhouse_client instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.analytics.infrastructure.clickhouse_client import (  # noqa: F401, E402
    QueryResult,
    ClickHouseError,
    ClickHouseConnectionError,
    ClickHouseQueryError,
    ClickHouseClient,
    MockClickHouseClient,
    get_clickhouse_client,
)

__all__ = [
    "QueryResult",
    "ClickHouseError",
    "ClickHouseConnectionError",
    "ClickHouseQueryError",
    "ClickHouseClient",
    "MockClickHouseClient",
    "get_clickhouse_client",
]
