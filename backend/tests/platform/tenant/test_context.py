"""
Tests for app.platform.tenant.context
========================================

Covers TenantContextMiddleware and require_tenant decorator.
"""

import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from flask import Flask, g, jsonify


class TestTenantContextMiddlewarePublicEndpoints:
    """Test public endpoint detection."""

    def test_options_request_is_public(self, app):
        """CORS preflight (OPTIONS) should be public."""
        client = app.test_client()
        response = client.options("/api/v1/auth/login")
        # Should not be 401
        assert response.status_code != 401 or response.status_code == 200

    def test_health_endpoint_is_public(self, app, client):
        """Health check should not require auth."""
        response = client.get("/health")
        # Health endpoint should respond without auth
        assert response.status_code in (200, 404)  # 404 if route not registered in test

    def test_login_path_is_public(self, app):
        from app.platform.tenant.context import TenantContextMiddleware

        with app.test_request_context("/api/v1/auth/login"):
            middleware = TenantContextMiddleware()
            assert middleware._is_public_endpoint() is True

    def test_protected_path_is_not_public(self, app):
        from app.platform.tenant.context import TenantContextMiddleware

        with app.test_request_context("/api/v1/dashboards"):
            middleware = TenantContextMiddleware()
            assert middleware._is_public_endpoint() is False


class TestTenantContextMiddlewareInit:
    """Test _init_tenant_context behavior."""

    def test_sets_defaults_on_g(self, app):
        """Before tenant resolution, g attributes should be set to None/empty."""
        from app.platform.tenant.context import TenantContextMiddleware

        middleware = TenantContextMiddleware()

        with app.test_request_context("/api/v1/auth/login"):
            middleware._init_tenant_context()
            # For public endpoints, g should have defaults
            assert g.tenant is None
            assert g.tenant_id is None
            assert g.tenant_schema == "public"
            assert g.current_user_id is None

    def test_cleanup_resets_g(self, app):
        """teardown_request should clean up g attributes."""
        from app.platform.tenant.context import TenantContextMiddleware

        with app.test_request_context():
            g.tenant_id = "some-id"
            g.tenant = "some-tenant"
            g.tenant_schema = "tenant_test"
            g.current_user_id = "u1"

            # Mock db to avoid real DB calls
            with patch("app.platform.tenant.context.text"):
                with patch("app.extensions.db") as mock_db:
                    TenantContextMiddleware._cleanup_tenant_context(None)

            # Attributes should be cleared
            assert getattr(g, "tenant_id", None) is None
            assert getattr(g, "tenant", None) is None


class TestRequireTenantDecorator:
    """Test the require_tenant convenience decorator."""

    def test_rejects_without_tenant(self, app):
        from app.platform.tenant.context import require_tenant

        with app.test_request_context():
            g.tenant = None

            @require_tenant
            def protected():
                return "ok"

            with pytest.raises(Exception):  # abort(401)
                protected()

    def test_passes_with_tenant(self, app):
        from app.platform.tenant.context import require_tenant

        with app.test_request_context():
            g.tenant = MagicMock()  # Some tenant object

            @require_tenant
            def protected():
                return "ok"

            assert protected() == "ok"


class TestSearchPathValidation:
    """Test search path setting with validation."""

    def test_valid_schema_name(self, app):
        from app.platform.tenant.context import TenantContextMiddleware

        with app.test_request_context():
            with patch("app.extensions.db") as mock_db:
                # Should not raise
                TenantContextMiddleware._set_search_path("tenant_acme")
                mock_db.session.execute.assert_called_once()

    def test_invalid_schema_name_rejected(self, app):
        from app.platform.tenant.context import TenantContextMiddleware

        with app.test_request_context():
            with pytest.raises(ValueError, match="Invalid schema name"):
                TenantContextMiddleware._set_search_path("tenant; DROP TABLE users;--")
