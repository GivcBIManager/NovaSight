"""
NovaSight Utilities Package
===========================

Common utility functions and helpers.
"""

from app.utils.pagination import paginate, PaginationParams
from app.utils.validators import validate_slug, validate_email
from app.platform.tenant.schema import (
    get_tenant_schema_name,
    create_tenant_schema,
    drop_tenant_schema,
    schema_exists,
    list_tenant_schemas,
    set_search_path,
    reset_search_path,
    execute_in_tenant_context,
    get_current_tenant_schema,
    validate_tenant_access,
    TenantSchemaContext,
)
from app.utils.logger import (
    get_logger,
    setup_logging,
    ContextLogger,
    JSONFormatter,
    BoundLogger,
    api_logger,
    db_logger,
    auth_logger,
    query_logger,
    template_logger,
    pipeline_logger,
    datasource_logger,
)

__all__ = [
    # Pagination
    "paginate",
    "PaginationParams",
    # Validators
    "validate_slug",
    "validate_email",
    # Tenant utilities
    "get_tenant_schema_name",
    "create_tenant_schema",
    "drop_tenant_schema",
    "schema_exists",
    "list_tenant_schemas",
    "set_search_path",
    "reset_search_path",
    "execute_in_tenant_context",
    "get_current_tenant_schema",
    "validate_tenant_access",
    "TenantSchemaContext",
    # Logging
    "get_logger",
    "setup_logging",
    "ContextLogger",
    "JSONFormatter",
    "BoundLogger",
    "api_logger",
    "db_logger",
    "auth_logger",
    "query_logger",
    "template_logger",
    "pipeline_logger",
    "datasource_logger",
]
