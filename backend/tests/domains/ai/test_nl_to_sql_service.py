"""
Tests for app.domains.ai — NLToSQLService
=============================================

Covers the canonical domain location for AI services.
"""

import pytest


class TestNLToSQLServiceImport:
    """Verify NLToSQLService is importable from canonical location."""

    def test_import_from_domain(self):
        from app.domains.ai.application.nl_to_sql import NLToSQLService
        assert NLToSQLService is not None

    def test_has_expected_methods(self):
        from app.domains.ai.application.nl_to_sql import NLToSQLService

        expected_methods = [
            "convert",
            "suggest_queries",
        ]
        for method in expected_methods:
            assert hasattr(NLToSQLService, method), f"Missing: {method}"
