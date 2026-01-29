"""
NovaSight Permission Decorators
===============================

RBAC permission decorators for endpoint authorization.
Integrates with RBACService for comprehensive permission checking.
"""

from functools import wraps
from flask import g, abort, request
from typing import List, Union, Optional, Callable
import logging

logger = logging.getLogger(__name__)


def _get_rbac_service():
    """Lazy import to avoid circular dependencies."""
    from app.services.rbac_service import rbac_service
    return rbac_service


def _get_current_user():
    """Get current user from request context."""
    if hasattr(g, 'current_user') and g.current_user:
        return g.current_user
    return None


def require_permission(permission: str, use_rbac_service: bool = True):
    """
    Decorator to check user has a specific permission.
    
    Uses the RBAC service for comprehensive permission checking including:
    - Role-based permissions
    - Permission inheritance
    - Wildcard permissions
    
    Args:
        permission: Required permission string (e.g., "dashboards.create")
        use_rbac_service: If True, use RBACService for checking (default)
    
    Usage:
        @app.route('/api/v1/dashboards', methods=['POST'])
        @jwt_required()
        @require_permission('dashboards.create')
        def create_dashboard():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Check authentication
            user = _get_current_user()
            if not user:
                abort(401, description="Authentication required")
            
            if use_rbac_service:
                # Use RBAC service for comprehensive check
                rbac = _get_rbac_service()
                if not rbac.check_permission(user, permission):
                    logger.warning(
                        f"Permission denied: {permission} for user {user.id}"
                    )
                    abort(403, description=f"Permission denied: {permission}")
            else:
                # Legacy: use permissions from g context
                user_permissions = getattr(g, 'user_permissions', [])
                
                # Check for wildcard admin permission
                if '*' in user_permissions or 'admin:*' in user_permissions:
                    return f(*args, **kwargs)
                
                # Check for specific permission
                if permission not in user_permissions:
                    logger.warning(
                        f"Permission denied: {permission} for user {g.get('current_user_id')}"
                    )
                    abort(403, description=f"Permission denied: {permission}")
            
            return f(*args, **kwargs)
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_any_permission(*permissions: str):
    """
    Decorator to check user has any of the specified permissions.
    
    Args:
        *permissions: Variable permission strings
    
    Usage:
        @app.route('/api/v1/reports')
        @jwt_required()
        @require_any_permission('reports:read', 'reports:admin')
        def get_reports():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_permissions = getattr(g, 'user_permissions', [])
            
            # Check for wildcard admin permission
            if '*' in user_permissions or 'admin:*' in user_permissions:
                return f(*args, **kwargs)
            
            # Check for any matching permission
            if not any(p in user_permissions for p in permissions):
                logger.warning(
                    f"Permission denied: none of {permissions} for user {g.get('current_user_id')}"
                )
                abort(403, description="Permission denied")
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_all_permissions(*permissions: str):
    """
    Decorator to check user has all of the specified permissions.
    
    Args:
        *permissions: Variable permission strings (all required)
    
    Usage:
        @app.route('/api/v1/admin/dangerous')
        @jwt_required()
        @require_all_permissions('admin:access', 'admin:dangerous')
        def dangerous_action():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_permissions = getattr(g, 'user_permissions', [])
            
            # Check for wildcard admin permission
            if '*' in user_permissions or 'admin:*' in user_permissions:
                return f(*args, **kwargs)
            
            # Check all permissions are present
            missing = [p for p in permissions if p not in user_permissions]
            if missing:
                logger.warning(
                    f"Permission denied: missing {missing} for user {g.get('current_user_id')}"
                )
                abort(403, description=f"Missing permissions: {', '.join(missing)}")
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_role(role: str):
    """
    Decorator to check user has a specific role.
    
    Args:
        role: Required role name (e.g., "tenant_admin")
    
    Usage:
        @app.route('/api/v1/admin/users')
        @jwt_required()
        @require_role('tenant_admin')
        def manage_users():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_roles = getattr(g, 'user_roles', [])
            
            if role not in user_roles:
                logger.warning(
                    f"Role denied: {role} for user {g.get('current_user_id')}"
                )
                abort(403, description=f"Role required: {role}")
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_any_role(*roles: str):
    """
    Decorator to check user has any of the specified roles.
    
    Args:
        *roles: Variable role names
    
    Usage:
        @app.route('/api/v1/settings')
        @jwt_required()
        @require_any_role('tenant_admin', 'super_admin')
        def manage_settings():
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_roles = getattr(g, 'user_roles', [])
            
            if not any(r in user_roles for r in roles):
                logger.warning(
                    f"Role denied: none of {roles} for user {g.get('current_user_id')}"
                )
                abort(403, description=f"One of these roles required: {', '.join(roles)}")
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def check_permission(permission: str) -> bool:
    """
    Check if current user has a permission (non-decorator version).
    
    Args:
        permission: Permission to check
    
    Returns:
        True if user has permission
    """
    user_permissions = getattr(g, 'user_permissions', [])
    return (
        '*' in user_permissions or
        'admin:*' in user_permissions or
        permission in user_permissions
    )


def check_role(role: str) -> bool:
    """
    Check if current user has a role (non-decorator version).
    
    Args:
        role: Role to check
    
    Returns:
        True if user has role
    """
    user_roles = getattr(g, 'user_roles', [])
    return role in user_roles


def require_resource_permission(resource_type: str, id_param: str = 'id'):
    """
    Decorator factory to require resource-level permission.
    
    Checks both role-based and resource-specific permissions.
    
    Args:
        resource_type: Type of resource (dashboard, datasource, etc.)
        id_param: Name of the URL parameter containing the resource ID
    
    Usage:
        @app.route('/api/v1/dashboards/<dashboard_id>', methods=['PUT'])
        @jwt_required()
        @require_resource_permission('dashboard', 'dashboard_id')('dashboards.edit')
        def update_dashboard(dashboard_id):
            ...
    """
    def permission_decorator(permission: str):
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                # Get current user
                user = _get_current_user()
                if not user:
                    abort(401, description="Authentication required")
                
                # Get resource ID from kwargs
                resource_id = kwargs.get(id_param)
                if not resource_id:
                    # Try to get from view args
                    resource_id = request.view_args.get(id_param) if request else None
                
                if not resource_id:
                    logger.warning(f"Resource ID not found in parameter: {id_param}")
                    abort(400, description=f"Resource ID required: {id_param}")
                
                # Use RBAC service to check permission
                rbac = _get_rbac_service()
                
                # First check role-based permission
                if rbac.check_permission(user, permission):
                    return f(*args, **kwargs)
                
                # Then check resource-specific permission
                if rbac.check_resource_permission(
                    str(user.id),
                    resource_type,
                    str(resource_id),
                    permission
                ):
                    return f(*args, **kwargs)
                
                logger.warning(
                    f"Resource permission denied: {permission} on "
                    f"{resource_type}:{resource_id} for user {user.id}"
                )
                abort(403, description=f"Permission denied for {resource_type}")
            
            return wrapper
        return decorator
    return permission_decorator


def require_owner(resource_type: str, id_param: str = 'id'):
    """
    Decorator to require owner permission on a resource.
    
    Only the owner (or admin) can perform this action.
    
    Args:
        resource_type: Type of resource
        id_param: Name of the URL parameter containing the resource ID
    
    Usage:
        @app.route('/api/v1/dashboards/<dashboard_id>', methods=['DELETE'])
        @jwt_required()
        @require_owner('dashboard', 'dashboard_id')
        def delete_dashboard(dashboard_id):
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = _get_current_user()
            if not user:
                abort(401, description="Authentication required")
            
            resource_id = kwargs.get(id_param)
            if not resource_id:
                resource_id = request.view_args.get(id_param) if request else None
            
            if not resource_id:
                abort(400, description=f"Resource ID required: {id_param}")
            
            rbac = _get_rbac_service()
            
            # Check for admin permission first (admins can do anything)
            if rbac.check_permission(user, "*") or rbac.check_permission(user, "admin:*"):
                return f(*args, **kwargs)
            
            # Check resource ownership
            if rbac.check_resource_permission(
                str(user.id),
                resource_type,
                str(resource_id),
                "owner"
            ):
                return f(*args, **kwargs)
            
            logger.warning(
                f"Owner permission denied: {resource_type}:{resource_id} for user {user.id}"
            )
            abort(403, description=f"Owner permission required for {resource_type}")
        
        return wrapper
    return decorator


def check_resource_permission(
    resource_type: str,
    resource_id: str,
    permission: str
) -> bool:
    """
    Check if current user has resource permission (non-decorator version).
    
    Args:
        resource_type: Type of resource
        resource_id: Resource UUID string
        permission: Required permission
    
    Returns:
        True if user has permission
    """
    user = _get_current_user()
    if not user:
        return False
    
    rbac = _get_rbac_service()
    
    # Check role-based permission first
    if rbac.check_permission(user, permission):
        return True
    
    # Check resource-specific permission
    return rbac.check_resource_permission(
        str(user.id),
        resource_type,
        str(resource_id),
        permission
    )
