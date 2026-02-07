"""
NovaSight Unified Identity Resolution
======================================

Single source of truth for resolving the current user's identity
from the JWT token. All code should use `get_current_identity()`
instead of reading from `g.*` directly or calling `get_jwt_identity_dict()`.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from flask import g
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Identity:
    """
    Immutable identity of the currently authenticated user.

    This is the canonical representation — all auth decorators and
    service methods should use this instead of raw JWT dicts or `g.*` attrs.
    """

    user_id: str
    email: str
    tenant_id: str
    roles: List[str] = field(default_factory=list)
    permissions: List[str] = field(default_factory=list)

    @property
    def is_super_admin(self) -> bool:
        """Check if user has super_admin role."""
        from app.platform.auth.constants import ROLE_SUPER_ADMIN
        return ROLE_SUPER_ADMIN in self.roles

    @property
    def is_tenant_admin(self) -> bool:
        """Check if user has tenant_admin role."""
        from app.platform.auth.constants import ROLE_TENANT_ADMIN
        return ROLE_TENANT_ADMIN in self.roles

    def has_role(self, role: str) -> bool:
        """Check if user has a specific role (exact match)."""
        from app.platform.auth.constants import normalize_role_name
        canonical = normalize_role_name(role)
        return canonical in self.roles or self.is_super_admin

    def has_permission(self, permission: str) -> bool:
        """
        Check if user has a specific permission.

        Note: This is a fast check against JWT-embedded permissions.
        For full RBAC resolution (hierarchy, wildcards), use the
        RBACService.check_permission() method.
        """
        from app.platform.auth.constants import normalize_permission
        normalized = normalize_permission(permission)
        return (
            normalized in self.permissions
            or "*" in self.permissions
            or self.is_super_admin
        )


def get_current_identity() -> Optional[Identity]:
    """
    Get the current user's identity from the request context.

    This reads from `g.*` attributes set by TenantContextMiddleware
    and packages them into an immutable Identity object.

    Returns:
        Identity object, or None if no authenticated user.
    """
    user_id = getattr(g, "current_user_id", None)
    if not user_id:
        # Try legacy attribute name
        user_id = getattr(g, "user_id", None)

    if not user_id:
        return None

    return Identity(
        user_id=str(user_id),
        email=getattr(g, "user_email", "") or "",
        tenant_id=str(getattr(g, "tenant_id", "") or ""),
        roles=list(getattr(g, "user_roles", []) or []),
        permissions=list(getattr(g, "user_permissions", []) or []),
    )


def require_identity() -> Identity:
    """
    Get the current identity or raise AuthenticationError.

    Use this in code paths where authentication is mandatory.

    Returns:
        Identity object.

    Raises:
        AuthenticationError: If no authenticated user.
    """
    identity = get_current_identity()
    if identity is None:
        from app.errors import AuthenticationError
        raise AuthenticationError("Authentication required")
    return identity
