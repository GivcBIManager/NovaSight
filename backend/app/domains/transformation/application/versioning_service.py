"""
Versioning Service for Visual Models.

Provides optimistic locking, soft delete, and version history
for visual model resources.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from flask import g

from app.extensions import db
from app.domains.transformation.domain.visual_models import (
    VisualModel,
    VisualModelVersion,
)
from app.errors import ConflictError, NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class VersioningService:
    """Manages optimistic locking, soft delete, and version history."""

    # ── Optimistic Locking ────────────────────────────────────

    def update_with_lock(
        self,
        tenant_id: str,
        model_id: str,
        expected_version: int,
        updates: dict,
        changed_by: Optional[str] = None,
        change_summary: str = "",
    ) -> VisualModel:
        """
        Update a visual model only if the version matches (optimistic lock).

        Raises ConflictError if version mismatch.
        """
        model = VisualModel.get_for_tenant(model_id, tenant_id)
        if not model:
            raise NotFoundError(f"Visual model {model_id} not found")

        if model.is_deleted:
            raise ValidationError("Cannot update a deleted model")

        if model.version != expected_version:
            raise ConflictError(
                f"Version conflict: expected {expected_version}, "
                f"current is {model.version}. Reload and retry."
            )

        # Snapshot current state before updating
        self._create_version_snapshot(model, change_type="update", change_summary=change_summary, changed_by=changed_by)

        # Apply updates
        allowed_fields = {
            "model_name", "model_path", "model_layer", "canvas_position",
            "visual_config", "generated_sql", "generated_yaml",
            "materialization", "tags", "description",
        }
        for key, value in updates.items():
            if key in allowed_fields:
                setattr(model, key, value)

        model.version += 1
        db.session.commit()

        logger.info(
            "Updated visual model %s to version %d (tenant %s)",
            model_id, model.version, tenant_id,
        )
        return model

    # ── Soft Delete / Restore ─────────────────────────────────

    def soft_delete(
        self,
        tenant_id: str,
        model_id: str,
        deleted_by: Optional[str] = None,
    ) -> VisualModel:
        """Mark a visual model as deleted without removing the row."""
        model = VisualModel.get_for_tenant(model_id, tenant_id)
        if not model:
            raise NotFoundError(f"Visual model {model_id} not found")

        if model.is_deleted:
            raise ValidationError("Model is already deleted")

        self._create_version_snapshot(model, change_type="delete", change_summary="Soft-deleted", changed_by=deleted_by)

        model.is_deleted = True
        model.deleted_at = datetime.now(timezone.utc)
        model.version += 1
        db.session.commit()

        logger.info("Soft-deleted visual model %s (tenant %s)", model_id, tenant_id)
        return model

    def restore(
        self,
        tenant_id: str,
        model_id: str,
        restored_by: Optional[str] = None,
    ) -> VisualModel:
        """Restore a soft-deleted visual model."""
        model = VisualModel.get_for_tenant(model_id, tenant_id)
        if not model:
            raise NotFoundError(f"Visual model {model_id} not found")

        if not model.is_deleted:
            raise ValidationError("Model is not deleted")

        self._create_version_snapshot(model, change_type="restore", change_summary="Restored from soft-delete", changed_by=restored_by)

        model.is_deleted = False
        model.deleted_at = None
        model.version += 1
        db.session.commit()

        logger.info("Restored visual model %s (tenant %s)", model_id, tenant_id)
        return model

    # ── Version History ───────────────────────────────────────

    def get_version_history(
        self,
        tenant_id: str,
        model_id: str,
        limit: int = 50,
    ) -> List[VisualModelVersion]:
        """Return version history for a model, newest first."""
        model = VisualModel.get_for_tenant(model_id, tenant_id)
        if not model:
            raise NotFoundError(f"Visual model {model_id} not found")

        return (
            VisualModelVersion.query
            .filter_by(model_id=model.id, tenant_id=tenant_id)
            .order_by(VisualModelVersion.version.desc())
            .limit(limit)
            .all()
        )

    def restore_to_version(
        self,
        tenant_id: str,
        model_id: str,
        target_version: int,
        restored_by: Optional[str] = None,
    ) -> VisualModel:
        """Restore a model to a specific historical version."""
        model = VisualModel.get_for_tenant(model_id, tenant_id)
        if not model:
            raise NotFoundError(f"Visual model {model_id} not found")

        snapshot = (
            VisualModelVersion.query
            .filter_by(model_id=model.id, tenant_id=tenant_id, version=target_version)
            .first()
        )
        if not snapshot:
            raise NotFoundError(f"Version {target_version} not found for model {model_id}")

        # Snapshot current state first
        self._create_version_snapshot(
            model,
            change_type="restore",
            change_summary=f"Restored to version {target_version}",
            changed_by=restored_by,
        )

        # Apply snapshot fields
        model.model_name = snapshot.model_name
        model.model_path = snapshot.model_path
        model.model_layer = snapshot.model_layer
        model.visual_config = snapshot.visual_config
        model.generated_sql = snapshot.generated_sql
        model.generated_yaml = snapshot.generated_yaml
        model.materialization = snapshot.materialization
        model.tags = snapshot.tags
        model.description = snapshot.description
        model.is_deleted = False
        model.deleted_at = None
        model.version += 1
        db.session.commit()

        logger.info(
            "Restored visual model %s to version %d (now v%d, tenant %s)",
            model_id, target_version, model.version, tenant_id,
        )
        return model

    # ── Internal ──────────────────────────────────────────────

    def _create_version_snapshot(
        self,
        model: VisualModel,
        change_type: str,
        change_summary: str = "",
        changed_by: Optional[str] = None,
    ) -> VisualModelVersion:
        """Create a snapshot of the current model state."""
        snapshot = VisualModelVersion(
            tenant_id=str(model.tenant_id),
            model_id=model.id,
            version=model.version,
            model_name=model.model_name,
            model_path=model.model_path,
            model_layer=model.model_layer,
            visual_config=model.visual_config,
            generated_sql=model.generated_sql,
            generated_yaml=model.generated_yaml,
            materialization=model.materialization,
            tags=model.tags or [],
            description=model.description or "",
            change_type=change_type,
            change_summary=change_summary,
            changed_by=changed_by,
        )
        db.session.add(snapshot)
        return snapshot


def get_versioning_service() -> VersioningService:
    """Factory for VersioningService."""
    return VersioningService()
