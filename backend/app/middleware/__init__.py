"""
NovaSight Middleware Package
============================

Request/response middleware and error handlers.
"""

from app.platform.errors.exceptions import register_error_handlers
from app.platform.tenant.context import (
    TenantContextMiddleware,
    require_tenant,
    get_current_tenant,
    get_current_tenant_id,
    get_current_user_id,
    get_user_roles,
    get_user_permissions,
)
from app.platform.auth.jwt_handler import register_jwt_handlers
from app.platform.auth.decorators import (
    require_permission,
    require_any_permission,
    require_all_permissions,
)
from app.middleware.audit import (
    audited,
    audited_with_changes,
    audit_data_access,
    audit_security_event,
    AuditContext,
)
from app.middleware.metrics import (
    MetricsMiddleware,
    setup_metrics,
    track_query_execution,
    track_template_generation,
    track_pipeline_execution,
    update_tenant_metrics,
    update_quota_usage,
    timed_operation,
    collect_tenant_metrics,
    collect_db_pool_metrics,
)
from app.middleware.request_logging import (
    RequestLoggingMiddleware,
    setup_request_logging,
    log_slow_request,
)

__all__ = [
    # Error handlers
    "register_error_handlers",
    # Tenant context
    "TenantContextMiddleware",
    "require_tenant",
    "get_current_tenant",
    "get_current_tenant_id",
    "get_current_user_id",
    "get_user_roles",
    "get_user_permissions",
    # JWT handlers
    "register_jwt_handlers",
    # Permission decorators
    "require_permission",
    "require_any_permission",
    "require_all_permissions",
    # Audit decorators
    "audited",
    "audited_with_changes",
    "audit_data_access",
    "audit_security_event",
    "AuditContext",
    # Metrics
    "MetricsMiddleware",
    "setup_metrics",
    "track_query_execution",
    "track_template_generation",
    "track_pipeline_execution",
    "update_tenant_metrics",
    "update_quota_usage",
    "timed_operation",
    "collect_tenant_metrics",
    "collect_db_pool_metrics",
    # Request logging
    "RequestLoggingMiddleware",
    "setup_request_logging",
    "log_slow_request",
]
