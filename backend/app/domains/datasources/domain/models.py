"""
NovaSight Data Sources Domain — Models
=======================================

SQLAlchemy models and enums for data source connections.
Canonical location: ``app.domains.datasources.domain.models``

Changes from legacy ``app.models.connection``:
- Adopts ``TenantMixin`` for consistent tenant_id handling
- Adopts ``TimestampMixin`` for automatic created_at / updated_at
- Keeps ``created_by`` as an explicit column (not from AuditMixin)
  because connections don't track ``updated_by`` today.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.extensions import db
from app.models.mixins import TenantMixin, TimestampMixin

import enum


# ─── Enums ──────────────────────────────────────────────────────────

class DatabaseType(enum.Enum):
    """Supported database types."""
    POSTGRESQL = "postgresql"
    ORACLE = "oracle"
    SQLSERVER = "sqlserver"
    MYSQL = "mysql"
    CLICKHOUSE = "clickhouse"


class ConnectionStatus(enum.Enum):
    """Connection status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


# ─── DataConnection Model ──────────────────────────────────────────

class DataConnection(TenantMixin, TimestampMixin, db.Model):
    """
    Data source connection model.

    Stores encrypted database connection configurations.
    Credentials are encrypted at rest using tenant-specific keys
    via the unified ``platform.security.encryption.EncryptionService``.

    Uses:
    - ``TenantMixin`` → ``tenant_id`` FK + ``for_tenant()`` helper
    - ``TimestampMixin`` → ``created_at``, ``updated_at``
    """

    __tablename__ = "data_connections"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Connection identity
    name = db.Column(String(255), nullable=False)
    description = db.Column(Text, nullable=True)

    # Connection type
    db_type = db.Column(
        SQLEnum(DatabaseType),
        nullable=False,
    )

    # Connection parameters
    host = db.Column(String(255), nullable=False)
    port = db.Column(Integer, nullable=False)
    database = db.Column(String(255), nullable=False)
    schema_name = db.Column(String(255), nullable=True)  # Default schema

    # Credentials (encrypted)
    username = db.Column(String(255), nullable=False)
    password_encrypted = db.Column(Text, nullable=False)  # AES-256 encrypted

    # SSL / Security
    ssl_mode = db.Column(String(50), nullable=True)
    ssl_cert = db.Column(Text, nullable=True)  # Encrypted if present

    # Additional connection parameters
    extra_params = db.Column(JSONB, default=dict, nullable=False)

    # Status
    status = db.Column(
        SQLEnum(ConnectionStatus),
        default=ConnectionStatus.ACTIVE,
        nullable=False,
    )
    last_tested_at = db.Column(DateTime, nullable=True)
    last_test_result = db.Column(JSONB, nullable=True)

    # Audit — who created the connection
    created_by = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Unique name within tenant
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", name="uq_tenant_connection_name"),
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<DataConnection {self.name}>"

    def to_dict(self, mask_password: bool = True) -> dict:
        """Convert connection to dictionary."""
        result = {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "name": self.name,
            "description": self.description,
            "db_type": self.db_type.value,
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "schema_name": self.schema_name,
            "username": self.username,
            "ssl_mode": self.ssl_mode,
            "extra_params": self.extra_params,
            "status": self.status.value,
            "last_tested_at": self.last_tested_at.isoformat() if self.last_tested_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": str(self.created_by),
        }
        if mask_password:
            result["password"] = "********"
        return result

    def get_connection_string(self, password: str) -> str:
        """Generate SQLAlchemy connection string."""
        dialect_map = {
            DatabaseType.POSTGRESQL: "postgresql+psycopg2",
            DatabaseType.ORACLE: "oracle+cx_oracle",
            DatabaseType.SQLSERVER: "mssql+pyodbc",
            DatabaseType.MYSQL: "mysql+pymysql",
            DatabaseType.CLICKHOUSE: "clickhouse+native",
        }

        dialect = dialect_map.get(self.db_type, "postgresql+psycopg2")
        base_url = f"{dialect}://{self.username}:{password}@{self.host}:{self.port}/{self.database}"

        # Add SSL mode if specified
        if self.ssl_mode:
            base_url += f"?sslmode={self.ssl_mode}"

        return base_url
