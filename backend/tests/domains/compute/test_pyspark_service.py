"""
Tests for app.domains.compute — PySparkAppService
=====================================================

Covers the canonical domain location for compute management.
"""

import pytest


class TestPySparkAppServiceImport:
    """Verify PySparkAppService is importable from canonical location."""

    def test_import_from_domain(self):
        from app.domains.compute.application.pyspark_app_service import PySparkAppService
        assert PySparkAppService is not None

    def test_has_expected_methods(self):
        from app.domains.compute.application.pyspark_app_service import PySparkAppService

        expected_methods = [
            "create_app",
            "get_app",
            "update_app",
            "delete_app",
            "list_apps",
            "generate_code",
        ]
        for method in expected_methods:
            assert hasattr(PySparkAppService, method), f"Missing: {method}"
