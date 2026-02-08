"""
NovaSight Transformation Domain — Interfaces
===============================================

Abstract contracts for semantic-layer capabilities consumed by
other domains (analytics, AI, etc.).

These interfaces live in the **domain layer** so that external
domains can depend on them without reaching into the transformation
application or infrastructure layers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional


# ── Semantic layer provider ──────────────────────────────────────


class ISemanticLayerProvider(ABC):
    """
    Provides read-access to the semantic layer for external domains.

    The analytics domain uses this to execute semantic queries from
    dashboards.  The AI domain uses this to resolve natural-language
    queries into dimension/measure references.
    """

    @abstractmethod
    def get_model(
        self,
        model_id: str,
        tenant_id: str,
    ) -> Optional[Any]:
        """
        Return a ``SemanticModel`` by ID within *tenant_id*, or ``None``.
        """
        ...

    @abstractmethod
    def get_model_by_name(
        self,
        name: str,
        tenant_id: str,
    ) -> Optional[Any]:
        """
        Return a ``SemanticModel`` by name within *tenant_id*, or ``None``.
        """
        ...

    @abstractmethod
    def list_models(
        self,
        tenant_id: str,
        page: int = 1,
        per_page: int = 20,
    ) -> Dict[str, Any]:
        """
        Return a paginated dict of semantic models for *tenant_id*.
        """
        ...

    @abstractmethod
    def list_dimensions(
        self,
        tenant_id: str,
        model_id: Optional[str] = None,
    ) -> List[Any]:
        """
        Return dimensions for *tenant_id*, optionally filtered by model.
        """
        ...

    @abstractmethod
    def list_measures(
        self,
        tenant_id: str,
        model_id: Optional[str] = None,
    ) -> List[Any]:
        """
        Return measures for *tenant_id*, optionally filtered by model.
        """
        ...

    @abstractmethod
    def execute_query(
        self,
        tenant_id: str,
        dimensions: List[str],
        measures: List[str],
        filters: Optional[List[Dict]] = None,
        order_by: Optional[List[Dict]] = None,
        limit: int = 1000,
        offset: int = 0,
        time_dimension: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute a semantic query and return results.

        This is the primary cross-domain method consumed by the
        analytics dashboard and the AI assistant.
        """
        ...
