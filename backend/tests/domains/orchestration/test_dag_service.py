"""
Tests for app.domains.orchestration — DagService
====================================================

Covers the canonical domain location for DAG management.
"""

import pytest


class TestDagServiceImport:
    """Verify DagService is importable from canonical location."""

    def test_import_from_domain(self):
        from app.domains.orchestration.application.dag_service import DagService
        assert DagService is not None

    def test_has_expected_methods(self):
        from app.domains.orchestration.application.dag_service import DagService

        expected_methods = [
            "create_dag",
            "get_dag",
            "update_dag",
            "delete_dag",
            "list_dags",
            "deploy_dag",
        ]
        for method in expected_methods:
            assert hasattr(DagService, method), f"Missing: {method}"
