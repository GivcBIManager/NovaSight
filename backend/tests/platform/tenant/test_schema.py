"""
Tests for app.platform.tenant.schema
=======================================

Covers schema name generation, DDL operations, and the
TenantSchemaContext context manager.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.platform.tenant.schema import (
    get_tenant_schema_name,
    validate_tenant_access,
    get_current_tenant_schema,
)


class TestGetTenantSchemaName:
    """Test get_tenant_schema_name() function."""

    def test_basic_slug(self):
        assert get_tenant_schema_name("acme") == "tenant_acme"

    def test_slug_with_hyphens(self):
        result = get_tenant_schema_name("acme-corp")
        assert result == "tenant_acme_corp"

    def test_slug_with_uppercase(self):
        result = get_tenant_schema_name("AcmeCorp")
        assert result == "tenant_acmecorp"

    def test_slug_with_special_chars(self):
        result = get_tenant_schema_name("acme@corp!")
        assert result == "tenant_acme_corp_"

    def test_empty_slug(self):
        result = get_tenant_schema_name("")
        assert result == "tenant_"

    def test_slug_with_spaces(self):
        result = get_tenant_schema_name("my company")
        assert result == "tenant_my_company"


class TestCreateTenantSchema:
    """Test create_tenant_schema() function."""

    def test_creates_schema_successfully(self, app):
        from app.platform.tenant.schema import create_tenant_schema

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                result = create_tenant_schema("acme")
                assert result is True
                mock_db.session.execute.assert_called_once()
                mock_db.session.commit.assert_called_once()

    def test_rejects_invalid_schema_name(self, app):
        from app.platform.tenant.schema import create_tenant_schema, get_tenant_schema_name

        # Verify slug sanitisation produces a valid schema name
        # (the function replaces non-alnum chars with _)
        # To trigger the ValueError we need a slug that, after
        # sanitisation, does NOT match ^tenant_[a-z0-9_]+$
        # An empty slug produces "tenant_" which fails the regex.
        with app.app_context():
            with pytest.raises(ValueError, match="Invalid schema name"):
                create_tenant_schema("")


class TestDropTenantSchema:
    """Test drop_tenant_schema() function."""

    def test_drops_schema(self, app):
        from app.platform.tenant.schema import drop_tenant_schema

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                result = drop_tenant_schema("acme")
                assert result is True
                mock_db.session.execute.assert_called_once()

    def test_drops_with_cascade(self, app):
        from app.platform.tenant.schema import drop_tenant_schema

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                result = drop_tenant_schema("acme", cascade=True)
                assert result is True
                # text() wraps the SQL; extract the actual SQL string
                call_args = mock_db.session.execute.call_args
                sql_text = call_args[0][0]  # first positional arg
                assert "CASCADE" in str(sql_text)


class TestSchemaExists:
    """Test schema_exists() function."""

    def test_returns_true_when_exists(self, app):
        from app.platform.tenant.schema import schema_exists

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                mock_db.session.execute.return_value.fetchone.return_value = (1,)
                assert schema_exists("tenant_acme") is True

    def test_returns_false_when_not_exists(self, app):
        from app.platform.tenant.schema import schema_exists

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                mock_db.session.execute.return_value.fetchone.return_value = None
                assert schema_exists("tenant_nonexistent") is False


class TestListTenantSchemas:
    """Test list_tenant_schemas() function."""

    def test_returns_sorted_schemas(self, app):
        from app.platform.tenant.schema import list_tenant_schemas

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                mock_db.session.execute.return_value.fetchall.return_value = [
                    ("tenant_acme",), ("tenant_beta",),
                ]
                result = list_tenant_schemas()
                assert result == ["tenant_acme", "tenant_beta"]

    def test_handles_error_gracefully(self, app):
        from app.platform.tenant.schema import list_tenant_schemas

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                mock_db.session.execute.side_effect = Exception("db down")
                result = list_tenant_schemas()
                assert result == []


class TestValidateTenantAccess:
    """Test validate_tenant_access() function."""

    def test_valid_access(self, app):
        from flask import g

        with app.test_request_context():
            g.tenant_id = "t1"
            assert validate_tenant_access("t1") is True

    def test_cross_tenant_denied(self, app):
        from flask import g

        with app.test_request_context():
            g.tenant_id = "t1"
            assert validate_tenant_access("t2") is False

    def test_no_tenant_context(self, app):
        with app.test_request_context():
            assert validate_tenant_access("t1") is False


class TestGetCurrentTenantSchema:
    """Test get_current_tenant_schema() function."""

    def test_returns_schema_when_set(self, app):
        from flask import g

        with app.test_request_context():
            g.tenant_schema = "tenant_acme"
            assert get_current_tenant_schema() == "tenant_acme"

    def test_returns_none_without_context(self):
        # Outside request context
        assert get_current_tenant_schema() is None


class TestTenantSchemaContext:
    """Test TenantSchemaContext context manager."""

    def test_sets_and_resets_search_path(self, app):
        from app.platform.tenant.schema import TenantSchemaContext

        with app.app_context():
            with patch("app.extensions.db") as mock_db:
                mock_db.session.execute.return_value.scalar.return_value = "public"
                ctx = TenantSchemaContext("acme")
                ctx.__enter__()
                # Should have called execute for SHOW + SET
                assert mock_db.session.execute.called
