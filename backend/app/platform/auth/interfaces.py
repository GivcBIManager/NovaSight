"""
NovaSight Platform — Auth Interfaces
======================================

Abstract contracts for authentication, identity resolution,
and access control.  Domain code should depend on these
interfaces rather than on concrete implementations.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional, Protocol, runtime_checkable


# ── Identity representation (value object) ────────────────────────
# The concrete dataclass lives in ``identity.py``; the interface
# describes what any identity-like object must expose.


@runtime_checkable
class IIdentity(Protocol):
    """Read-only view of an authenticated user's identity."""

    user_id: str
    email: str
    tenant_id: str
    roles: List[str]
    permissions: List[str]

    @property
    def is_super_admin(self) -> bool: ...

    @property
    def is_tenant_admin(self) -> bool: ...

    def has_role(self, role: str) -> bool: ...
    def has_permission(self, permission: str) -> bool: ...


# ── Identity resolver ─────────────────────────────────────────────


class IIdentityResolver(ABC):
    """
    Resolves the current request's authenticated identity.

    Implementors typically read from ``flask.g`` or a similar
    request-scoped store.
    """

    @abstractmethod
    def get_current_identity(self) -> Optional[IIdentity]:
        """Return the identity for the current request, or ``None``."""
        ...

    @abstractmethod
    def require_identity(self) -> IIdentity:
        """Return the identity or raise ``AuthenticationError``."""
        ...


# ── Access checker ────────────────────────────────────────────────


class IAccessChecker(ABC):
    """
    Checks whether the current identity satisfies role / permission
    requirements.

    Implementations may perform simple JWT-claim lookups or full
    RBAC resolution (hierarchy, wildcards, resource-scoped grants).
    """

    @abstractmethod
    def check_roles(
        self,
        identity: IIdentity,
        allowed_roles: List[str],
    ) -> bool:
        """
        Return ``True`` if *identity* holds at least one of *allowed_roles*.
        Super-admin should always pass.
        """
        ...

    @abstractmethod
    def check_permission(
        self,
        identity: IIdentity,
        permission: str,
    ) -> bool:
        """
        Return ``True`` if *identity* has *permission*.
        """
        ...

    @abstractmethod
    def check_any_permission(
        self,
        identity: IIdentity,
        permissions: List[str],
    ) -> bool:
        """
        Return ``True`` if *identity* holds **any** of *permissions*.
        """
        ...

    @abstractmethod
    def check_all_permissions(
        self,
        identity: IIdentity,
        permissions: List[str],
    ) -> List[str]:
        """
        Return a list of **missing** permissions.
        Empty list means all are satisfied.
        """
        ...
