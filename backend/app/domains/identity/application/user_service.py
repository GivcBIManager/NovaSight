"""
NovaSight User Service
======================

Canonical location: ``app.domains.identity.application.user_service``

User management within tenant context.
Delegates password operations to ``platform.security.passwords``.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime

from app.extensions import db
from app.domains.identity.domain.models import User, Role, UserStatus
from app.platform.security.passwords import password_service

import logging

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management within a tenant."""

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id

    # ── Listing ───────────────────────────────────────

    @classmethod
    def list_for_tenant(
        cls,
        tenant_id: str,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List all users for a tenant with filtering and pagination."""
        query = User.query.filter_by(tenant_id=tenant_id)

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                User.email.ilike(search_pattern) | User.name.ilike(search_pattern)
            )

        if role:
            query = query.join(User.roles).filter(Role.name == role)

        if status:
            try:
                UserStatus(status)
                query = query.filter(User.status == status)
            except ValueError:
                pass

        query = query.order_by(User.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return {
            "items": [u.to_dict() for u in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        }

    def list_users(
        self,
        page: int = 1,
        per_page: int = 20,
        role: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List users in the tenant."""
        query = User.query.filter(User.tenant_id == self.tenant_id)

        if status:
            try:
                UserStatus(status)
                query = query.filter(User.status == status)
            except ValueError:
                pass

        if role:
            query = query.join(User.roles).filter(Role.name == role)

        query = query.order_by(User.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return {
            "users": [u.to_dict() for u in pagination.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }

    # ── CRUD ──────────────────────────────────────────

    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID within tenant."""
        return User.query.filter(
            User.id == user_id,
            User.tenant_id == self.tenant_id,
        ).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email within tenant."""
        return User.query.filter(
            User.email == email,
            User.tenant_id == self.tenant_id,
        ).first()

    def create_user(
        self,
        email: str,
        name: str,
        password: str,
        role_names: Optional[List[str]] = None,
    ) -> User:
        """
        Create a new user in the tenant.

        Raises:
            ValueError: If email exists or password is weak
        """
        is_valid, message = password_service.validate_strength(password)
        if not is_valid:
            raise ValueError(message)

        existing = self.get_user_by_email(email)
        if existing:
            raise ValueError(f"User with email '{email}' already exists")

        user = User(
            tenant_id=self.tenant_id,
            email=email.lower(),
            name=name,
            status=UserStatus.ACTIVE.value,
        )
        user.set_password(password)

        # Assign roles
        if role_names:
            roles = Role.query.filter(Role.name.in_(role_names)).all()
            user.roles = roles
        else:
            viewer_role = Role.query.filter(Role.name == "viewer").first()
            if viewer_role:
                user.roles = [viewer_role]

        db.session.add(user)
        db.session.commit()

        logger.info(f"Created user: {email} in tenant {self.tenant_id}")
        return user

    def update_user(self, user_id: str, **kwargs) -> Optional[User]:
        """Update user details."""
        user = self.get_user(user_id)
        if not user:
            return None

        # Password
        if "password" in kwargs:
            new_password = kwargs.pop("password")
            is_valid, message = password_service.validate_strength(new_password)
            if not is_valid:
                raise ValueError(message)
            user.set_password(new_password)

        # Roles
        if "roles" in kwargs:
            role_names = kwargs.pop("roles")
            if isinstance(role_names, list):
                roles = Role.query.filter(Role.name.in_(role_names)).all()
                user.roles = roles

        # Other allowed fields
        allowed_fields = ["name", "status", "avatar_url", "preferences"]
        for field, value in kwargs.items():
            if field not in allowed_fields:
                continue
            if field == "status":
                try:
                    value = UserStatus(value)
                except ValueError:
                    continue
            setattr(user, field, value)

        db.session.commit()
        logger.info(f"Updated user: {user.email}")
        return user

    def delete_user(self, user_id: str) -> bool:
        """Delete (deactivate) a user."""
        user = self.get_user(user_id)
        if not user:
            return False

        user.status = UserStatus.INACTIVE.value
        db.session.commit()

        logger.info(f"Deactivated user: {user.email}")
        return True

    def deactivate(self, user_id: str) -> User:
        """
        Deactivate a user (soft delete).

        Raises:
            ValueError: If user not found
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")

        user.status = UserStatus.INACTIVE.value
        user.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Deactivated user: {user.email}")
        return user

    # ── Permissions ───────────────────────────────────

    def get_permissions(self, user_id: str) -> List[str]:
        """
        Get all effective permissions for a user from all assigned roles.

        Raises:
            ValueError: If user not found
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")

        # Delegate to domain-level permission resolution
        from app.domains.identity.domain.models import get_all_permissions

        permissions: set = set()
        for role in user.roles:
            permissions.update(get_all_permissions(role))

        return sorted(permissions)

    # ── Role Assignment ───────────────────────────────

    def assign_roles(self, user_id: str, role_names: List[str]) -> User:
        """
        Replace user's roles with new role assignments.

        Raises:
            ValueError: If user not found
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")

        roles = Role.query.filter(
            Role.name.in_(role_names),
            (Role.tenant_id == self.tenant_id) | (Role.tenant_id.is_(None)),
        ).all()

        if not roles:
            raise ValueError(f"No valid roles found: {role_names}")

        user.roles = roles
        user.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Assigned roles {role_names} to user: {user.email}")
        return user

    # ── Password ──────────────────────────────────────

    def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> bool:
        """
        Change user's password with current password verification.

        Raises:
            ValueError: If validation fails
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.check_password(current_password):
            raise ValueError("Current password is incorrect")

        is_valid, message = password_service.validate_strength(new_password)
        if not is_valid:
            raise ValueError(message)

        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Password changed for user: {user.email}")
        return True
