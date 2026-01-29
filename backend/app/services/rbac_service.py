"""
NovaSight RBAC Service
======================

Service for Role-Based Access Control with permission inheritance,
resource-level permissions, and permission caching.
"""

import uuid
from datetime import datetime
from typing import List, Set, Optional, Dict, Any
from functools import lru_cache
from flask import g, has_request_context
from sqlalchemy import and_

from app.extensions import db
from app.models.user import User, Role
from app.models.rbac import (
    Permission,
    ResourcePermission,
    RoleHierarchy,
    role_permissions,
    get_all_permissions,
)

import logging

logger = logging.getLogger(__name__)


class RBACService:
    """
    Service for role-based access control.
    
    Provides:
    - Permission checking (role-based and resource-based)
    - Permission inheritance through role hierarchy
    - Resource-level permission management
    - Default role/permission initialization for tenants
    - Permission caching for performance
    """
    
    # Default permissions by category
    DEFAULT_PERMISSIONS = {
        "datasources": [
            "datasources.view",
            "datasources.create",
            "datasources.edit",
            "datasources.delete",
            "datasources.sync",
            "datasources.test",
        ],
        "semantic": [
            "semantic.view",
            "semantic.create",
            "semantic.edit",
            "semantic.delete",
            "semantic.deploy",
        ],
        "analytics": [
            "analytics.query",
            "analytics.export",
            "analytics.schedule",
        ],
        "dashboards": [
            "dashboards.view",
            "dashboards.create",
            "dashboards.edit",
            "dashboards.delete",
            "dashboards.share",
            "dashboards.publish",
        ],
        "pipelines": [
            "pipelines.view",
            "pipelines.create",
            "pipelines.edit",
            "pipelines.delete",
            "pipelines.deploy",
            "pipelines.trigger",
        ],
        "users": [
            "users.view",
            "users.create",
            "users.edit",
            "users.delete",
            "users.invite",
        ],
        "roles": [
            "roles.view",
            "roles.create",
            "roles.edit",
            "roles.delete",
            "roles.assign",
        ],
        "admin": [
            "admin.settings.view",
            "admin.settings.edit",
            "admin.audit.view",
            "admin.tenants.view",
            "admin.tenants.create",
            "admin.tenants.edit",
            "admin.tenants.delete",
        ],
    }
    
    # Default roles with their permissions
    DEFAULT_ROLES = {
        "super_admin": {
            "display_name": "Super Administrator",
            "description": "Full platform access across all tenants",
            "permissions": ["*"],
            "is_system": True,
            "level": 0,
        },
        "tenant_admin": {
            "display_name": "Tenant Administrator",
            "description": "Full access within the tenant",
            "permissions": [
                "datasources.*",
                "semantic.*",
                "analytics.*",
                "dashboards.*",
                "pipelines.*",
                "users.*",
                "roles.view",
                "roles.assign",
                "admin.settings.*",
                "admin.audit.view",
            ],
            "is_system": True,
            "level": 1,
        },
        "data_engineer": {
            "display_name": "Data Engineer",
            "description": "Can manage data sources and pipelines",
            "permissions": [
                "datasources.*",
                "semantic.*",
                "pipelines.*",
                "analytics.query",
                "analytics.export",
                "dashboards.view",
            ],
            "is_system": True,
            "level": 2,
        },
        "bi_developer": {
            "display_name": "BI Developer",
            "description": "Can create and manage dashboards and analytics",
            "permissions": [
                "datasources.view",
                "semantic.view",
                "analytics.*",
                "dashboards.*",
            ],
            "is_system": True,
            "level": 2,
        },
        "analyst": {
            "display_name": "Analyst",
            "description": "Can view data and create personal dashboards",
            "permissions": [
                "datasources.view",
                "semantic.view",
                "analytics.query",
                "analytics.export",
                "dashboards.view",
                "dashboards.create",
            ],
            "is_system": True,
            "level": 3,
        },
        "viewer": {
            "display_name": "Viewer",
            "description": "Read-only access to dashboards",
            "permissions": [
                "dashboards.view",
                "analytics.query",
            ],
            "is_system": True,
            "is_default": True,
            "level": 4,
        },
    }
    
    # Permission cache (cleared on permission changes)
    _permission_cache: Dict[str, Set[str]] = {}
    
    @classmethod
    def clear_cache(cls, user_id: Optional[str] = None) -> None:
        """
        Clear the permission cache.
        
        Args:
            user_id: Optional user ID to clear cache for. If None, clears all.
        """
        if user_id:
            cls._permission_cache.pop(str(user_id), None)
        else:
            cls._permission_cache.clear()
    
    @classmethod
    def get_user_permissions(cls, user: User, use_cache: bool = True) -> Set[str]:
        """
        Get all effective permissions for a user.
        
        Combines:
        - Permissions from all assigned roles
        - Inherited permissions from role hierarchy
        
        Args:
            user: User model instance
            use_cache: Whether to use cached permissions
        
        Returns:
            Set of permission strings
        """
        user_id_str = str(user.id)
        
        # Check cache
        if use_cache and user_id_str in cls._permission_cache:
            return cls._permission_cache[user_id_str]
        
        permissions = set()
        
        # Get permissions from all roles
        for role in user.roles:
            role_perms = get_all_permissions(role)
            permissions.update(role_perms)
        
        # Cache the result
        cls._permission_cache[user_id_str] = permissions
        
        return permissions
    
    @classmethod
    def check_permission(
        cls,
        user: User,
        permission: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None
    ) -> bool:
        """
        Check if user has a specific permission.
        
        Checks in order:
        1. Wildcard permissions (*)
        2. Category wildcard (category.*)
        3. Exact permission match
        4. Resource-level permission (if resource specified)
        
        Args:
            user: User model instance
            permission: Permission string to check (e.g., "dashboards.edit")
            resource_type: Optional resource type for resource-level check
            resource_id: Optional resource ID for resource-level check
        
        Returns:
            True if user has the permission
        """
        user_perms = cls.get_user_permissions(user)
        
        # Check for global wildcard
        if "*" in user_perms or "admin:*" in user_perms:
            return True
        
        # Check for exact permission
        if permission in user_perms:
            return True
        
        # Check for category wildcard (e.g., "dashboards.*" covers "dashboards.edit")
        parts = permission.split(".")
        if len(parts) >= 2:
            category = parts[0]
            if f"{category}.*" in user_perms:
                return True
            # Also check colon format for backwards compatibility
            if f"{category}:*" in user_perms:
                return True
        
        # Check colon format permission (backwards compatibility)
        colon_perm = permission.replace(".", ":")
        if colon_perm in user_perms:
            return True
        
        # Check resource-specific permission
        if resource_type and resource_id:
            return cls.check_resource_permission(
                str(user.id),
                resource_type,
                resource_id,
                permission
            )
        
        return False
    
    @classmethod
    def check_resource_permission(
        cls,
        user_id: str,
        resource_type: str,
        resource_id: str,
        required_permission: str
    ) -> bool:
        """
        Check resource-level permission.
        
        Resource permissions follow a hierarchy:
        owner > admin > edit > view
        
        Args:
            user_id: User ID string
            resource_type: Resource type (dashboard, datasource, etc.)
            resource_id: Resource UUID string
            required_permission: Required permission (or action from permission string)
        
        Returns:
            True if user has sufficient resource permission
        """
        try:
            rp = ResourcePermission.query.filter(
                and_(
                    ResourcePermission.user_id == uuid.UUID(user_id),
                    ResourcePermission.resource_type == resource_type,
                    ResourcePermission.resource_id == uuid.UUID(resource_id)
                )
            ).first()
            
            if not rp:
                return False
            
            # Check if permission is expired
            if rp.is_expired():
                return False
            
            # Extract action from permission string (e.g., "dashboards.edit" -> "edit")
            action = required_permission.split(".")[-1] if "." in required_permission else required_permission
            
            # Map common actions to resource permission levels
            action_to_level = {
                "delete": "owner",
                "admin": "admin",
                "share": "admin",
                "edit": "edit",
                "update": "edit",
                "view": "view",
                "read": "view",
            }
            
            required_level = action_to_level.get(action, "view")
            return rp.has_level(required_level)
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid UUID in resource permission check: {e}")
            return False
    
    @classmethod
    def grant_resource_permission(
        cls,
        user_id: str,
        resource_type: str,
        resource_id: str,
        permission: str,
        granted_by: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> ResourcePermission:
        """
        Grant resource-level permission to a user.
        
        Args:
            user_id: User ID to grant permission to
            resource_type: Resource type (dashboard, datasource, etc.)
            resource_id: Resource UUID
            permission: Permission level (owner, admin, edit, view)
            granted_by: ID of user granting the permission
            expires_at: Optional expiration datetime
        
        Returns:
            Created or updated ResourcePermission
        """
        # Check if permission already exists
        existing = ResourcePermission.query.filter(
            and_(
                ResourcePermission.user_id == uuid.UUID(user_id),
                ResourcePermission.resource_type == resource_type,
                ResourcePermission.resource_id == uuid.UUID(resource_id)
            )
        ).first()
        
        if existing:
            # Update existing permission
            existing.permission = permission
            existing.granted_by = uuid.UUID(granted_by) if granted_by else None
            existing.granted_at = datetime.utcnow()
            existing.expires_at = expires_at
            db.session.commit()
            
            logger.info(
                f"Updated resource permission: {permission} on {resource_type}:{resource_id} "
                f"for user {user_id}"
            )
            return existing
        
        # Create new permission
        rp = ResourcePermission(
            user_id=uuid.UUID(user_id),
            resource_type=resource_type,
            resource_id=uuid.UUID(resource_id),
            permission=permission,
            granted_by=uuid.UUID(granted_by) if granted_by else None,
            expires_at=expires_at
        )
        
        db.session.add(rp)
        db.session.commit()
        
        logger.info(
            f"Granted resource permission: {permission} on {resource_type}:{resource_id} "
            f"for user {user_id}"
        )
        
        return rp
    
    @classmethod
    def revoke_resource_permission(
        cls,
        user_id: str,
        resource_type: str,
        resource_id: str
    ) -> bool:
        """
        Revoke resource-level permission from a user.
        
        Args:
            user_id: User ID
            resource_type: Resource type
            resource_id: Resource UUID
        
        Returns:
            True if permission was revoked, False if not found
        """
        result = ResourcePermission.query.filter(
            and_(
                ResourcePermission.user_id == uuid.UUID(user_id),
                ResourcePermission.resource_type == resource_type,
                ResourcePermission.resource_id == uuid.UUID(resource_id)
            )
        ).delete()
        
        db.session.commit()
        
        if result:
            logger.info(
                f"Revoked resource permission on {resource_type}:{resource_id} "
                f"for user {user_id}"
            )
        
        return result > 0
    
    @classmethod
    def get_resource_permissions(
        cls,
        resource_type: str,
        resource_id: str
    ) -> List[ResourcePermission]:
        """
        Get all permissions for a specific resource.
        
        Args:
            resource_type: Resource type
            resource_id: Resource UUID
        
        Returns:
            List of ResourcePermission objects
        """
        return ResourcePermission.query.filter(
            and_(
                ResourcePermission.resource_type == resource_type,
                ResourcePermission.resource_id == uuid.UUID(resource_id)
            )
        ).all()
    
    @classmethod
    def get_user_resource_permissions(
        cls,
        user_id: str,
        resource_type: Optional[str] = None
    ) -> List[ResourcePermission]:
        """
        Get all resource permissions for a user.
        
        Args:
            user_id: User ID
            resource_type: Optional filter by resource type
        
        Returns:
            List of ResourcePermission objects
        """
        query = ResourcePermission.query.filter(
            ResourcePermission.user_id == uuid.UUID(user_id)
        )
        
        if resource_type:
            query = query.filter(ResourcePermission.resource_type == resource_type)
        
        return query.all()
    
    @classmethod
    def initialize_permissions(cls) -> List[Permission]:
        """
        Initialize system permissions in the database.
        
        Should be called during application setup.
        
        Returns:
            List of created Permission objects
        """
        created = []
        
        for category, perms in cls.DEFAULT_PERMISSIONS.items():
            for perm_name in perms:
                existing = Permission.query.filter_by(name=perm_name).first()
                if not existing:
                    permission = Permission(
                        name=perm_name,
                        description=f"Permission to {perm_name.split('.')[-1]} {category}",
                        category=category,
                        is_system=True
                    )
                    db.session.add(permission)
                    created.append(permission)
        
        if created:
            db.session.commit()
            logger.info(f"Initialized {len(created)} system permissions")
        
        return created
    
    @classmethod
    def initialize_tenant_roles(cls, tenant_id: str) -> List[Role]:
        """
        Create default roles for a new tenant.
        
        Args:
            tenant_id: Tenant UUID
        
        Returns:
            List of created Role objects
        """
        roles = []
        tenant_uuid = uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id
        
        for role_name, config in cls.DEFAULT_ROLES.items():
            # Skip super_admin for tenant-specific roles
            if role_name == "super_admin":
                continue
            
            # Check if role already exists for this tenant
            existing = Role.query.filter(
                and_(
                    Role.name == role_name,
                    Role.tenant_id == tenant_uuid
                )
            ).first()
            
            if existing:
                continue
            
            # Build permissions dict from permission patterns
            permissions_dict = cls._expand_permission_patterns(config["permissions"])
            
            role = Role(
                name=role_name,
                display_name=config["display_name"],
                description=config["description"],
                permissions=permissions_dict,
                is_system=config.get("is_system", True),
                is_default=config.get("is_default", False),
                tenant_id=tenant_uuid
            )
            
            db.session.add(role)
            roles.append(role)
        
        if roles:
            db.session.commit()
            logger.info(f"Initialized {len(roles)} roles for tenant {tenant_id}")
        
        return roles
    
    @classmethod
    def _expand_permission_patterns(cls, patterns: List[str]) -> Dict[str, Any]:
        """
        Expand permission patterns into a permissions dictionary.
        
        Handles patterns like:
        - "*" -> all permissions
        - "category.*" -> all permissions in category
        - "category.action" -> specific permission
        
        Args:
            patterns: List of permission patterns
        
        Returns:
            Dictionary of permissions
        """
        permissions = {}
        
        for pattern in patterns:
            if pattern == "*":
                # All permissions
                for category, perms in cls.DEFAULT_PERMISSIONS.items():
                    permissions[category] = perms
                break
            elif pattern.endswith(".*"):
                # Category wildcard
                category = pattern[:-2]
                if category in cls.DEFAULT_PERMISSIONS:
                    permissions[category] = cls.DEFAULT_PERMISSIONS[category]
            else:
                # Specific permission
                parts = pattern.split(".")
                if len(parts) >= 2:
                    category = parts[0]
                    if category not in permissions:
                        permissions[category] = []
                    if pattern not in permissions[category]:
                        permissions[category].append(pattern)
        
        return permissions
    
    @classmethod
    def assign_role_to_user(
        cls,
        user: User,
        role_name: str,
        assigned_by: Optional[str] = None
    ) -> bool:
        """
        Assign a role to a user.
        
        Args:
            user: User model instance
            role_name: Name of the role to assign
            assigned_by: ID of user making the assignment
        
        Returns:
            True if role was assigned, False if already assigned or role not found
        """
        # Find role (prefer tenant-specific, fall back to global)
        role = Role.query.filter(
            and_(
                Role.name == role_name,
                Role.tenant_id == user.tenant_id
            )
        ).first()
        
        if not role:
            # Try global role
            role = Role.query.filter(
                and_(
                    Role.name == role_name,
                    Role.tenant_id.is_(None)
                )
            ).first()
        
        if not role:
            logger.warning(f"Role not found: {role_name}")
            return False
        
        if role in user.roles:
            logger.info(f"User {user.id} already has role {role_name}")
            return False
        
        user.roles.append(role)
        db.session.commit()
        
        # Clear permission cache for this user
        cls.clear_cache(str(user.id))
        
        logger.info(f"Assigned role {role_name} to user {user.id}")
        return True
    
    @classmethod
    def remove_role_from_user(cls, user: User, role_name: str) -> bool:
        """
        Remove a role from a user.
        
        Args:
            user: User model instance
            role_name: Name of the role to remove
        
        Returns:
            True if role was removed, False if not assigned
        """
        role = next((r for r in user.roles if r.name == role_name), None)
        
        if not role:
            return False
        
        user.roles.remove(role)
        db.session.commit()
        
        # Clear permission cache for this user
        cls.clear_cache(str(user.id))
        
        logger.info(f"Removed role {role_name} from user {user.id}")
        return True
    
    @classmethod
    def create_role_hierarchy(
        cls,
        parent_role_id: str,
        child_role_id: str
    ) -> RoleHierarchy:
        """
        Create a role hierarchy relationship.
        
        The child role will inherit all permissions from the parent.
        
        Args:
            parent_role_id: Parent role UUID
            child_role_id: Child role UUID
        
        Returns:
            Created RoleHierarchy object
        """
        hierarchy = RoleHierarchy(
            parent_role_id=uuid.UUID(parent_role_id),
            child_role_id=uuid.UUID(child_role_id)
        )
        
        db.session.add(hierarchy)
        db.session.commit()
        
        # Clear all caches since permissions may have changed
        cls.clear_cache()
        
        return hierarchy


# Create singleton instance
rbac_service = RBACService()
