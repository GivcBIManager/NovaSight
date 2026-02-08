"""
NovaSight Platform — Access Checker Implementation
=====================================================

Concrete ``IAccessChecker`` backed by the existing
``RBACService`` and JWT-embedded claims.
"""

from __future__ import annotations

from typing import List
import logging

from app.platform.auth.interfaces import IAccessChecker, IIdentity
from app.platform.auth.constants import (
    ROLE_SUPER_ADMIN,
    normalize_role_name,
    normalize_permission,
)

logger = logging.getLogger(__name__)


class AccessChecker(IAccessChecker):
    """
    Default access checker.

    * Role checks use exact matching with super-admin bypass.
    * Permission checks delegate to ``RBACService`` for full
      hierarchy / wildcard resolution.
    """

    # ── IAccessChecker implementation ──────────────────────────────

    def check_roles(
        self,
        identity: IIdentity,
        allowed_roles: List[str],
    ) -> bool:
        if identity.is_super_admin:
            return True
        normalized = {normalize_role_name(r) for r in allowed_roles}
        return any(normalize_role_name(r) in normalized for r in identity.roles)

    def check_permission(
        self,
        identity: IIdentity,
        permission: str,
    ) -> bool:
        # Fast path: JWT-embedded permissions (covers super-admin wildcard)
        if identity.has_permission(permission):
            return True
        # Slow path: full RBAC resolution via service
        return self._rbac_check(identity, normalize_permission(permission))

    def check_any_permission(
        self,
        identity: IIdentity,
        permissions: List[str],
    ) -> bool:
        return any(self.check_permission(identity, p) for p in permissions)

    def check_all_permissions(
        self,
        identity: IIdentity,
        permissions: List[str],
    ) -> List[str]:
        return [p for p in permissions if not self.check_permission(identity, p)]

    # ── internal ───────────────────────────────────────────────────

    @staticmethod
    def _rbac_check(identity: IIdentity, permission: str) -> bool:
        """Delegate to the RBAC service for full resolution."""
        try:
            from flask import g
            user = getattr(g, "current_user", None)
            if user is None:
                return False
            from app.services.rbac_service import rbac_service
            return rbac_service.check_permission(user, permission)
        except Exception:
            logger.debug("RBAC check failed, falling back to JWT claims", exc_info=True)
            return False


# Module-level singleton
access_checker = AccessChecker()
