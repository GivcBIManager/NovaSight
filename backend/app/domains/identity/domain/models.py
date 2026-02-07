"""
NovaSight Identity Domain Models
=================================

SQLAlchemy models for User, Role, Permission, and RBAC.
These are the canonical definitions — app.models.user and app.models.rbac
re-export from here for backward compatibility.
"""

import uuid
import enum
from datetime import datetime
from typing import List, Set, Optional
from sqlalchemy import (
    String, Text, DateTime, Boolean, ForeignKey,
    Table, Integer, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.extensions import db


# ────────────────────────────────────────────
# Enums
# ────────────────────────────────────────────

class UserStatus(enum.Enum):
    """User status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    LOCKED = "locked"


# ────────────────────────────────────────────
# Association Tables
# ────────────────────────────────────────────

user_roles = Table(
    "user_roles",
    db.Model.metadata,
    db.Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    db.Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True),
    db.Column("assigned_at", DateTime, default=datetime.utcnow),
    db.Column("assigned_by", UUID(as_uuid=True), nullable=True),
)

role_permissions = Table(
    "role_permissions",
    db.Model.metadata,
    db.Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "permission_id",
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column("granted_at", DateTime, default=datetime.utcnow),
)


# ────────────────────────────────────────────
# Role
# ────────────────────────────────────────────

class Role(db.Model):
    """
    Role model for RBAC.

    Predefined roles: super_admin, tenant_admin, data_engineer,
    bi_developer, analyst, viewer
    """

    __tablename__ = "roles"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(String(50), unique=True, nullable=False, index=True)
    display_name = db.Column(String(100), nullable=False)
    description = db.Column(Text, nullable=True)

    # Permission flags (can be extended to JSONB for granular permissions)
    permissions = db.Column(JSONB, default=dict, nullable=False)

    # Is this a system role (cannot be deleted/modified)
    is_system = db.Column(Boolean, default=False, nullable=False)

    # Is this the default role for new users in the tenant
    is_default = db.Column(Boolean, default=False, nullable=False)

    # Tenant scope (null = global role like super_admin)
    tenant_id = db.Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)

    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")

    def __repr__(self):
        return f"<Role {self.name}>"

    def to_dict(self) -> dict:
        """Convert role to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "permissions": self.permissions,
            "is_system": self.is_system,
            "is_default": self.is_default,
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
        }


# ────────────────────────────────────────────
# UserRole (explicit association model)
# ────────────────────────────────────────────

class UserRole(db.Model):
    """
    Explicit User-Role association model for additional metadata.
    """

    __tablename__ = "user_role_assignments"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role_id = db.Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    assigned_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    assigned_by = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    expires_at = db.Column(DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )


# ────────────────────────────────────────────
# User
# ────────────────────────────────────────────

class User(db.Model):
    """
    User model.

    Represents a user within a tenant context.
    """

    __tablename__ = "users"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Tenant association
    tenant_id = db.Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)

    # Authentication
    email = db.Column(String(255), nullable=False, index=True)
    password_hash = db.Column(String(255), nullable=False)

    # Profile
    name = db.Column(String(255), nullable=False)
    avatar_url = db.Column(String(500), nullable=True)

    # Status (stored as string to match DB schema)
    status = db.Column(String(50), default="active", nullable=False)

    # SSO integration
    sso_provider = db.Column(String(50), nullable=True)
    sso_subject = db.Column(String(255), nullable=True)

    # Preferences and settings
    preferences = db.Column(JSONB, default=dict, nullable=False)

    # Timestamps
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = db.Column(DateTime, nullable=True)

    # Unique email within tenant
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "email", name="uq_tenant_user_email"),
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    roles = relationship("Role", secondary=user_roles, back_populates="users")

    def __repr__(self):
        return f"<User {self.email}>"

    def set_password(self, password: str) -> None:
        """Hash and set user password using Argon2."""
        from app.platform.security.passwords import password_service
        self.password_hash = password_service.hash(password)

    def check_password(self, password: str) -> bool:
        """Verify password against stored hash using Argon2."""
        from app.platform.security.passwords import password_service
        return password_service.verify(password, self.password_hash)

    def has_role(self, role_name: str) -> bool:
        """Check if user has a specific role."""
        return any(role.name == role_name for role in self.roles)

    def has_any_role(self, role_names: List[str]) -> bool:
        """Check if user has any of the specified roles."""
        return any(role.name in role_names for role in self.roles)

    def to_dict(self, include_roles: bool = True) -> dict:
        """Convert user to dictionary."""
        status_value = self.status.value if hasattr(self.status, 'value') else str(self.status)

        result = {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "status": status_value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
        }
        if include_roles:
            result["roles"] = [role.to_dict() for role in self.roles]
        return result

    def is_active(self) -> bool:
        """Check if user is active."""
        if hasattr(self.status, 'value'):
            return self.status == UserStatus.ACTIVE
        return self.status == "active"


# ────────────────────────────────────────────
# Permission
# ────────────────────────────────────────────

class Permission(db.Model):
    """
    Permission definition model.

    Permissions follow the pattern: category.action or category.resource.action
    Examples:
        - datasources.view
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


# ────────────────────────────────────────────
# ResourcePermission
# ────────────────────────────────────────────

class ResourcePermission(db.Model):
    """
    Resource-level permissions (beyond role-based).

    Permission hierarchy (highest to lowest):
        - owner: Full control including deletion and permission management
        - admin: Can edit and share but not delete
        - edit: Can modify the resource
        - view: Read-only access
    """

    __tablename__ = "resource_permissions"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource_type = db.Column(String(50), nullable=False, index=True)
    resource_id = db.Column(UUID(as_uuid=True), nullable=False, index=True)
    permission = db.Column(String(20), nullable=False)

    granted_by = db.Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    granted_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "resource_type",
            "resource_id",
            name="uq_user_resource_permission",
        ),
    )

    user = relationship("User", foreign_keys=[user_id], backref="resource_permissions")
    grantor = relationship("User", foreign_keys=[granted_by])

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
        """Check if this permission meets or exceeds the required level."""
        if self.permission not in self.PERMISSION_LEVELS:
            return False
        if required_level not in self.PERMISSION_LEVELS:
            return False
        return self.PERMISSION_LEVELS[self.permission] <= self.PERMISSION_LEVELS[required_level]

    def is_expired(self) -> bool:
        """Check if this permission has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at


# ────────────────────────────────────────────
# RoleHierarchy
# ────────────────────────────────────────────

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
        nullable=False,
    )
    child_role_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "parent_role_id",
            "child_role_id",
            name="uq_role_hierarchy",
        ),
    )

    parent = relationship("Role", foreign_keys=[parent_role_id], backref="child_roles")
    child = relationship("Role", foreign_keys=[child_role_id], backref="parent_roles_rel")


# ────────────────────────────────────────────
# Utility functions (previously in rbac.py)
# ────────────────────────────────────────────

def get_all_permissions(role: Role) -> Set[str]:
    """
    Get all permissions including inherited from parent roles.

    Returns:
        Set of permission names
    """
    import logging

    _logger = logging.getLogger(__name__)
    permissions: Set[str] = set()

    # Direct permissions from JSONB field
    if role.permissions:
        if isinstance(role.permissions, dict):
            for category, perms in role.permissions.items():
                if isinstance(perms, list):
                    permissions.update(perms)
                elif isinstance(perms, bool) and perms:
                    permissions.add(f"{category}.*")
                elif category == "all" and perms is True:
                    permissions.add("*")
                elif category == "tenant" and perms == "all":
                    permissions.add("admin.*")
                    permissions.add("admin.infrastructure.*")
                elif perms == "all":
                    permissions.add(f"{category}.*")
        elif isinstance(role.permissions, list):
            permissions.update(role.permissions)

    # Permissions from role_permissions association
    try:
        role_perms = Permission.query.join(
            role_permissions,
            role_permissions.c.permission_id == Permission.id,
        ).filter(
            role_permissions.c.role_id == role.id,
        ).all()

        for perm in role_perms:
            permissions.add(perm.name)
    except Exception as e:
        _logger.debug(f"Could not query role_permissions table: {e}")

    # Inherited permissions from parent roles
    try:
        for parent_rel in getattr(role, "parent_roles_rel", []):
            parent = parent_rel.parent
            if parent:
                permissions.update(get_all_permissions(parent))
    except Exception as e:
        _logger.debug(f"Could not get parent role permissions: {e}")

    return permissions


def get_role_hierarchy_level(role: Role, visited: Optional[Set] = None) -> int:
    """
    Calculate the hierarchy level of a role.

    Level 0 = highest (no parents).
    """
    if visited is None:
        visited = set()

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
