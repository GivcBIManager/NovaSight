"""
NovaSight Tenants Domain — Models
==================================

Canonical location: ``app.domains.tenants.domain.models``

Core tenant and infrastructure-configuration models.
"""

import enum
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import String, Text, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.extensions import db


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class TenantStatus(enum.Enum):
    """Tenant lifecycle status."""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    ARCHIVED = "archived"


class SubscriptionPlan(enum.Enum):
    """Available subscription plans."""

    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class InfrastructureType(enum.Enum):
    """Infrastructure service types."""

    CLICKHOUSE = "clickhouse"
    SPARK = "spark"
    AIRFLOW = "airflow"
    OLLAMA = "ollama"


# ---------------------------------------------------------------------------
# Tenant model
# ---------------------------------------------------------------------------


class Tenant(db.Model):
    """
    Multi-tenant organisation model.

    Each tenant has isolated data, schemas, and infrastructure configs.
    """

    __tablename__ = "tenants"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(String(255), nullable=False)
    slug = db.Column(String(100), unique=True, nullable=False, index=True)

    # Subscription (stored as string to match DB schema)
    plan = db.Column(String(50), default="basic", nullable=False)

    # Status (stored as string to match DB schema)
    status = db.Column(String(50), default="active", nullable=False)

    # Settings (flexible JSON storage)
    settings = db.Column(JSONB, default=dict, nullable=False)

    # Metadata
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    users = db.relationship("User", back_populates="tenant", lazy="dynamic")
    connections = db.relationship(
        "DataConnection", back_populates="tenant", lazy="dynamic"
    )
    dag_configs = db.relationship(
        "DagConfig", back_populates="tenant", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Tenant {self.slug}>"

    def to_dict(self, include_settings: bool = True) -> dict:
        """Convert tenant to dictionary."""
        plan_value = (
            self.plan.value if hasattr(self.plan, "value") else str(self.plan)
        )
        status_value = (
            self.status.value
            if hasattr(self.status, "value")
            else str(self.status)
        )
        result: Dict[str, Any] = {
            "id": str(self.id),
            "name": self.name,
            "slug": self.slug,
            "plan": plan_value,
            "status": status_value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_settings:
            result["settings"] = self.settings
        return result

    @property
    def schema_name(self) -> str:
        """Tenant-specific PostgreSQL schema name."""
        return f"tenant_{self.slug}"

    def is_active(self) -> bool:
        """Check if tenant is active."""
        if hasattr(self.status, "value"):
            return self.status == TenantStatus.ACTIVE
        return str(self.status).lower() == "active"


# ---------------------------------------------------------------------------
# Infrastructure configuration model
# ---------------------------------------------------------------------------


class InfrastructureConfig(db.Model):
    """
    Infrastructure server configuration model.

    Stores connection settings for ClickHouse, Spark, Airflow, Ollama.
    Configs can be global (``tenant_id = None``) or tenant-specific.
    Only one active config per (type, tenant) pair is allowed.
    """

    __tablename__ = "infrastructure_configs"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    service_type = db.Column(String(50), nullable=False, index=True)

    tenant_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    name = db.Column(String(255), nullable=False)
    description = db.Column(Text, nullable=True)

    is_active = db.Column(Boolean, default=True, nullable=False)
    is_system_default = db.Column(Boolean, default=False, nullable=False)

    host = db.Column(String(255), nullable=False)
    port = db.Column(Integer, nullable=False)

    settings = db.Column(JSONB, default=dict, nullable=False)

    credential_id = db.Column(UUID(as_uuid=True), nullable=True)

    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    created_by = db.Column(UUID(as_uuid=True), nullable=True)
    updated_by = db.Column(UUID(as_uuid=True), nullable=True)

    last_test_at = db.Column(DateTime, nullable=True)
    last_test_success = db.Column(Boolean, nullable=True)
    last_test_message = db.Column(Text, nullable=True)

    def __repr__(self) -> str:
        scope = f"tenant:{self.tenant_id}" if self.tenant_id else "global"
        return f"<InfrastructureConfig {self.service_type}:{self.name} ({scope})>"

    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        result: Dict[str, Any] = {
            "id": str(self.id),
            "service_type": self.service_type,
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "name": self.name,
            "description": self.description,
            "is_active": self.is_active,
            "is_system_default": self.is_system_default,
            "host": self.host,
            "port": self.port,
            "settings": self.settings,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at else None
            ),
            "last_test_at": (
                self.last_test_at.isoformat() if self.last_test_at else None
            ),
            "last_test_success": self.last_test_success,
            "last_test_message": self.last_test_message,
        }
        if include_sensitive and self.credential_id:
            result["credential_id"] = str(self.credential_id)
        return result

    @classmethod
    def get_active_config(
        cls,
        service_type: str,
        tenant_id: Optional[str] = None,
    ) -> Optional["InfrastructureConfig"]:
        """
        Get active configuration with tenant → global fallback.

        Priority:
        1. Tenant-specific active config
        2. Global active config
        """
        if tenant_id:
            tenant_config = cls.query.filter(
                cls.service_type == service_type,
                cls.tenant_id == tenant_id,
                cls.is_active == True,  # noqa: E712
            ).first()
            if tenant_config:
                return tenant_config

        return cls.query.filter(
            cls.service_type == service_type,
            cls.tenant_id.is_(None),
            cls.is_active == True,  # noqa: E712
        ).first()


# ---------------------------------------------------------------------------
# Default infrastructure configs (for dev / testing)
# ---------------------------------------------------------------------------

DEFAULT_INFRASTRUCTURE_CONFIGS: Dict[str, Dict[str, Any]] = {
    InfrastructureType.CLICKHOUSE.value: {
        "name": "Default ClickHouse",
        "description": "Default ClickHouse configuration for development",
        "host": "localhost",
        "port": 8123,
        "settings": {
            "database": "novasight",
            "user": "default",
            "secure": False,
            "connect_timeout": 10,
            "send_receive_timeout": 300,
        },
    },
    InfrastructureType.SPARK.value: {
        "name": "Default Spark",
        "description": "Default Apache Spark configuration for development",
        "host": "localhost",
        "port": 7077,
        "settings": {
            "master_url": "spark://localhost:7077",
            "deploy_mode": "client",
            "driver_memory": "2g",
            "executor_memory": "2g",
            "executor_cores": 2,
            "dynamic_allocation": True,
            "min_executors": 1,
            "max_executors": 10,
            "spark_home": "/opt/spark",
            "additional_configs": {},
        },
    },
    InfrastructureType.AIRFLOW.value: {
        "name": "Default Airflow",
        "description": "Default Apache Airflow configuration for development",
        "host": "localhost",
        "port": 8080,
        "settings": {
            "base_url": "http://localhost:8080",
            "api_version": "v1",
            "dag_folder": "/opt/airflow/dags",
            "request_timeout": 30,
        },
    },
    InfrastructureType.OLLAMA.value: {
        "name": "Default Ollama",
        "description": "Default Ollama LLM server configuration",
        "host": "localhost",
        "port": 11434,
        "settings": {
            "base_url": "http://localhost:11434",
            "default_model": "llama3.2",
            "request_timeout": 120,
            "num_ctx": 4096,
            "temperature": 0.7,
            "keep_alive": "5m",
        },
    },
}
