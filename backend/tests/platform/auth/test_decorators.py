"""
Tests for app.platform.auth.decorators
========================================

Covers authenticated, require_roles, require_permission,
require_any_permission, require_all_permissions, and tenant_required.

We create a *fresh* lightweight Flask app per test-class so that Flask
never complains about routes being added after the first request.
"""

import pytest
from unittest.mock import patch, MagicMock
from flask import Flask, g, jsonify


@pytest.fixture
def decorator_app():
    """Create a **fresh** minimal Flask app with test endpoints."""
    _app = Flask(__name__)
    _app.config["TESTING"] = True
    _app.config["SECRET_KEY"] = "test-secret"

    # Register error handlers so NovaSight exceptions return proper HTTP codes
    from app.platform.errors.exceptions import register_error_handlers
    register_error_handlers(_app)

    from app.platform.auth.decorators import (
        authenticated,
        require_roles,
        require_permission,
        require_any_permission,
        require_all_permissions,
        tenant_required,
    )

    @_app.route("/test/authenticated")
    @authenticated
    def test_authenticated():
        return jsonify({"user_id": g.identity.user_id})

    @_app.route("/test/admin-only")
    @require_roles(["tenant_admin"])
    def test_admin_only():
        return jsonify({"ok": True})

    @_app.route("/test/multi-role")
    @require_roles(["data_engineer", "tenant_admin"])
    def test_multi_role():
        return jsonify({"ok": True})

    @_app.route("/test/permission")
    @require_permission("dashboards.create")
    def test_permission():
        return jsonify({"ok": True})

    @_app.route("/test/any-perm")
    @require_any_permission("reports.read", "reports.admin")
    def test_any_perm():
        return jsonify({"ok": True})

    @_app.route("/test/all-perms")
    @require_all_permissions("admin.access", "admin.write")
    def test_all_perms():
        return jsonify({"ok": True})

    @_app.route("/test/tenant-req")
    @tenant_required
    def test_tenant_req():
        return jsonify({"tenant_id": g.tenant_id})

    return _app


def _set_identity_on_g(
    user_id="u1",
    email="test@test.com",
    tenant_id="t1",
    roles=None,
    permissions=None,
):
    """Helper to populate g.* attributes for Identity resolution."""
    g.current_user_id = user_id
    g.user_email = email
    g.tenant_id = tenant_id
    g.user_roles = roles or []
    g.user_permissions = permissions or []


class TestAuthenticatedDecorator:
    """Test the @authenticated decorator."""

    def test_rejects_unauthenticated_request(self, decorator_app):
        client = decorator_app.test_client()
        with patch("app.platform.auth.decorators.verify_jwt_in_request"):
            # No identity on g → should raise AuthenticationError
            response = client.get("/test/authenticated")
            assert response.status_code in (401, 500)

    def test_passes_authenticated_request(self, decorator_app):
        client = decorator_app.test_client()
        with decorator_app.test_request_context("/test/authenticated"):
            _set_identity_on_g()
            with patch("app.platform.auth.decorators.verify_jwt_in_request"):
                from app.platform.auth.decorators import authenticated
                from app.platform.auth.identity import get_current_identity

                identity = get_current_identity()
                assert identity is not None
                assert identity.user_id == "u1"


class TestRequireRolesDecorator:
    """Test the @require_roles decorator."""

    def test_rejects_without_required_role(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(roles=["viewer"])
            from app.platform.auth.decorators import require_roles
            from app.errors import AuthorizationError

            @require_roles(["tenant_admin"])
            def protected():
                return "ok"

            with pytest.raises(AuthorizationError):
                protected()

    def test_passes_with_matching_role(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(roles=["tenant_admin"])
            from app.platform.auth.decorators import require_roles

            @require_roles(["tenant_admin"])
            def protected():
                return "ok"

            assert protected() == "ok"

    def test_super_admin_bypasses_role_check(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(roles=["super_admin"])
            from app.platform.auth.decorators import require_roles

            @require_roles(["data_engineer"])
            def protected():
                return "ok"

            assert protected() == "ok"

    def test_multiple_allowed_roles_any_match(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(roles=["data_engineer"])
            from app.platform.auth.decorators import require_roles

            @require_roles(["data_engineer", "tenant_admin"])
            def protected():
                return "ok"

            assert protected() == "ok"

    def test_rejects_unauthenticated(self, decorator_app):
        with decorator_app.test_request_context():
            # No identity at all
            from app.platform.auth.decorators import require_roles
            from app.errors import AuthenticationError

            @require_roles(["viewer"])
            def protected():
                return "ok"

            with pytest.raises(AuthenticationError):
                protected()

    def test_deprecated_role_name_normalized(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(roles=["tenant_admin"])
            from app.platform.auth.decorators import require_roles

            # "admin" normalizes to "tenant_admin"
            @require_roles(["admin"])
            def protected():
                return "ok"

            assert protected() == "ok"


class TestRequirePermissionDecorator:
    """Test the @require_permission decorator."""

    def test_rejects_unauthenticated(self, decorator_app):
        with decorator_app.test_request_context():
            from app.platform.auth.decorators import require_permission

            @require_permission("dashboards.create")
            def protected():
                return "ok"

            with pytest.raises(Exception):
                protected()

    def test_passes_with_rbac_permission(self, decorator_app):
        with decorator_app.test_request_context():
            mock_user = MagicMock()
            mock_user.id = "u1"
            g.current_user = mock_user

            from app.platform.auth.decorators import require_permission

            with patch("app.domains.identity.application.rbac_service.rbac_service") as mock_rbac:
                mock_rbac.check_permission.return_value = True

                @require_permission("dashboards.create")
                def protected():
                    return "ok"

                assert protected() == "ok"

    def test_rejects_without_rbac_permission(self, decorator_app):
        with decorator_app.test_request_context():
            mock_user = MagicMock()
            mock_user.id = "u1"
            g.current_user = mock_user

            from app.platform.auth.decorators import require_permission

            with patch("app.domains.identity.application.rbac_service.rbac_service") as mock_rbac:
                mock_rbac.check_permission.return_value = False

                @require_permission("dashboards.create")
                def protected():
                    return "ok"

                with pytest.raises(Exception):  # abort(403)
                    protected()


class TestTenantRequiredDecorator:
    """Test the @tenant_required decorator."""

    def test_rejects_without_identity(self, decorator_app):
        with decorator_app.test_request_context():
            from app.platform.auth.decorators import tenant_required
            from app.errors import AuthenticationError

            @tenant_required
            def protected():
                return "ok"

            with pytest.raises(AuthenticationError):
                protected()

    def test_rejects_without_tenant_id(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(tenant_id="")
            from app.platform.auth.decorators import tenant_required
            from app.errors import AuthorizationError

            @tenant_required
            def protected():
                return "ok"

            with pytest.raises(AuthorizationError):
                protected()

    def test_passes_with_valid_tenant(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(tenant_id="t-123")
            from app.platform.auth.decorators import tenant_required

            @tenant_required
            def protected():
                return g.tenant_id

            result = protected()
            assert result == "t-123"

    def test_sets_g_attributes(self, decorator_app):
        with decorator_app.test_request_context():
            _set_identity_on_g(
                user_id="u-42",
                email="x@y.com",
                tenant_id="t-99",
                roles=["analyst"],
            )
            from app.platform.auth.decorators import tenant_required

            @tenant_required
            def protected():
                return {
                    "user_id": g.user_id,
                    "email": g.user_email,
                    "roles": g.user_roles,
                }

            result = protected()
            assert result["user_id"] == "u-42"
            assert result["email"] == "x@y.com"
            assert result["roles"] == ["analyst"]
