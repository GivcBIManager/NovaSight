"""
NovaSight Unified Auth Decorators
==================================

Single set of authorization decorators for all endpoints.
Replaces the fragmented decorator systems in:
  - app/decorators.py (require_roles, require_tenant_context)
  - app/middleware/permissions.py (require_permission, require_any_permission)
  - app/middleware/tenant_context.py (require_tenant)

Migration: Old decorators in their original locations now re-export
from this module with deprecation warnings.
"""

import warnings
from functools import wraps
from flask import g, abort
from flask_jwt_extended import verify_jwt_in_request
from typing import List
import logging

from app.platform.auth.constants import (
    ROLE_SUPER_ADMIN,
    normalize_role_name,
    normalize_permission,
)
from app.platform.auth.identity import get_current_identity, Identity

logger = logging.getLogger(__name__)


def authenticated(f):
    """
    Decorator that ensures the request is authenticated via JWT.

    Verifies the JWT token and ensures a valid Identity is available.
    Sets `g.identity` for downstream use.

    Replaces: @jwt_required() + manual get_jwt_identity_dict() calls

    Usage:
        @app.route('/api/v1/protected')
        @authenticated
        def protected_endpoint():
            identity = g.identity
            ...
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        verify_jwt_in_request()
        identity = get_current_identity()
        if identity is None:
            from app.errors import AuthenticationError
            raise AuthenticationError("Authentication required")
        g.identity = identity
        return f(*args, **kwargs)
    return decorated


def require_roles(allowed_roles: List[str]):
    """
    Decorator to require specific roles for endpoint access.

    Uses EXACT match against canonical role names.
    Super admin always bypasses role checks.
    Deprecated role names are automatically normalized.

    Args:
        allowed_roles: List of canonical role names.

    Usage:
        @require_roles(["data_engineer", "tenant_admin"])
        def my_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            identity = get_current_identity()

            if not identity:
                from app.errors import AuthenticationError
                raise AuthenticationError("Authentication required")

            # Super admin bypasses all role checks
            if identity.is_super_admin:
                return f(*args, **kwargs)

            # Normalize allowed roles for comparison
            normalized_allowed = [normalize_role_name(r) for r in allowed_roles]

            # Exact match only — no prefix matching
            if not any(
                normalize_role_name(user_role) in normalized_allowed
                for user_role in identity.roles
            ):
                logger.warning(
                    f"Access denied for user {identity.email}: "
                    f"required roles {normalized_allowed}, has {identity.roles}"
                )
                from app.errors import AuthorizationError
                raise AuthorizationError(
                    f"Access denied. Required roles: {', '.join(normalized_allowed)}"
                )

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_permission(permission: str):
    """
    Decorator to check user has a specific permission.

    Uses the RBAC service for comprehensive permission checking including
    role-based permissions, permission inheritance, and wildcards.

    Permission strings are normalized to dot notation.

    Args:
        permission: Required permission string (e.g., "dashboards.create")

    Usage:
        @require_permission('dashboards.create')
        def create_dashboard():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Normalize permission delimiter
            normalized_perm = normalize_permission(permission)

            # Get current user object for RBAC check
            user = getattr(g, "current_user", None)
            if not user:
                abort(401, description="Authentication required")

            # Use RBAC service for comprehensive check
            from app.services.rbac_service import rbac_service
            if not rbac_service.check_permission(user, normalized_perm):
                logger.warning(
                    f"Permission denied: {normalized_perm} for user {user.id}"
                )
                abort(403, description=f"Permission denied: {normalized_perm}")

            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_any_permission(*permissions: str):
    """
    Decorator to check user has ANY of the specified permissions.

    Args:
        *permissions: Variable permission strings

    Usage:
        @require_any_permission('reports.read', 'reports.admin')
        def get_reports():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                abort(401, description="Authentication required")

            from app.services.rbac_service import rbac_service
            normalized = [normalize_permission(p) for p in permissions]

            if not any(rbac_service.check_permission(user, p) for p in normalized):
                logger.warning(
                    f"Permission denied: need any of {normalized} for user {user.id}"
                )
                abort(403, description=f"Permission denied: requires one of {', '.join(normalized)}")

            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_all_permissions(*permissions: str):
    """
    Decorator to check user has ALL of the specified permissions.

    Args:
        *permissions: Variable permission strings

    Usage:
        @require_all_permissions('admin.access', 'admin.dangerous')
        def dangerous_action():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                abort(401, description="Authentication required")

            from app.services.rbac_service import rbac_service
            normalized = [normalize_permission(p) for p in permissions]
            missing = [p for p in normalized if not rbac_service.check_permission(user, p)]

            if missing:
                logger.warning(
                    f"Permission denied: missing {missing} for user {user.id}"
                )
                abort(403, description=f"Permission denied: missing {', '.join(missing)}")

            return f(*args, **kwargs)
        return wrapper
    return decorator


def tenant_required(f):
    """
    Decorator to require valid tenant context for an endpoint.

    Replaces both `require_tenant_context` (from decorators.py) and
    `require_tenant` (from tenant_context.py).

    Ensures:
    - User is authenticated (has valid JWT identity)
    - Tenant context is available (tenant_id in JWT)
    - g.tenant_id is set

    Usage:
        @app.route('/api/v1/data')
        @jwt_required()
        @tenant_required
        def get_data():
            tenant_id = g.tenant_id
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        identity = get_current_identity()

        if not identity:
            from app.errors import AuthenticationError
            raise AuthenticationError("Authentication required")

        if not identity.tenant_id:
            from app.errors import AuthorizationError
            raise AuthorizationError("Tenant context required")

        # Ensure g.tenant_id is set
        g.tenant_id = identity.tenant_id
        g.user_id = identity.user_id
        g.user_email = identity.email
        g.user_roles = identity.roles

        return f(*args, **kwargs)
    return decorated_function
