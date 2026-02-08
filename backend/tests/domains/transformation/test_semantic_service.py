"""
Tests for app.domains.transformation — SemanticService
=========================================================

Covers the canonical domain location and interface compliance.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.domains.transformation.domain.interfaces import ISemanticLayerProvider


class TestSemanticServiceImport:
    """Verify SemanticService is importable and implements interface."""

    def test_import_from_domain(self):
        from app.domains.transformation.application.semantic_service import SemanticService
        assert SemanticService is not None

    def test_implements_isemantic_layer_provider(self):
        from app.domains.transformation.application.semantic_service import SemanticService
        assert issubclass(SemanticService, ISemanticLayerProvider)

    def test_has_required_interface_methods(self):
        from app.domains.transformation.application.semantic_service import SemanticService

        interface_methods = [
            "get_model", "get_model_by_name", "list_models",
            "list_dimensions", "list_measures", "execute_query",
        ]
        for method in interface_methods:
            assert hasattr(SemanticService, method), f"Missing: {method}"
