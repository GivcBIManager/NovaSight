"""
NovaSight PySpark Job Configuration Model
=========================================

PySpark job configuration for data ingestion and transformation.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.extensions import db
import enum


class SourceType(enum.Enum):
    """Source type enumeration."""
    TABLE = "table"
    SQL_QUERY = "sql_query"


class SCDType(enum.Enum):
    """Slowly Changing Dimension type enumeration."""
    TYPE_0 = "type_0"  # No history tracking
    TYPE_1 = "type_1"  # Overwrite
    TYPE_2 = "type_2"  # Add new row with versioning


class WriteMode(enum.Enum):
    """Spark write mode enumeration."""
    APPEND = "append"
    OVERWRITE = "overwrite"
    UPSERT = "upsert"
    MERGE = "merge"


class JobStatus(enum.Enum):
    """PySpark job status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class PySparkJobConfig(db.Model):
    """
    PySpark job configuration model.
    
    Stores configuration for PySpark data ingestion and transformation jobs.
    Supports various source types, SCD patterns, and write modes.
    """
    
    __tablename__ = "pyspark_job_configs"
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant association
    tenant_id = db.Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Job identity
    job_name = db.Column(String(255), nullable=False)
    description = db.Column(Text, nullable=True)
    
    # Data source configuration
    connection_id = db.Column(UUID(as_uuid=True), ForeignKey("data_connections.id"), nullable=False)
    source_type = db.Column(
        SQLEnum(SourceType),
        nullable=False,
        default=SourceType.TABLE
    )
    source_table = db.Column(String(255), nullable=True)  # If source_type is TABLE
    source_query = db.Column(Text, nullable=True)  # If source_type is SQL_QUERY
    
    # Column selection
    selected_columns = db.Column(ARRAY(String), default=list, nullable=False)  # Empty means all columns
    
    # Primary key configuration
    primary_keys = db.Column(ARRAY(String), default=list, nullable=False)
    
    # SCD configuration
    scd_type = db.Column(
        SQLEnum(SCDType),
        default=SCDType.TYPE_1,
        nullable=False
    )
    write_mode = db.Column(
        SQLEnum(WriteMode),
        default=WriteMode.APPEND,
        nullable=False
    )
    
    # CDC configuration
    cdc_column = db.Column(String(255), nullable=True)  # e.g., updated_at, modified_date
    
    # Partitioning
    partition_columns = db.Column(ARRAY(String), default=list, nullable=False)
    
    # Target configuration
    target_database = db.Column(String(255), nullable=False)
    target_table = db.Column(String(255), nullable=False)
    target_schema = db.Column(String(255), nullable=True)
    
    # Spark configuration
    spark_config = db.Column(JSONB, default=dict, nullable=False)  # Additional Spark settings
    
    # Generated code tracking
    generated_code = db.Column(Text, nullable=True)  # Last generated PySpark code
    code_hash = db.Column(String(64), nullable=True)  # SHA-256 hash of config for change detection
    last_generated_at = db.Column(DateTime, nullable=True)
    
    # Version tracking
    config_version = db.Column(Integer, default=1, nullable=False)
    
    # Status
    status = db.Column(
        SQLEnum(JobStatus),
        default=JobStatus.DRAFT,
        nullable=False
    )
    
    # Audit
    created_by = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Unique job name within tenant
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "job_name", name="uq_tenant_job_name"),
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="pyspark_jobs")
    connection = relationship("DataConnection")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    
    def __repr__(self):
        return f"<PySparkJobConfig {self.job_name}>"
    
    @classmethod
    def for_tenant(cls, tenant_id: Optional[str] = None):
        """
        Query filtered by tenant.
        
        Args:
            tenant_id: Optional explicit tenant ID. Uses g.tenant_id if not provided.
        
        Returns:
            Query filtered by tenant_id
        """
        from flask import g, has_request_context
        
        if tenant_id is None:
            if has_request_context():
                if hasattr(g, 'tenant') and g.tenant:
                    tenant_id = str(g.tenant.id)
                elif hasattr(g, 'tenant_id'):
                    tenant_id = g.tenant_id
        
        if not tenant_id:
            raise ValueError("Tenant context required for this query")
        
        return cls.query.filter(cls.tenant_id == tenant_id)
    
    def to_dict(self, include_code: bool = False) -> dict:
        """Convert job config to dictionary."""
        result = {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "job_name": self.job_name,
            "description": self.description,
            "connection_id": str(self.connection_id),
            "source_type": self.source_type.value,
            "source_table": self.source_table,
            "source_query": self.source_query,
            "selected_columns": self.selected_columns,
            "primary_keys": self.primary_keys,
            "scd_type": self.scd_type.value,
            "write_mode": self.write_mode.value,
            "cdc_column": self.cdc_column,
            "partition_columns": self.partition_columns,
            "target_database": self.target_database,
            "target_table": self.target_table,
            "target_schema": self.target_schema,
            "spark_config": self.spark_config,
            "config_version": self.config_version,
            "status": self.status.value,
            "last_generated_at": self.last_generated_at.isoformat() if self.last_generated_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "created_by": str(self.created_by),
            "updated_by": str(self.updated_by) if self.updated_by else None,
        }
        
        if include_code and self.generated_code:
            result["generated_code"] = self.generated_code
            result["code_hash"] = self.code_hash
        
        return result
    
    def get_source_identifier(self) -> str:
        """Get human-readable source identifier."""
        if self.source_type == SourceType.TABLE:
            return self.source_table or "Unknown Table"
        else:
            return f"Custom Query ({self.source_query[:50]}...)" if self.source_query else "Custom Query"
    
    def requires_regeneration(self, new_config_hash: str) -> bool:
        """Check if code needs to be regenerated based on config changes."""
        return self.code_hash != new_config_hash or not self.generated_code
