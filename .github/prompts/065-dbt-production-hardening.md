# 065 - Production Hardening

## Metadata

```yaml
prompt_id: "065"
phase: "O5"
agent: "@backend"
model: "opus 4.5"
priority: P1
estimated_effort: "5 days"
dependencies: ["064"]
```

## Objective

Implement production-grade features: optimistic locking, soft-delete, version history, bulk operations, export/import, rate limiting, and dead-letter queue.

## Task Description

Harden the dbt Studio backend for multi-user, high-reliability production use.

## Requirements

### 1. Optimistic Locking for Visual Models

```python
# backend/app/domains/transformation/models/visual_model.py
"""
Add version column for optimistic locking.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.extensions import db

class VisualModel(db.Model):
    __tablename__ = 'visual_models'
    
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    layer = Column(String(50), default='staging')  # source, staging, intermediate, marts
    materialization = Column(String(50), default='view')
    description = Column(Text)
    config = Column(JSON, default=dict)  # columns, joins, filters, etc.
    
    # Optimistic locking
    version = Column(Integer, nullable=False, default=1)
    
    # Soft delete
    is_deleted = Column(db.Boolean, default=False, index=True)
    deleted_at = Column(DateTime)
    deleted_by = Column(Integer, ForeignKey('users.id'))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    tenant = relationship('Tenant', back_populates='visual_models')
    versions = relationship('VisualModelVersion', back_populates='model', lazy='dynamic')
    
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'name', name='uq_visual_model_tenant_name'),
        {'schema': 'dbt'}
    )
```

### 2. Version History Table

```python
# backend/app/domains/transformation/models/visual_model_version.py
"""
Version history for visual models - stores full snapshots.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.extensions import db

class VisualModelVersion(db.Model):
    __tablename__ = 'visual_model_versions'
    __table_args__ = {'schema': 'dbt'}
    
    id = Column(Integer, primary_key=True)
    model_id = Column(Integer, ForeignKey('dbt.visual_models.id'), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    
    # Snapshot of model state
    name = Column(String(255), nullable=False)
    layer = Column(String(50))
    materialization = Column(String(50))
    description = Column(Text)
    config = Column(JSON)
    compiled_sql = Column(Text)
    
    # Change metadata
    change_type = Column(String(20))  # create, update, delete, restore
    change_summary = Column(String(500))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    model = relationship('VisualModel', back_populates='versions')
    user = relationship('User', foreign_keys=[created_by])
```

### 3. Optimistic Locking Service

```python
# backend/app/domains/transformation/services/versioning_service.py
"""
VersioningService — handles optimistic locking and version history.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from flask import g
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.domains.transformation.models.visual_model import VisualModel
from app.domains.transformation.models.visual_model_version import VisualModelVersion
from app.errors import ConflictError, NotFoundError

class VersioningService:
    """Manages optimistic locking and version history for visual models."""
    
    def update_with_lock(
        self,
        model_id: int,
        expected_version: int,
        updates: Dict[str, Any],
        user_id: int,
        change_summary: Optional[str] = None
    ) -> VisualModel:
        """
        Update a model with optimistic locking.
        
        Args:
            model_id: ID of the model to update
            expected_version: Client's expected version (from last read)
            updates: Fields to update
            user_id: ID of the user making the change
            change_summary: Optional description of the change
            
        Returns:
            Updated VisualModel
            
        Raises:
            NotFoundError: Model not found
            ConflictError: Version mismatch (someone else modified)
        """
        model = VisualModel.query.filter(
            VisualModel.id == model_id,
            VisualModel.is_deleted == False
        ).with_for_update().first()
        
        if not model:
            raise NotFoundError(f"Visual model {model_id} not found")
        
        if model.version != expected_version:
            raise ConflictError(
                f"Model was modified by another user. "
                f"Expected version {expected_version}, current version {model.version}. "
                f"Please refresh and retry."
            )
        
        # Snapshot before update
        self._create_version_snapshot(model, 'update', change_summary, user_id)
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(model, key):
                setattr(model, key, value)
        
        model.version += 1
        model.updated_by = user_id
        model.updated_at = datetime.utcnow()
        
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            raise ConflictError(f"Update failed: {str(e)}")
        
        return model
    
    def soft_delete(
        self,
        model_id: int,
        expected_version: int,
        user_id: int
    ) -> VisualModel:
        """
        Soft delete a model with version check.
        """
        model = VisualModel.query.filter(
            VisualModel.id == model_id,
            VisualModel.is_deleted == False
        ).with_for_update().first()
        
        if not model:
            raise NotFoundError(f"Visual model {model_id} not found")
        
        if model.version != expected_version:
            raise ConflictError("Model was modified. Please refresh and retry.")
        
        self._create_version_snapshot(model, 'delete', 'Soft deleted', user_id)
        
        model.is_deleted = True
        model.deleted_at = datetime.utcnow()
        model.deleted_by = user_id
        model.version += 1
        
        db.session.commit()
        return model
    
    def restore(self, model_id: int, user_id: int) -> VisualModel:
        """
        Restore a soft-deleted model.
        """
        model = VisualModel.query.filter(
            VisualModel.id == model_id,
            VisualModel.is_deleted == True
        ).first()
        
        if not model:
            raise NotFoundError(f"Deleted model {model_id} not found")
        
        self._create_version_snapshot(model, 'restore', 'Restored from deletion', user_id)
        
        model.is_deleted = False
        model.deleted_at = None
        model.deleted_by = None
        model.version += 1
        model.updated_by = user_id
        
        db.session.commit()
        return model
    
    def get_version_history(
        self,
        model_id: int,
        limit: int = 50
    ) -> list[VisualModelVersion]:
        """
        Get version history for a model.
        """
        return VisualModelVersion.query.filter(
            VisualModelVersion.model_id == model_id
        ).order_by(
            VisualModelVersion.version.desc()
        ).limit(limit).all()
    
    def restore_to_version(
        self,
        model_id: int,
        target_version: int,
        user_id: int
    ) -> VisualModel:
        """
        Restore a model to a specific historical version.
        """
        version = VisualModelVersion.query.filter(
            VisualModelVersion.model_id == model_id,
            VisualModelVersion.version == target_version
        ).first()
        
        if not version:
            raise NotFoundError(f"Version {target_version} not found")
        
        model = VisualModel.query.get(model_id)
        if not model:
            raise NotFoundError(f"Model {model_id} not found")
        
        # Snapshot current state
        self._create_version_snapshot(
            model, 'update',
            f'Restored to version {target_version}',
            user_id
        )
        
        # Apply historical state
        model.name = version.name
        model.layer = version.layer
        model.materialization = version.materialization
        model.description = version.description
        model.config = version.config
        model.version += 1
        model.updated_by = user_id
        
        db.session.commit()
        return model
    
    def _create_version_snapshot(
        self,
        model: VisualModel,
        change_type: str,
        change_summary: Optional[str],
        user_id: int
    ) -> VisualModelVersion:
        """Create a snapshot of the current model state."""
        from app.domains.transformation.services.template_service import TemplateService
        
        # Try to compile SQL for the snapshot
        compiled_sql = None
        try:
            template_service = TemplateService()
            compiled_sql = template_service.compile_model(model)
        except Exception:
            pass
        
        version = VisualModelVersion(
            model_id=model.id,
            version=model.version,
            name=model.name,
            layer=model.layer,
            materialization=model.materialization,
            description=model.description,
            config=model.config,
            compiled_sql=compiled_sql,
            change_type=change_type,
            change_summary=change_summary,
            created_by=user_id
        )
        
        db.session.add(version)
        return version
```

### 4. Bulk Operations Service

```python
# backend/app/domains/transformation/services/bulk_operations_service.py
"""
BulkOperationsService — batch create, update, delete for visual models.
"""
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime
from flask import g
from app.extensions import db
from app.domains.transformation.models.visual_model import VisualModel
from app.domains.transformation.services.versioning_service import VersioningService

@dataclass
class BulkResult:
    succeeded: List[int]
    failed: List[Tuple[int, str]]  # (id, error_message)
    
    @property
    def success_count(self) -> int:
        return len(self.succeeded)
    
    @property
    def failure_count(self) -> int:
        return len(self.failed)

class BulkOperationsService:
    """Handles batch operations on visual models."""
    
    def __init__(self):
        self.versioning = VersioningService()
    
    def bulk_create(
        self,
        tenant_id: int,
        models: List[Dict[str, Any]],
        user_id: int
    ) -> BulkResult:
        """
        Create multiple models in a batch.
        
        Args:
            tenant_id: Tenant ID
            models: List of model definitions
            user_id: Creating user ID
            
        Returns:
            BulkResult with success/failure counts
        """
        succeeded = []
        failed = []
        
        for model_def in models:
            try:
                model = VisualModel(
                    tenant_id=tenant_id,
                    name=model_def['name'],
                    layer=model_def.get('layer', 'staging'),
                    materialization=model_def.get('materialization', 'view'),
                    description=model_def.get('description'),
                    config=model_def.get('config', {}),
                    created_by=user_id,
                    updated_by=user_id
                )
                db.session.add(model)
                db.session.flush()  # Get ID without committing
                succeeded.append(model.id)
            except Exception as e:
                failed.append((model_def.get('name', 'unknown'), str(e)))
        
        if succeeded:
            db.session.commit()
        
        return BulkResult(succeeded=succeeded, failed=failed)
    
    def bulk_delete(
        self,
        model_ids: List[int],
        versions: Dict[int, int],  # model_id -> expected_version
        user_id: int
    ) -> BulkResult:
        """
        Soft delete multiple models.
        
        Args:
            model_ids: List of model IDs to delete
            versions: Dict mapping model_id to expected version
            user_id: Deleting user ID
        """
        succeeded = []
        failed = []
        
        for model_id in model_ids:
            try:
                expected_version = versions.get(model_id, 0)
                self.versioning.soft_delete(model_id, expected_version, user_id)
                succeeded.append(model_id)
            except Exception as e:
                failed.append((model_id, str(e)))
        
        return BulkResult(succeeded=succeeded, failed=failed)
    
    def bulk_update_layer(
        self,
        model_ids: List[int],
        new_layer: str,
        user_id: int
    ) -> BulkResult:
        """
        Update layer for multiple models (bypasses version check for admin ops).
        """
        succeeded = []
        failed = []
        
        for model_id in model_ids:
            try:
                model = VisualModel.query.get(model_id)
                if not model or model.is_deleted:
                    failed.append((model_id, 'Not found'))
                    continue
                
                model.layer = new_layer
                model.version += 1
                model.updated_by = user_id
                model.updated_at = datetime.utcnow()
                succeeded.append(model_id)
            except Exception as e:
                failed.append((model_id, str(e)))
        
        if succeeded:
            db.session.commit()
        
        return BulkResult(succeeded=succeeded, failed=failed)
```

### 5. Export/Import Service

```python
# backend/app/domains/transformation/services/export_import_service.py
"""
ExportImportService — export/import visual models as JSON/YAML.
"""
import json
import yaml
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from app.domains.transformation.models.visual_model import VisualModel
from app.domains.transformation.services.bulk_operations_service import BulkOperationsService

@dataclass
class ExportPackage:
    version: str
    exported_at: str
    tenant_id: int
    models: List[Dict[str, Any]]
    
    def to_json(self) -> str:
        return json.dumps(self.__dict__, indent=2, default=str)
    
    def to_yaml(self) -> str:
        return yaml.dump(self.__dict__, default_flow_style=False)

@dataclass
class ImportResult:
    created: int
    updated: int
    skipped: int
    errors: List[str]

class ExportImportService:
    """Handles export/import of visual models."""
    
    EXPORT_VERSION = '1.0'
    
    def __init__(self):
        self.bulk_ops = BulkOperationsService()
    
    def export_models(
        self,
        tenant_id: int,
        model_ids: Optional[List[int]] = None,
        include_deleted: bool = False
    ) -> ExportPackage:
        """
        Export visual models to a portable format.
        
        Args:
            tenant_id: Tenant ID
            model_ids: Specific model IDs to export (None = all)
            include_deleted: Include soft-deleted models
        """
        query = VisualModel.query.filter(VisualModel.tenant_id == tenant_id)
        
        if model_ids:
            query = query.filter(VisualModel.id.in_(model_ids))
        
        if not include_deleted:
            query = query.filter(VisualModel.is_deleted == False)
        
        models = query.all()
        
        model_data = [
            {
                'name': m.name,
                'layer': m.layer,
                'materialization': m.materialization,
                'description': m.description,
                'config': m.config,
                'is_deleted': m.is_deleted
            }
            for m in models
        ]
        
        return ExportPackage(
            version=self.EXPORT_VERSION,
            exported_at=datetime.utcnow().isoformat(),
            tenant_id=tenant_id,
            models=model_data
        )
    
    def import_models(
        self,
        tenant_id: int,
        data: Dict[str, Any],
        user_id: int,
        mode: str = 'skip'  # skip | update | replace
    ) -> ImportResult:
        """
        Import visual models from an export package.
        
        Args:
            tenant_id: Target tenant ID
            data: Parsed export package
            user_id: Importing user ID
            mode: Conflict resolution mode
                - skip: Skip existing models
                - update: Update existing models
                - replace: Delete all and reimport
        """
        created = 0
        updated = 0
        skipped = 0
        errors = []
        
        # Validate version
        pkg_version = data.get('version', '0.0')
        if not pkg_version.startswith('1.'):
            errors.append(f"Unsupported export version: {pkg_version}")
            return ImportResult(created, updated, skipped, errors)
        
        models = data.get('models', [])
        
        # Get existing model names
        existing = {
            m.name: m for m in VisualModel.query.filter(
                VisualModel.tenant_id == tenant_id,
                VisualModel.is_deleted == False
            ).all()
        }
        
        if mode == 'replace':
            # Soft delete all existing
            for m in existing.values():
                m.is_deleted = True
                m.deleted_at = datetime.utcnow()
                m.deleted_by = user_id
            existing = {}
        
        for model_def in models:
            name = model_def.get('name')
            if not name:
                errors.append("Model missing name")
                continue
            
            try:
                if name in existing:
                    if mode == 'skip':
                        skipped += 1
                        continue
                    elif mode == 'update':
                        # Update existing
                        m = existing[name]
                        m.layer = model_def.get('layer', m.layer)
                        m.materialization = model_def.get('materialization', m.materialization)
                        m.description = model_def.get('description', m.description)
                        m.config = model_def.get('config', m.config)
                        m.version += 1
                        m.updated_by = user_id
                        updated += 1
                else:
                    # Create new
                    model = VisualModel(
                        tenant_id=tenant_id,
                        name=name,
                        layer=model_def.get('layer', 'staging'),
                        materialization=model_def.get('materialization', 'view'),
                        description=model_def.get('description'),
                        config=model_def.get('config', {}),
                        created_by=user_id,
                        updated_by=user_id
                    )
                    from app.extensions import db
                    db.session.add(model)
                    created += 1
            except Exception as e:
                errors.append(f"Error importing {name}: {str(e)}")
        
        from app.extensions import db
        db.session.commit()
        
        return ImportResult(created, updated, skipped, errors)
```

### 6. Rate Limiting Decorator

```python
# backend/app/domains/transformation/decorators.py
"""
Rate limiting decorators for dbt API endpoints.
"""
from functools import wraps
from flask import request, g
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.errors import RateLimitError

# Initialize with Redis backend in production
limiter = Limiter(
    key_func=lambda: f"{get_remote_address()}:{getattr(g, 'tenant_id', 'global')}",
    default_limits=["1000 per hour", "100 per minute"]
)

def rate_limit(limit: str, scope: str = 'default'):
    """
    Rate limit decorator with custom limit string.
    
    Args:
        limit: Rate limit string (e.g., '10 per minute')
        scope: Scope for the limit (e.g., 'compile', 'execute')
    """
    def decorator(f):
        @wraps(f)
        @limiter.limit(limit, key_func=lambda: f"{g.tenant_id}:{scope}")
        def wrapper(*args, **kwargs):
            return f(*args, **kwargs)
        return wrapper
    return decorator

def compile_rate_limit(f):
    """Rate limit for compile operations (expensive)."""
    return rate_limit('30 per minute', 'compile')(f)

def execute_rate_limit(f):
    """Rate limit for execution operations (very expensive)."""
    return rate_limit('10 per minute', 'execute')(f)

def bulk_rate_limit(f):
    """Rate limit for bulk operations."""
    return rate_limit('5 per minute', 'bulk')(f)
```

### 7. Dead Letter Queue for Failed Operations

```python
# backend/app/domains/transformation/services/dead_letter_service.py
"""
DeadLetterService — tracks failed operations for retry/investigation.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from app.extensions import db

class DeadLetterEntry(db.Model):
    """Stores failed operations for later retry or investigation."""
    __tablename__ = 'dead_letter_queue'
    __table_args__ = {'schema': 'dbt'}
    
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, index=True)
    operation = Column(String(50))  # compile, execute, export, import
    payload = Column(JSON)
    error_message = Column(Text)
    error_type = Column(String(100))
    stack_trace = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    status = Column(String(20), default='pending')  # pending, retrying, failed, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    last_retry_at = Column(DateTime)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer)

class DeadLetterService:
    """Manages the dead letter queue for failed operations."""
    
    def record_failure(
        self,
        tenant_id: int,
        operation: str,
        payload: Dict[str, Any],
        error: Exception,
        max_retries: int = 3
    ) -> DeadLetterEntry:
        """
        Record a failed operation.
        
        Args:
            tenant_id: Tenant ID
            operation: Operation type (compile, execute, etc.)
            payload: Original request payload
            error: The exception that occurred
            max_retries: Max retry attempts
        """
        import traceback
        
        entry = DeadLetterEntry(
            tenant_id=tenant_id,
            operation=operation,
            payload=payload,
            error_message=str(error),
            error_type=type(error).__name__,
            stack_trace=traceback.format_exc(),
            max_retries=max_retries
        )
        
        db.session.add(entry)
        db.session.commit()
        
        return entry
    
    def get_pending(
        self,
        tenant_id: Optional[int] = None,
        operation: Optional[str] = None,
        limit: int = 100
    ) -> list[DeadLetterEntry]:
        """Get pending entries for retry."""
        query = DeadLetterEntry.query.filter(
            DeadLetterEntry.status.in_(['pending', 'retrying'])
        )
        
        if tenant_id:
            query = query.filter(DeadLetterEntry.tenant_id == tenant_id)
        if operation:
            query = query.filter(DeadLetterEntry.operation == operation)
        
        return query.order_by(DeadLetterEntry.created_at).limit(limit).all()
    
    def mark_retrying(self, entry_id: int) -> DeadLetterEntry:
        """Mark an entry as being retried."""
        entry = DeadLetterEntry.query.get(entry_id)
        entry.status = 'retrying'
        entry.retry_count += 1
        entry.last_retry_at = datetime.utcnow()
        
        if entry.retry_count >= entry.max_retries:
            entry.status = 'failed'
        
        db.session.commit()
        return entry
    
    def mark_resolved(self, entry_id: int, user_id: int) -> DeadLetterEntry:
        """Mark an entry as resolved."""
        entry = DeadLetterEntry.query.get(entry_id)
        entry.status = 'resolved'
        entry.resolved_at = datetime.utcnow()
        entry.resolved_by = user_id
        db.session.commit()
        return entry
    
    def get_stats(self, tenant_id: Optional[int] = None) -> Dict[str, int]:
        """Get queue statistics."""
        query = DeadLetterEntry.query
        if tenant_id:
            query = query.filter(DeadLetterEntry.tenant_id == tenant_id)
        
        total = query.count()
        pending = query.filter(DeadLetterEntry.status == 'pending').count()
        failed = query.filter(DeadLetterEntry.status == 'failed').count()
        
        return {
            'total': total,
            'pending': pending,
            'failed': failed,
            'resolved': total - pending - failed
        }
```

### 8. API Routes Update

```python
# backend/app/domains/transformation/api/visual_models_routes.py
"""
Updated routes with versioning, bulk ops, and rate limiting.
"""
from flask import Blueprint, request, g
from app.domains.transformation.services.versioning_service import VersioningService
from app.domains.transformation.services.bulk_operations_service import BulkOperationsService
from app.domains.transformation.services.export_import_service import ExportImportService
from app.domains.transformation.decorators import compile_rate_limit, bulk_rate_limit, execute_rate_limit

bp = Blueprint('visual_models', __name__, url_prefix='/api/v1/dbt/visual-models')
versioning = VersioningService()
bulk_ops = BulkOperationsService()
export_import = ExportImportService()

@bp.put('/<int:model_id>')
@compile_rate_limit
def update_model(model_id: int):
    """Update with optimistic locking."""
    data = request.get_json()
    expected_version = data.pop('version', 0)
    
    model = versioning.update_with_lock(
        model_id=model_id,
        expected_version=expected_version,
        updates=data,
        user_id=g.user.id,
        change_summary=data.get('change_summary')
    )
    
    return {'id': model.id, 'version': model.version}

@bp.delete('/<int:model_id>')
def delete_model(model_id: int):
    """Soft delete with version check."""
    version = request.args.get('version', type=int, default=0)
    model = versioning.soft_delete(model_id, version, g.user.id)
    return {'id': model.id, 'deleted': True}

@bp.post('/<int:model_id>/restore')
def restore_model(model_id: int):
    """Restore soft-deleted model."""
    model = versioning.restore(model_id, g.user.id)
    return {'id': model.id, 'restored': True}

@bp.get('/<int:model_id>/versions')
def get_versions(model_id: int):
    """Get version history."""
    versions = versioning.get_version_history(model_id)
    return {'versions': [
        {
            'version': v.version,
            'change_type': v.change_type,
            'change_summary': v.change_summary,
            'created_at': v.created_at.isoformat(),
            'created_by': v.created_by
        }
        for v in versions
    ]}

@bp.post('/<int:model_id>/restore-version/<int:version>')
def restore_to_version(model_id: int, version: int):
    """Restore to specific version."""
    model = versioning.restore_to_version(model_id, version, g.user.id)
    return {'id': model.id, 'version': model.version}

# Bulk operations
@bp.post('/bulk/create')
@bulk_rate_limit
def bulk_create():
    """Batch create models."""
    data = request.get_json()
    result = bulk_ops.bulk_create(g.tenant_id, data['models'], g.user.id)
    return {
        'succeeded': result.succeeded,
        'failed': result.failed,
        'success_count': result.success_count,
        'failure_count': result.failure_count
    }

@bp.post('/bulk/delete')
@bulk_rate_limit
def bulk_delete():
    """Batch delete models."""
    data = request.get_json()
    result = bulk_ops.bulk_delete(
        data['model_ids'],
        data.get('versions', {}),
        g.user.id
    )
    return {
        'succeeded': result.succeeded,
        'failed': result.failed
    }

# Export/Import
@bp.get('/export')
def export_models():
    """Export models to JSON."""
    model_ids = request.args.getlist('id', type=int) or None
    package = export_import.export_models(g.tenant_id, model_ids)
    return package.to_json(), 200, {'Content-Type': 'application/json'}

@bp.post('/import')
@bulk_rate_limit
def import_models():
    """Import models from JSON."""
    data = request.get_json()
    mode = request.args.get('mode', 'skip')
    result = export_import.import_models(g.tenant_id, data, g.user.id, mode)
    return {
        'created': result.created,
        'updated': result.updated,
        'skipped': result.skipped,
        'errors': result.errors
    }
```

## Acceptance Criteria

- [ ] VisualModel has `version` column for optimistic locking
- [ ] Update endpoint returns 409 Conflict on version mismatch
- [ ] Soft delete sets `is_deleted=True` instead of removing
- [ ] Version history stored in `visual_model_versions` table
- [ ] Restore to specific version works
- [ ] Bulk create/delete endpoints work with partial failure handling
- [ ] Export produces valid JSON with version header
- [ ] Import supports skip/update/replace modes
- [ ] Rate limiting enforced on compile/execute/bulk endpoints
- [ ] Dead letter queue records failed operations
- [ ] All new tables have Alembic migrations

## Testing

```bash
# Run backend tests
cd backend
pytest tests/domains/transformation/test_versioning.py -v
pytest tests/domains/transformation/test_bulk_ops.py -v
pytest tests/domains/transformation/test_export_import.py -v

# Test optimistic locking
curl -X PUT /api/v1/dbt/visual-models/1 -d '{"name":"test","version":1}'
# Second request with version=1 should return 409

# Test export/import
curl /api/v1/dbt/visual-models/export > backup.json
curl -X POST /api/v1/dbt/visual-models/import?mode=update -d @backup.json
```
