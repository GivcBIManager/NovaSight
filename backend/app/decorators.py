"""
NovaSight Decorators
====================

Custom decorators for authorization and request handling.

DEPRECATION NOTICE: This module re-exports decorators from
app.platform.auth.decorators. Import directly from there for new code.
"""

import asyncio
import warnings
from functools import wraps
from flask import request, g
from flask_jwt_extended import verify_jwt_in_request
from app.middleware.jwt_handlers import get_jwt_identity_dict
from app.errors import AuthorizationError, AuthenticationError
import logging

# Re-export unified decorators from platform
from app.platform.auth.decorators import (  # noqa: F401
    require_roles as _platform_require_roles,
    tenant_required,
    require_permission,
    require_any_permission,
    require_all_permissions,
    authenticated,
)
from app.platform.auth.identity import (  # noqa: F401
    Identity,
    get_current_identity,
    require_identity,
)

logger = logging.getLogger(__name__)


def async_route(f):
    """
    Decorator to enable async/await in Flask routes.
    
    Wraps an async function to run in the event loop.
    
    Usage:
        @app.route('/api/endpoint')
        @async_route
        async def my_endpoint():
            result = await some_async_operation()
            return result
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))
    return wrapper


def require_roles(allowed_roles: list):
    """
    Decorator to require specific roles for endpoint access.

    DEPRECATED: Import from app.platform.auth.decorators instead.

    Args:
        allowed_roles: List of role names that can access the endpoint
    """
    warnings.warn(
        "app.decorators.require_roles is deprecated. "
        "Use app.platform.auth.decorators.require_roles instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    return _platform_require_roles(allowed_roles)


def require_tenant_context(f):
    """
    Decorator to ensure tenant context is available.

    DEPRECATED: Import tenant_required from app.platform.auth.decorators instead.
    """
    warnings.warn(
        "app.decorators.require_tenant_context is deprecated. "
        "Use app.platform.auth.decorators.tenant_required instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    return tenant_required(f)


def audit_action(action: str, resource_type: str = None):
    """
    Decorator to automatically log audit trail for endpoint actions.
    
    Args:
        action: The action being performed (e.g., "create", "update", "delete")
        resource_type: The type of resource being acted upon
    
    Usage:
        @audit_action("create", "dag")
        def create_dag():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from app.services.audit_service import AuditService
            
            identity = get_jwt_identity_dict() or {}
            tenant_id = identity.get("tenant_id")
            user_id = identity.get("user_id")
            
            # Get request context
            ip_address = request.remote_addr
            user_agent = request.user_agent.string if request.user_agent else None
            
            # Execute the actual function
            try:
                result = f(*args, **kwargs)
                
                # Log successful action
                AuditService.log(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=kwargs.get("dag_id") or kwargs.get("connection_id") or kwargs.get("user_id"),
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=True,
                )
                
                return result
                
            except Exception as e:
                # Log failed action
                AuditService.log(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    error_message=str(e),
                )
                raise
        
        return decorated_function
    return decorator
