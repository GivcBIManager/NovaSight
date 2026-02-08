"""
Tests for app.platform.tenant.resolver
=========================================

Covers TenantResolver(ITenantResolver) and
TenantSchemaManager(ITenantSchemaManager) concrete implementations.
"""

import pytest
from unittest.mock import patch, MagicMock
from flask import g

from app.platform.tenant.resolver import (
    TenantResolver,
    TenantSchemaManager,
    tenant_resolver,
    tenant_schema_manager,
)
from app.platform.tenant.interfaces import ITenantResolver, ITenantSchemaManager


class TestTenantResolverInterface:
    """Verify TenantResolver implements ITenantResolver."""

    def test_is_itenant_resolver_subclass(self):
        assert issubclass(TenantResolver, ITenantResolver)

    def test_singleton_available(self):
        assert isinstance(tenant_resolver, TenantResolver)


class TestTenantResolverGetCurrentTenantId:
    """Test TenantResolver.get_current_tenant_id()."""

    def test_returns_tenant_id_from_g(self, app):
        resolver = TenantResolver()
        with app.test_request_context():
            g.tenant_id = "t-123"
            assert resolver.get_current_tenant_id() == "t-123"

    def test_returns_none_when_not_set(self, app):
        resolver = TenantResolver()
        with app.test_request_context():
            assert resolver.get_current_tenant_id() is None


class TestTenantResolverGetCurrentTenant:
    """Test TenantResolver.get_current_tenant()."""

    def test_returns_tenant_from_g(self, app):
        resolver = TenantResolver()
        mock_tenant = MagicMock()
        with app.test_request_context():
            g.tenant = mock_tenant
            assert resolver.get_current_tenant() is mock_tenant

    def test_returns_none_when_not_set(self, app):
        resolver = TenantResolver()
        with app.test_request_context():
            assert resolver.get_current_tenant() is None


class TestTenantResolverRequireTenantId:
    """Test TenantResolver.require_tenant_id()."""

    def test_returns_id_when_present(self, app):
        resolver = TenantResolver()
        with app.test_request_context():
            g.tenant_id = "t-42"
            assert resolver.require_tenant_id() == "t-42"

    def test_aborts_when_missing(self, app):
        resolver = TenantResolver()
        with app.test_request_context():
            with pytest.raises(Exception):  # abort(401)
                resolver.require_tenant_id()


class TestTenantSchemaManagerInterface:
    """Verify TenantSchemaManager implements ITenantSchemaManager."""

    def test_is_itenant_schema_manager_subclass(self):
        assert issubclass(TenantSchemaManager, ITenantSchemaManager)

    def test_singleton_available(self):
        assert isinstance(tenant_schema_manager, TenantSchemaManager)


class TestTenantSchemaManagerGetSchemaName:
    """Test TenantSchemaManager.get_schema_name()."""

    def test_delegates_to_schema_module(self):
        mgr = TenantSchemaManager()
        result = mgr.get_schema_name("acme-corp")
        assert result == "tenant_acme_corp"


class TestTenantSchemaManagerCreateSchema:
    """Test TenantSchemaManager.create_schema()."""

    def test_creates_schema(self, app):
        mgr = TenantSchemaManager()
        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                result = mgr.create_schema("acme")
                assert result is True
                mock_db.session.execute.assert_called_once()


class TestTenantSchemaManagerDropSchema:
    """Test TenantSchemaManager.drop_schema()."""

    def test_drops_schema(self, app):
        mgr = TenantSchemaManager()
        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                result = mgr.drop_schema("acme")
                assert result is True


class TestTenantSchemaManagerSchemaExists:
    """Test TenantSchemaManager.schema_exists()."""

    def test_returns_true_when_exists(self, app):
        mgr = TenantSchemaManager()
        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                mock_db.session.execute.return_value.fetchone.return_value = (1,)
                assert mgr.schema_exists("tenant_acme") is True


class TestTenantSchemaManagerListSchemas:
    """Test TenantSchemaManager.list_schemas()."""

    def test_returns_schemas(self, app):
        mgr = TenantSchemaManager()
        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                mock_db.session.execute.return_value.fetchall.return_value = [
                    ("tenant_a",), ("tenant_b",),
                ]
                result = mgr.list_schemas()
                assert result == ["tenant_a", "tenant_b"]
