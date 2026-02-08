"""
Tests for app.platform.auth.identity
======================================

Covers the Identity dataclass and resolution functions.
"""

import pytest
from unittest.mock import patch, MagicMock
from flask import g


class TestIdentityDataclass:
    """Test the frozen Identity dataclass."""

    def test_basic_construction(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1",
            email="alice@example.com",
            tenant_id="t1",
            roles=["analyst", "viewer"],
            permissions=["dashboards.view"],
        )
        assert identity.user_id == "u1"
        assert identity.email == "alice@example.com"
        assert identity.tenant_id == "t1"
        assert identity.roles == ["analyst", "viewer"]
        assert identity.permissions == ["dashboards.view"]

    def test_frozen_immutability(self):
        from app.platform.auth.identity import Identity

        identity = Identity(user_id="u1", email="a@b.com", tenant_id="t1")
        with pytest.raises(AttributeError):
            identity.user_id = "u2"

    def test_defaults(self):
        from app.platform.auth.identity import Identity

        identity = Identity(user_id="u1", email="a@b.com", tenant_id="t1")
        assert identity.roles == []
        assert identity.permissions == []

    def test_is_super_admin_true(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["super_admin"],
        )
        assert identity.is_super_admin is True

    def test_is_super_admin_false(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["tenant_admin"],
        )
        assert identity.is_super_admin is False

    def test_is_tenant_admin_true(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["tenant_admin"],
        )
        assert identity.is_tenant_admin is True

    def test_is_tenant_admin_false(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["viewer"],
        )
        assert identity.is_tenant_admin is False

    def test_has_role_exact_match(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["data_engineer"],
        )
        assert identity.has_role("data_engineer") is True
        assert identity.has_role("analyst") is False

    def test_has_role_super_admin_bypass(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["super_admin"],
        )
        # Super admin should pass any role check
        assert identity.has_role("viewer") is True
        assert identity.has_role("nonexistent_role") is True

    def test_has_role_deprecated_name(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["tenant_admin"],
        )
        # "admin" normalizes to "tenant_admin" via DEPRECATED_ROLE_MAPPINGS
        assert identity.has_role("admin") is True

    def test_has_permission_exact(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["dashboards.view", "dashboards.create"],
        )
        assert identity.has_permission("dashboards.view") is True
        assert identity.has_permission("dashboards.delete") is False

    def test_has_permission_wildcard(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["*"],
        )
        assert identity.has_permission("anything") is True

    def test_has_permission_super_admin_bypass(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["super_admin"],
            permissions=[],
        )
        assert identity.has_permission("dashboards.delete") is True

    def test_has_permission_colon_normalized(self):
        from app.platform.auth.identity import Identity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            permissions=["dashboards.create"],
        )
        # Colon notation should be normalized to dot notation
        assert identity.has_permission("dashboards:create") is True

    def test_implements_iidentity_protocol(self):
        from app.platform.auth.identity import Identity
        from app.platform.auth.interfaces import IIdentity

        identity = Identity(
            user_id="u1", email="a@b.com", tenant_id="t1",
            roles=["viewer"], permissions=["dashboards.view"],
        )
        assert isinstance(identity, IIdentity)


class TestGetCurrentIdentity:
    """Test get_current_identity() function."""

    def test_returns_identity_when_authenticated(self, app):
        from app.platform.auth.identity import get_current_identity

        with app.app_context():
            g.current_user_id = "user-123"
            g.user_email = "test@example.com"
            g.tenant_id = "tenant-456"
            g.user_roles = ["analyst"]
            g.user_permissions = ["dashboards.view"]

            identity = get_current_identity()

            assert identity is not None
            assert identity.user_id == "user-123"
            assert identity.email == "test@example.com"
            assert identity.tenant_id == "tenant-456"
            assert identity.roles == ["analyst"]
            assert identity.permissions == ["dashboards.view"]

    def test_returns_none_when_unauthenticated(self, app):
        from app.platform.auth.identity import get_current_identity

        with app.app_context():
            # No attributes set on g
            identity = get_current_identity()
            assert identity is None

    def test_uses_legacy_user_id_attribute(self, app):
        from app.platform.auth.identity import get_current_identity

        with app.app_context():
            g.user_id = "legacy-id"
            g.user_email = "legacy@test.com"
            g.tenant_id = "t1"

            identity = get_current_identity()
            assert identity is not None
            assert identity.user_id == "legacy-id"

    def test_handles_none_values_gracefully(self, app):
        from app.platform.auth.identity import get_current_identity

        with app.app_context():
            g.current_user_id = "u1"
            g.user_email = None
            g.tenant_id = None
            g.user_roles = None
            g.user_permissions = None

            identity = get_current_identity()
            assert identity is not None
            assert identity.email == ""
            assert identity.tenant_id == ""
            assert identity.roles == []
            assert identity.permissions == []


class TestRequireIdentity:
    """Test require_identity() function."""

    def test_returns_identity_when_authenticated(self, app):
        from app.platform.auth.identity import require_identity

        with app.app_context():
            g.current_user_id = "u1"
            g.user_email = "test@x.com"
            g.tenant_id = "t1"
            g.user_roles = []
            g.user_permissions = []

            identity = require_identity()
            assert identity.user_id == "u1"

    def test_raises_when_unauthenticated(self, app):
        from app.platform.auth.identity import require_identity
        from app.errors import AuthenticationError

        with app.app_context():
            with pytest.raises(AuthenticationError):
                require_identity()
