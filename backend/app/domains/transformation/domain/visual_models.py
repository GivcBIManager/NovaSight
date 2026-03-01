"""
Visual Model & Execution History Database Models
=================================================

Stores canvas state and visual builder configuration alongside
the generated dbt files. The PostgreSQL record is the "visual"
layer; the dbt project files on disk are the "source of truth"
for dbt execution.

Also contains DbtExecution for tracking execution history.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, String, Text, Float, Integer, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from app.extensions import db
from app.models.mixins import TenantMixin, TimestampMixin


class ModelLayer(str, Enum):
    """dbt model layers."""
    STAGING = "staging"
    INTERMEDIATE = "intermediate"
    MARTS = "marts"


class ExecutionStatus(str, Enum):
    """dbt execution status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    CANCELLED = "cancelled"


class VisualModel(TenantMixin, TimestampMixin, db.Model):
    """
    Stores visual builder state for a dbt model.

    Supplements the on-disk dbt SQL/YAML files with canvas
    positions and the original visual configuration that
    generated those files.
    """
    __tablename__ = 'visual_models'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(100), nullable=False)
    model_path = Column(Text, nullable=False)                # relative path in dbt project
    model_layer = Column(String(20), nullable=False)         # staging | intermediate | marts
    canvas_position = Column(JSONB, default=lambda: {"x": 0, "y": 0})
    visual_config = Column(JSONB, nullable=False)            # full visual builder state
    generated_sql = Column(Text)                             # last generated SQL
    generated_yaml = Column(Text)                            # last generated YAML
    materialization = Column(String(50), default='view')
    tags = Column(ARRAY(String), default=list)
    description = Column(Text, default='')

    __table_args__ = (
        db.UniqueConstraint(
            'tenant_id', 'model_name',
            name='uq_visual_model_tenant_name',
        ),
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "model_name": self.model_name,
            "model_path": self.model_path,
            "model_layer": self.model_layer,
            "canvas_position": self.canvas_position,
            "visual_config": self.visual_config,
            "generated_sql": self.generated_sql,
            "generated_yaml": self.generated_yaml,
            "materialization": self.materialization,
            "tags": self.tags or [],
            "description": self.description or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DbtExecution(TenantMixin, TimestampMixin, db.Model):
    """
    Tracks historical dbt command executions.

    Each row represents a single dbt command invocation (run, test, build, etc.)
    with its status, duration, logs, and affected models.
    """
    __tablename__ = 'dbt_executions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    command = Column(String(50), nullable=False)            # run | test | build | compile | seed | snapshot
    status = Column(
        String(20),
        nullable=False,
        default=ExecutionStatus.PENDING.value,
    )
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    selector = Column(Text, nullable=True)                  # --select argument
    exclude = Column(Text, nullable=True)                   # --exclude argument
    full_refresh = Column(db.Boolean, default=False)
    target = Column(String(50), nullable=True)
    models_affected = Column(ARRAY(String), default=list)   # list of model names
    models_succeeded = Column(Integer, default=0)
    models_errored = Column(Integer, default=0)
    models_skipped = Column(Integer, default=0)
    log_output = Column(Text, default='')                   # stdout
    error_output = Column(Text, default='')                 # stderr
    run_results = Column(JSONB, nullable=True)              # parsed run_results.json
    triggered_by = Column(UUID(as_uuid=True), nullable=True)  # user ID

    def to_dict(self):
        return {
            "id": str(self.id),
            "command": self.command,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
            "selector": self.selector,
            "exclude": self.exclude,
            "full_refresh": self.full_refresh,
            "target": self.target,
            "models_affected": self.models_affected or [],
            "models_succeeded": self.models_succeeded,
            "models_errored": self.models_errored,
            "models_skipped": self.models_skipped,
            "log_output": self.log_output or "",
            "error_output": self.error_output or "",
            "run_results": self.run_results,
            "triggered_by": str(self.triggered_by) if self.triggered_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
