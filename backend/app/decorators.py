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



