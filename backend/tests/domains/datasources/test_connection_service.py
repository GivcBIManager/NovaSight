"""
Tests for app.domains.datasources — ConnectionService
========================================================

Covers the canonical domain location and interface compliance.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.domains.datasources.domain.interfaces import IConnectionProvider, ISchemaProvider


class TestConnectionServiceImport:
    """Verify ConnectionService is importable and implements interfaces."""

    def test_import_from_domain(self):
        from app.domains.datasources.application.connection_service import ConnectionService
        assert ConnectionService is not None

    def test_implements_iconnection_provider(self):
        from app.domains.datasources.application.connection_service import ConnectionService
        assert issubclass(ConnectionService, IConnectionProvider)

    def test_implements_ischema_provider(self):
        from app.domains.datasources.application.connection_service import ConnectionService
        assert issubclass(ConnectionService, ISchemaProvider)

    def test_has_required_interface_methods(self):
        from app.domains.datasources.application.connection_service import ConnectionService

        interface_methods = [
            "get_connection", "list_connections", "test_connection",
            "get_schema", "get_tables", "get_columns",
        ]
        for method in interface_methods:
            assert hasattr(ConnectionService, method), f"Missing: {method}"
