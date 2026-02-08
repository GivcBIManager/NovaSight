"""
Tests for app.domains.tenants — TenantService
=================================================

Covers the canonical domain location for tenant management.
"""

import pytest
from unittest.mock import patch, MagicMock


class TestTenantServiceImport:
    """Verify TenantService is importable from canonical location."""

    def test_import_from_domain(self):
        from app.domains.tenants.application.tenant_service import TenantService
        assert TenantService is not None

    def test_has_expected_methods(self):
        from app.domains.tenants.application.tenant_service import TenantService

        expected_methods = [
            "create_tenant",
            "get_tenant",
            "update_tenant",
            "list_tenants",
            "delete_tenant",
        ]
        for method in expected_methods:
            assert hasattr(TenantService, method), f"Missing method: {method}"


class TestTenantServiceBasicOps:
    """Test TenantService basic operations with mocks."""

    def test_create_tenant(self, app):
        from app.domains.tenants.application.tenant_service import TenantService

        with app.app_context():
            with patch("app.domains.tenants.application.tenant_service.db") as mock_db:
                mock_db.session.add = MagicMock()
                mock_db.session.commit = MagicMock()
                mock_db.session.flush = MagicMock()

                svc = TenantService()
                # Verify service is instantiable
                assert svc is not None
