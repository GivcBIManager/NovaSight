"""
NovaSight RBAC Models
=====================

Role-Based Access Control models for comprehensive permission management.
Includes Permission, ResourcePermission, and role hierarchy support.
"""

import uuid
from datetime import datetime
from typing import Set, Optional, List
from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.extensions import db


# Role-Permission association table
role_permissions = db.Table(
    "role_permissions",
    db.Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True
    ),
    db.Column(
        "permission_id",
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True
    ),
    db.Column("granted_at", DateTime, default=datetime.utcnow),
)


class Permission(db.Model):
    """
    Permission definition model.
    
    Permissions follow the pattern: category.action or category.resource.action
    Examples:
        - datasources.view
        - datasources.create
        - dashboards.*.edit (wildcard)
        - admin.tenants.delete
    """
    
    __tablename__ = "permissions"
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(String(100), unique=True, nullable=False, index=True)
    description = db.Column(Text, nullable=True)
    category = db.Column(String(50), nullable=False, index=True)
    
    # System permissions cannot be deleted
    is_system = db.Column(Boolean, default=True, nullable=False)
    
    # Metadata
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Permission {self.name}>"
    
    def to_dict(self) -> dict:
        """Convert permission to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "is_system": self.is_system,
        }


class ResourcePermission(db.Model):
    """
    Resource-level permissions (beyond role-based).
    
    Allows fine-grained access control for specific resources
    like dashboards, datasources, etc.
    
    Permission hierarchy (highest to lowest):
        - owner: Full control including deletion and permission management
        - admin: Can edit and share but not delete
        - edit: Can modify the resource
        - view: Read-only access
    """
    
    __tablename__ = "resource_permissions"
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # User who has the permission
    user_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Resource identification
    resource_type = db.Column(String(50), nullable=False, index=True)  # dashboard, datasource, etc.
    resource_id = db.Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Permission level: owner, admin, edit, view
    permission = db.Column(String(20), nullable=False)
    
    # Audit trail
    granted_by = db.Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    granted_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(DateTime, nullable=True)  # Optional expiration
    
    # Unique constraint: one permission per user per resource
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "resource_type",
            "resource_id",
            name="uq_user_resource_permission"
        ),
    )
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="resource_permissions")
    grantor = relationship("User", foreign_keys=[granted_by])
    
    # Permission hierarchy for comparison
    PERMISSION_LEVELS = {
        "owner": 0,
        "admin": 1,
        "edit": 2,
        "view": 3,
    }
    
    def __repr__(self):
        return f"<ResourcePermission {self.permission} on {self.resource_type}:{self.resource_id}>"
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "resource_type": self.resource_type,
            "resource_id": str(self.resource_id),
            "permission": self.permission,
            "granted_by": str(self.granted_by) if self.granted_by else None,
            "granted_at": self.granted_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
    
    def has_level(self, required_level: str) -> bool:
        """
        Check if this permission meets or exceeds the required level.
        
        Args:
            required_level: Required permission level (owner, admin, edit, view)
        
        Returns:
            True if permission level is sufficient
        """
        if self.permission not in self.PERMISSION_LEVELS:
            return False
        if required_level not in self.PERMISSION_LEVELS:
            return False
        
        # Lower number = higher privilege
        return self.PERMISSION_LEVELS[self.permission] <= self.PERMISSION_LEVELS[required_level]
    
    def is_expired(self) -> bool:
        """Check if this permission has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at


class RoleHierarchy(db.Model):
    """
    Tracks role inheritance relationships.
    
    A child role inherits all permissions from its parent role.
    """
    
    __tablename__ = "role_hierarchy"
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    parent_role_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False
    )
    child_role_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Unique constraint: one relationship per parent-child pair
    __table_args__ = (
        UniqueConstraint(
            "parent_role_id",
            "child_role_id",
            name="uq_role_hierarchy"
        ),
    )
    
    parent = relationship(
        "Role",
        foreign_keys=[parent_role_id],
        backref="child_roles"
    )
    child = relationship(
        "Role",
        foreign_keys=[child_role_id],
        backref="parent_roles_rel"
    )


# Extension methods for Role model - these will be added via monkey patching
# in the RBAC service initialization

def get_all_permissions(role) -> Set[str]:
    """
    Get all permissions including inherited from parent roles.
    
    Returns:
        Set of permission names
    """
    from app.models.user import Role
    
    permissions = set()
    
    # Get direct permissions from JSONB field
    if role.permissions:
        if isinstance(role.permissions, dict):
            # Handle JSONB dict format
            for category, perms in role.permissions.items():
                if isinstance(perms, list):
                    permissions.update(perms)
                elif isinstance(perms, bool) and perms:
                    permissions.add(f"{category}:*")
        elif isinstance(role.permissions, list):
            permissions.update(role.permissions)
    
    # Get permissions from role_permissions association
    from app.models.rbac import Permission as PermModel
    role_perms = PermModel.query.join(
        role_permissions,
        role_permissions.c.permission_id == PermModel.id
    ).filter(
        role_permissions.c.role_id == role.id
    ).all()
    
    for perm in role_perms:
        permissions.add(perm.name)
    
    # Get inherited permissions from parent roles
    for parent_rel in role.parent_roles_rel:
        parent = parent_rel.parent
        if parent:
            permissions.update(get_all_permissions(parent))
    
    return permissions


def get_role_hierarchy_level(role, visited: Optional[Set] = None) -> int:
    """
    Calculate the hierarchy level of a role.
    
    Level 0 = highest (no parents)
    
    Returns:
        Integer hierarchy level
    """
    if visited is None:
        visited = set()
    
    # Prevent circular references
    if role.id in visited:
        return 0
    visited.add(role.id)
    
    if not role.parent_roles_rel:
        return 0
    
    max_parent_level = 0
    for parent_rel in role.parent_roles_rel:
        parent = parent_rel.parent
        if parent:
            parent_level = get_role_hierarchy_level(parent, visited)
            max_parent_level = max(max_parent_level, parent_level + 1)
    
    return max_parent_level
