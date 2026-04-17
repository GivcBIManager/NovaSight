"""
Bulk Operations Service for Visual Models.

Supports batch create and batch (soft) delete operations
with per-item error reporting.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.extensions import db
from app.domains.transformation.domain.visual_models import VisualModel
from app.domains.transformation.application.versioning_service import (
    VersioningService,
    get_versioning_service,
)
from app.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


@dataclass
class BulkItemResult:
    id: str
    success: bool
    error: str = ""


@dataclass
class BulkResult:
    succeeded: int = 0
    failed: int = 0
    results: List[BulkItemResult] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "succeeded": self.succeeded,
            "failed": self.failed,
            "results": [
                {"id": r.id, "success": r.success, "error": r.error}
                for r in self.results
            ],
        }


class BulkOperationsService:
    """Batch operations for visual models with per-item error handling."""

    def __init__(self):
        self._versioning: VersioningService = get_versioning_service()

    def bulk_delete(
        self,
        tenant_id: str,
        model_ids: List[str],
        deleted_by: str | None = None,
    ) -> BulkResult:
        """
        Soft-delete multiple visual models.

        Each deletion is attempted independently so a single
        failure does not block the rest.
        """
        if not model_ids:
            raise ValidationError("model_ids list is required")
        if len(model_ids) > 100:
            raise ValidationError("Maximum 100 models per bulk operation")

        result = BulkResult()
        for mid in model_ids:
            try:
                self._versioning.soft_delete(tenant_id, mid, deleted_by=deleted_by)
                result.succeeded += 1
                result.results.append(BulkItemResult(id=mid, success=True))
            except Exception as exc:
                db.session.rollback()
                result.failed += 1
                result.results.append(
                    BulkItemResult(id=mid, success=False, error=str(exc))
                )
                logger.warning("Bulk delete failed for %s: %s", mid, exc)

        return result

    def bulk_update_tags(
        self,
        tenant_id: str,
        model_ids: List[str],
        tags: List[str],
        mode: str = "replace",
    ) -> BulkResult:
        """
        Bulk update tags on multiple models.

        mode: "replace" (default) replaces tags, "append" merges.
        """
        if not model_ids:
            raise ValidationError("model_ids list is required")
        if len(model_ids) > 100:
            raise ValidationError("Maximum 100 models per bulk operation")
        if mode not in ("replace", "append"):
            raise ValidationError("mode must be 'replace' or 'append'")

        result = BulkResult()
        for mid in model_ids:
            try:
                model = VisualModel.get_for_tenant(mid, tenant_id)
                if not model:
                    raise NotFoundError(f"Visual model {mid} not found")
                if model.is_deleted:
                    raise ValidationError("Cannot update a deleted model")

                if mode == "replace":
                    model.tags = tags
                else:
                    existing = set(model.tags or [])
                    existing.update(tags)
                    model.tags = sorted(existing)

                model.version += 1
                db.session.commit()
                result.succeeded += 1
                result.results.append(BulkItemResult(id=mid, success=True))
            except Exception as exc:
                db.session.rollback()
                result.failed += 1
                result.results.append(
                    BulkItemResult(id=mid, success=False, error=str(exc))
                )
                logger.warning("Bulk tag update failed for %s: %s", mid, exc)

        return result


def get_bulk_operations_service() -> BulkOperationsService:
    """Factory for BulkOperationsService."""
    return BulkOperationsService()
