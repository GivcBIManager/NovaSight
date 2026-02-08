"""
Tests for app.domains.analytics — DashboardService
=====================================================

Covers the canonical domain location for dashboard management.
"""

import pytest


class TestDashboardServiceImport:
    """Verify DashboardService is importable from canonical location."""

    def test_import_from_domain(self):
        from app.domains.analytics.application.dashboard_service import DashboardService
        assert DashboardService is not None

    def test_has_expected_methods(self):
        from app.domains.analytics.application.dashboard_service import DashboardService

        expected_methods = [
            "create",
            "get",
            "update",
            "delete",
            "list_for_user",
            "add_widget",
            "update_widget",
            "delete_widget",
            "share",
            "clone",
        ]
        for method in expected_methods:
            assert hasattr(DashboardService, method), f"Missing: {method}"
