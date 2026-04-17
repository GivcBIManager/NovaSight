"""
Tests for app.platform.auth.access_checker
=============================================

Covers the concrete AccessChecker(IAccessChecker) implementation.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.platform.auth.access_checker import AccessChecker, access_checker
from app.platform.auth.identity import Identity
from app.platform.auth.interfaces import IAccessChecker


class TestAccessCheckerInterface:
    """Verify AccessChecker implements IAccessChecker."""

    def test_is_iaccesschecker_subclass(self):
        assert issubclass(AccessChecker, IAccessChecker)

    def test_singleton_available(self):
        assert isinstance(access_checker, AccessChecker)


class TestCheckRoles:
    """Test AccessChecker.check_roles()."""

    def test_super_admin_always_passes(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["super_admin"],
        )
        assert checker.check_roles(identity, ["data_engineer"]) is True
        assert checker.check_roles(identity, ["nonexistent"]) is True

    def test_matching_role(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["analyst"],
        )
        assert checker.check_roles(identity, ["analyst", "viewer"]) is True

    def test_no_matching_role(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["viewer"],
        )
        assert checker.check_roles(identity, ["data_engineer"]) is False

    def test_deprecated_role_name_normalized(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["tenant_admin"],
        )
        assert checker.check_roles(identity, ["admin"]) is True

    def test_empty_roles(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=[],
        )
        assert checker.check_roles(identity, ["viewer"]) is False

    def test_empty_allowed_roles(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["analyst"],
        )
        assert checker.check_roles(identity, []) is False


class TestCheckPermission:
    """Test AccessChecker.check_permission()."""

    def test_jwt_embedded_permission(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["dashboards.view", "dashboards.create"],
        )
        assert checker.check_permission(identity, "dashboards.view") is True
        assert checker.check_permission(identity, "dashboards.delete") is False

    def test_wildcard_permission(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["*"],
        )
        assert checker.check_permission(identity, "anything.at.all") is True

    def test_super_admin_bypass(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["super_admin"], permissions=[],
        )
        assert checker.check_permission(identity, "admin.nuke") is True

    def test_rbac_fallback(self, app):
        """When JWT claims don't have the permission, falls back to RBAC service."""
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=[],
        )
        with app.app_context():
            from flask import g
            mock_user = MagicMock()
            g.current_user = mock_user

            with patch("app.domains.identity.application.rbac_service.rbac_service") as mock_rbac:
                mock_rbac.check_permission.return_value = True
                assert checker.check_permission(identity, "dashboards.view") is True
                mock_rbac.check_permission.assert_called_once()


class TestCheckAnyPermission:
    """Test AccessChecker.check_any_permission()."""

    def test_any_match(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["reports.read"],
        )
        assert checker.check_any_permission(
            identity, ["reports.read", "reports.admin"]
        ) is True

    def test_none_match(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["dashboards.view"],
        )
        assert checker.check_any_permission(
            identity, ["reports.read", "reports.admin"]
        ) is False


class TestCheckAllPermissions:
    """Test AccessChecker.check_all_permissions()."""

    def test_all_present(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["a.read", "a.write"],
        )
        missing = checker.check_all_permissions(identity, ["a.read", "a.write"])
        assert missing == []

    def test_some_missing(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["a.read"],
        )
        missing = checker.check_all_permissions(identity, ["a.read", "a.write"])
        assert "a.write" in missing
        assert "a.read" not in missing

    def test_all_missing(self):
        checker = AccessChecker()
        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=[],
        )
        missing = checker.check_all_permissions(identity, ["x", "y"])
        assert len(missing) == 2
