"""
NovaSight Audit Middleware
==========================

Decorators and middleware for automatic audit logging.
"""

from datetime import datetime
from functools import wraps
from typing import Optional, Callable, Any, Dict
from flask import request, g

from app.services.audit_service import AuditService


def audited(action: str, resource_type: str, resource_id_param: Optional[str] = None):
    """
    Decorator to automatically audit an action.
    
    Logs the action after successful execution, or logs failure if an exception occurs.
    
    Args:
        action: The action identifier (e.g., 'dashboard.created')
        resource_type: The type of resource being acted upon (e.g., 'dashboard')
        resource_id_param: Name of the kwarg containing resource ID (e.g., 'dashboard_id')
    
    Usage:
        @audited('dashboard.created', 'dashboard')
        def create_dashboard(...):
            ...
        
        @audited('dashboard.updated', 'dashboard', resource_id_param='dashboard_id')
        def update_dashboard(dashboard_id: str, ...):
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Execute the actual function
            try:
                result = f(*args, **kwargs)
                
                # Extract resource info from result or kwargs
                resource_id = None
                resource_name = None
                
                # Try to get resource_id from specified param
                if resource_id_param:
                    resource_id = kwargs.get(resource_id_param)
                
                # Try to get from result if not found
                if not resource_id and isinstance(result, dict):
                    resource_id = result.get('id')
                    resource_name = result.get('name')
                elif not resource_id and hasattr(result, 'id'):
                    resource_id = str(result.id)
                    resource_name = getattr(result, 'name', None)
                
                # Log successful action
                AuditService.log(
                    action=action,
                    resource_type=resource_type,
                    resource_id=str(resource_id) if resource_id else None,
                    resource_name=resource_name,
                )
                
                return result
                
            except Exception as e:
                # Log failed action
                resource_id = kwargs.get(resource_id_param) if resource_id_param else None
                
                AuditService.log(
                    action=action,
                    resource_type=resource_type,
                    resource_id=str(resource_id) if resource_id else None,
                    success=False,
                    error_message=str(e),
                )
                raise
        
        return wrapper
    return decorator


def audited_with_changes(
    action: str,
    resource_type: str,
    resource_id_param: str,
    get_old_values: Callable[..., dict],
):
    """
    Decorator for update operations that tracks before/after changes.
    
    Args:
        action: The action identifier (e.g., 'user.updated')
        resource_type: The type of resource being acted upon
        resource_id_param: Name of the kwarg containing resource ID
        get_old_values: Function to retrieve old values before update
    
    Usage:
        def get_user_values(user_id):
            user = User.query.get(user_id)
            return {'email': user.email, 'name': user.name}
        
        @audited_with_changes('user.updated', 'user', 'user_id', get_user_values)
        def update_user(user_id: str, data: dict):
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            resource_id = kwargs.get(resource_id_param)
            
            # Capture old values before update
            old_values = {}
            if resource_id:
                try:
                    old_values = get_old_values(resource_id)
                except Exception:
                    pass  # Don't fail if we can't get old values
            
            # Execute the update
            try:
                result = f(*args, **kwargs)
                
                # Extract new values from result
                new_values = {}
                if isinstance(result, dict):
                    new_values = {k: v for k, v in result.items() 
                                  if k in old_values}
                elif hasattr(result, '__dict__'):
                    new_values = {k: getattr(result, k, None) 
                                  for k in old_values.keys()}
                
                # Log with changes
                AuditService.log_with_changes(
                    action=action,
                    resource_type=resource_type,
                    resource_id=str(resource_id),
                    old_values=old_values,
                    new_values=new_values,
                )
                
                return result
                
            except Exception as e:
                AuditService.log_failure(
                    action=action,
                    resource_type=resource_type,
                    resource_id=str(resource_id) if resource_id else None,
                    error=str(e),
                )
                raise
        
        return wrapper
    return decorator


def audit_data_access(resource_type: str, operation: str = 'read'):
    """
    Decorator to audit data access operations (queries, exports, etc.).
    
    Captures query metadata for compliance and security monitoring.
    
    Args:
        resource_type: Type of data being accessed (e.g., 'query', 'report')
        operation: Type of operation (e.g., 'read', 'export')
    
    Usage:
        @audit_data_access('query', 'execute')
        def execute_query(sql: str, ...):
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            action = f'{resource_type}.{operation}'
            
            try:
                result = f(*args, **kwargs)
                
                # Capture access metadata
                metadata = {
                    'args_count': len(args),
                    'kwargs_keys': list(kwargs.keys()),
                }
                
                # Add result size if applicable
                if isinstance(result, (list, tuple)):
                    metadata['result_count'] = len(result)
                elif isinstance(result, dict) and 'rows' in result:
                    metadata['row_count'] = len(result.get('rows', []))
                
                AuditService.log(
                    action=action,
                    resource_type=resource_type,
                    extra_data=metadata,
                )
                
                return result
                
            except Exception as e:
                AuditService.log_failure(
                    action=action,
                    resource_type=resource_type,
                    error=str(e),
                )
                raise
        
        return wrapper
    return decorator


def audit_security_event(event_type: str):
    """
    Decorator to log security-relevant events.
    
    Always logs with critical or warning severity.
    
    Args:
        event_type: Security event type (e.g., 'unauthorized_access')
    
    Usage:
        @audit_security_event('permission_denied')
        def check_permission(...):
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            action = f'security.{event_type}'
            
            try:
                result = f(*args, **kwargs)
                
                # Log security check
                AuditService.log(
                    action=action,
                    resource_type='security',
                    extra_data={
                        'check_type': event_type,
                        'result': 'passed',
                    },
                )
                
                return result
                
            except Exception as e:
                AuditService.log(
                    action=action,
                    resource_type='security',
                    success=False,
                    error_message=str(e),
                    extra_data={
                        'check_type': event_type,
                        'result': 'failed',
                    },
                )
                raise
        
        return wrapper
    return decorator


class AuditContext:
    """
    Context manager for grouping related audit entries.
    
    Useful for complex operations that involve multiple steps.
    
    Usage:
        with AuditContext('pipeline.deployed', 'pipeline', pipeline_id):
            # Multiple operations...
            # All will be linked via request_id
    """
    
    def __init__(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
    ):
        self.action = action
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.start_time: Optional[datetime] = None
        self.success = True
        self.error_message: Optional[str] = None
        self.extra_data: Dict[str, Any] = {}
    
    def __enter__(self):
        from datetime import datetime
        self.start_time = datetime.utcnow()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        from datetime import datetime
        
        if exc_type is not None:
            self.success = False
            self.error_message = str(exc_val)
        
        # Calculate duration
        if self.start_time is not None:
            duration = (datetime.utcnow() - self.start_time).total_seconds()
            self.extra_data['duration_seconds'] = duration
        
        AuditService.log(
            action=self.action,
            resource_type=self.resource_type,
            resource_id=self.resource_id,
            success=self.success,
            error_message=self.error_message,
            extra_data=self.extra_data,
        )
        
        # Don't suppress exceptions
        return False
    
    def add_extra_data(self, key: str, value: Any):
        """Add extra data to be logged with the audit entry."""
        self.extra_data[key] = value
