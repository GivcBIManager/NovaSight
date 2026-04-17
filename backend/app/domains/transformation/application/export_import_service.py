"""
Export / Import Service for Visual Models.

Exports visual models as a portable JSON package and re-imports
them into the same or a different tenant.
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.extensions import db
from app.domains.transformation.domain.visual_models import VisualModel
from app.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

EXPORT_FORMAT_VERSION = "1.0"


@dataclass
class ImportItemResult:
    model_name: str
    success: bool
    id: str = ""
    error: str = ""


@dataclass
class ImportResult:
    imported: int = 0
    skipped: int = 0
    failed: int = 0
    results: List[ImportItemResult] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imported": self.imported,
            "skipped": self.skipped,
            "failed": self.failed,
            "results": [
                {"model_name": r.model_name, "success": r.success, "id": r.id, "error": r.error}
                for r in self.results
            ],
        }


class ExportImportService:
    """Handles export and import of visual models."""

    def export_models(
        self,
        tenant_id: str,
        model_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Export visual models as a JSON-serializable package.

        If model_ids is None, exports all non-deleted models for the tenant.
        """
        query = VisualModel.for_tenant(tenant_id).filter_by(is_deleted=False)
        if model_ids:
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            query = query.filter(VisualModel.id.in_(model_ids))

        models = query.order_by(VisualModel.model_name).all()
        if not models:
            raise NotFoundError("No models found to export")

        package = {
            "format_version": EXPORT_FORMAT_VERSION,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "model_count": len(models),
            "models": [],
        }

        for m in models:
            package["models"].append({
                "model_name": m.model_name,
                "model_path": m.model_path,
                "model_layer": m.model_layer,
                "canvas_position": m.canvas_position,
                "visual_config": m.visual_config,
                "generated_sql": m.generated_sql,
                "generated_yaml": m.generated_yaml,
                "materialization": m.materialization,
                "tags": m.tags or [],
                "description": m.description or "",
            })

        logger.info(
            "Exported %d visual models for tenant %s",
            len(models), tenant_id,
        )
        return package

    def import_models(
        self,
        tenant_id: str,
        package: Dict[str, Any],
        on_conflict: str = "skip",
    ) -> ImportResult:
        """
        Import visual models from an exported package.

        on_conflict: "skip" (default) skips existing names, "overwrite" replaces them.
        """
        fmt = package.get("format_version")
        if fmt != EXPORT_FORMAT_VERSION:
            raise ValidationError(
                f"Unsupported format version: {fmt}. Expected {EXPORT_FORMAT_VERSION}"
            )

        if on_conflict not in ("skip", "overwrite"):
            raise ValidationError("on_conflict must be 'skip' or 'overwrite'")

        items = package.get("models", [])
        if not items:
            raise ValidationError("Package contains no models")
        if len(items) > 200:
            raise ValidationError("Maximum 200 models per import")

        result = ImportResult()

        for item in items:
            name = item.get("model_name", "unknown")
            try:
                existing = (
                    VisualModel.for_tenant(tenant_id)
                    .filter_by(model_name=name, is_deleted=False)
                    .first()
                )

                if existing and on_conflict == "skip":
                    result.skipped += 1
                    result.results.append(
                        ImportItemResult(model_name=name, success=True, id=str(existing.id), error="skipped-existing")
                    )
                    continue

                if existing and on_conflict == "overwrite":
                    existing.model_path = item.get("model_path", existing.model_path)
                    existing.model_layer = item.get("model_layer", existing.model_layer)
                    existing.canvas_position = item.get("canvas_position", existing.canvas_position)
                    existing.visual_config = item.get("visual_config", existing.visual_config)
                    existing.generated_sql = item.get("generated_sql")
                    existing.generated_yaml = item.get("generated_yaml")
                    existing.materialization = item.get("materialization", "view")
                    existing.tags = item.get("tags", [])
                    existing.description = item.get("description", "")
                    existing.version += 1
                    db.session.commit()
                    result.imported += 1
                    result.results.append(
                        ImportItemResult(model_name=name, success=True, id=str(existing.id))
                    )
                    continue

                # Create new model
                model = VisualModel(
                    tenant_id=tenant_id,
                    model_name=name,
                    model_path=item.get("model_path", f"models/{name}.sql"),
                    model_layer=item.get("model_layer", "staging"),
                    canvas_position=item.get("canvas_position", {"x": 0, "y": 0}),
                    visual_config=item.get("visual_config", {}),
                    generated_sql=item.get("generated_sql"),
                    generated_yaml=item.get("generated_yaml"),
                    materialization=item.get("materialization", "view"),
                    tags=item.get("tags", []),
                    description=item.get("description", ""),
                )
                db.session.add(model)
                db.session.commit()
                result.imported += 1
                result.results.append(
                    ImportItemResult(model_name=name, success=True, id=str(model.id))
                )

            except Exception as exc:
                db.session.rollback()
                result.failed += 1
                result.results.append(
                    ImportItemResult(model_name=name, success=False, error=str(exc))
                )
                logger.warning("Import failed for %s: %s", name, exc)

        logger.info(
            "Import complete for tenant %s: %d imported, %d skipped, %d failed",
            tenant_id, result.imported, result.skipped, result.failed,
        )
        return result


def get_export_import_service() -> ExportImportService:
    """Factory for ExportImportService."""
    return ExportImportService()
