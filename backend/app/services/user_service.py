"""
NovaSight User Service
======================

User management within tenant context.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from app.extensions import db
from app.models.user import User, Role, UserStatus
from app.models.tenant import Tenant
from app.services.password_service import PasswordService
import logging

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management within a tenant."""
    
    def __init__(self, tenant_id: str):
        """
        Initialize user service for a specific tenant.
        
        Args:
            tenant_id: Tenant UUID
        """
        self.tenant_id = tenant_id
        self.password_service = PasswordService()
    
    @classmethod
    def list_for_tenant(
        cls,
        tenant_id: str,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List all users for a tenant with filtering and pagination.
        
        Args:
            tenant_id: Tenant UUID
            page: Page number
            per_page: Items per page
            search: Search term for email or name
            role: Filter by role name
            status: Filter by status
        
        Returns:
            Paginated list of users
        """
        query = User.query.filter_by(tenant_id=tenant_id)
        
        if search:
            search_pattern = f'%{search}%'
            query = query.filter(
                User.email.ilike(search_pattern) |
                User.name.ilike(search_pattern)
            )
        
        if role:
            query = query.join(User.roles).filter(Role.name == role)
        
        if status:
            try:
                status_enum = UserStatus(status)
                query = query.filter(User.status == status_enum)
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
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List users in the tenant.
        
        Args:
            page: Page number
            per_page: Items per page
            role: Filter by role name
            status: Filter by status
        
        Returns:
            Paginated list of users
        """
        query = User.query.filter(User.tenant_id == self.tenant_id)
        
        if status:
            try:
                status_enum = UserStatus(status)
                query = query.filter(User.status == status_enum)
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
            }
        }
    
    def get_user(self, user_id: str) -> Optional[User]:
        """
        Get user by ID within tenant.
        
        Args:
            user_id: User UUID
        
        Returns:
            User object or None
        """
        return User.query.filter(
            User.id == user_id,
            User.tenant_id == self.tenant_id
        ).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email within tenant.
        
        Args:
            email: User email
        
        Returns:
            User object or None
        """
        return User.query.filter(
            User.email == email,
            User.tenant_id == self.tenant_id
        ).first()
    
    def create_user(
        self,
        email: str,
        name: str,
        password: str,
        role_names: List[str] = None
    ) -> User:
        """
        Create a new user in the tenant.
        
        Args:
            email: User email
            name: User display name
            password: Initial password
            role_names: List of role names to assign
        
        Returns:
            Created User object
        
        Raises:
            ValueError: If email exists or password is weak
        """
        # Validate password strength
        is_valid, message = self.password_service.validate_strength(password)
        if not is_valid:
            raise ValueError(message)
        
        # Check for existing user
        existing = self.get_user_by_email(email)
        if existing:
            raise ValueError(f"User with email '{email}' already exists")
        
        user = User(
            tenant_id=self.tenant_id,
            email=email.lower(),
            name=name,
            status=UserStatus.ACTIVE.value,  # Use string value for DB
        )
        user.set_password(password)
        
        # Assign roles
        if role_names:
            roles = Role.query.filter(Role.name.in_(role_names)).all()
            user.roles = roles
        else:
            # Assign default viewer role
            viewer_role = Role.query.filter(Role.name == "viewer").first()
            if viewer_role:
                user.roles = [viewer_role]
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"Created user: {email} in tenant {self.tenant_id}")
        
        return user
    
    def update_user(
        self,
        user_id: str,
        **kwargs
    ) -> Optional[User]:
        """
        Update user details.
        
        Args:
            user_id: User UUID
            **kwargs: Fields to update
        
        Returns:
            Updated User object or None
        """
        user = self.get_user(user_id)
        if not user:
            return None
        
        # Handle password separately with validation
        if "password" in kwargs:
            new_password = kwargs.pop("password")
            is_valid, message = self.password_service.validate_strength(new_password)
            if not is_valid:
                raise ValueError(message)
            user.set_password(new_password)
            user.password_changed_at = datetime.utcnow()
        
        # Handle roles separately
        if "roles" in kwargs:
            role_names = kwargs.pop("roles")
            if isinstance(role_names, list):
                roles = Role.query.filter(Role.name.in_(role_names)).all()
                user.roles = roles
        
        # Update other allowed fields
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
        """
        Delete (deactivate) a user.
        
        Args:
            user_id: User UUID
        
        Returns:
            True if successful
        """
        user = self.get_user(user_id)
        if not user:
            return False
        
        user.status = UserStatus.INACTIVE.value  # Use string value for DB
        db.session.commit()
        
        logger.info(f"Deactivated user: {user.email}")
        
        return True
    
    def deactivate(self, user_id: str) -> User:
        """
        Deactivate a user (soft delete).
        
        Args:
            user_id: User UUID
        
        Returns:
            Deactivated User object
        
        Raises:
            ValueError: If user not found
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        user.status = UserStatus.INACTIVE.value  # Use string value for DB
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Deactivated user: {user.email}")
        
        return user
    
    def get_permissions(self, user_id: str) -> List[str]:
        """
        Get all effective permissions for a user from all assigned roles.
        
        Args:
            user_id: User UUID
        
        Returns:
            List of permission strings
        
        Raises:
            ValueError: If user not found
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        permissions = set()
        for role in user.roles:
            if role.permissions:
                # Permissions stored as dict {"perm.name": True/False}
                for perm_name, enabled in role.permissions.items():
                    if enabled:
                        permissions.add(perm_name)
        
        return sorted(list(permissions))
    
    def assign_roles(self, user_id: str, role_names: List[str]) -> User:
        """
        Replace user's roles with new role assignments.
        
        Args:
            user_id: User UUID
            role_names: List of role names to assign
        
        Returns:
            Updated User object
        
        Raises:
            ValueError: If user not found
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Get roles (scoped to tenant or global)
        roles = Role.query.filter(
            Role.name.in_(role_names),
            (Role.tenant_id == self.tenant_id) | (Role.tenant_id.is_(None))
        ).all()
        
        if not roles:
            raise ValueError(f"No valid roles found: {role_names}")
        
        user.roles = roles
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Assigned roles {role_names} to user: {user.email}")
        
        return user
    
    def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str
    ) -> bool:
        """
        Change user's password with current password verification.
        
        Args:
            user_id: User UUID
            current_password: Current password for verification
            new_password: New password to set
        
        Returns:
            True if successful
        
        Raises:
            ValueError: If validation fails
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Verify current password
        if not user.check_password(current_password):
            raise ValueError("Current password is incorrect")
        
        # Validate new password strength
        is_valid, message = self.password_service.validate_strength(new_password)
        if not is_valid:
            raise ValueError(message)
        
        # Set new password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Password changed for user: {user.email}")
        
        return True
        
        return True
