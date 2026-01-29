"""
NovaSight Infrastructure Configuration Model
=============================================

Models for configurable infrastructure server connections.
Allows portal admins to configure ClickHouse, Spark, and Airflow connections.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Text, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.extensions import db
import enum


class InfrastructureType(enum.Enum):
    """Infrastructure service types."""
    CLICKHOUSE = "clickhouse"
    SPARK = "spark"
    AIRFLOW = "airflow"


class InfrastructureConfig(db.Model):
    """
    Infrastructure server configuration model.
    
    Stores connection settings for infrastructure services like
    ClickHouse, Spark, and Airflow. Configurations can be:
    - Global defaults (tenant_id = None)
    - Tenant-specific overrides (tenant_id = UUID)
    
    Only one active configuration per type per tenant is allowed.
    """
    
    __tablename__ = "infrastructure_configs"
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Configuration type
    service_type = db.Column(String(50), nullable=False, index=True)
    
    # Optional tenant association (None = global default)
    tenant_id = db.Column(
        UUID(as_uuid=True), 
        db.ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    
    # Display name for the configuration
    name = db.Column(String(255), nullable=False)
    description = db.Column(Text, nullable=True)
    
    # Whether this is the active configuration
    is_active = db.Column(Boolean, default=True, nullable=False)
    
    # Whether this is a system default (cannot be deleted)
    is_system_default = db.Column(Boolean, default=False, nullable=False)
    
    # Connection settings (encrypted sensitive fields stored separately)
    # Common fields
    host = db.Column(String(255), nullable=False)
    port = db.Column(Integer, nullable=False)
    
    # Additional settings as JSON
    settings = db.Column(JSONB, default=dict, nullable=False)
    
    # Encrypted credentials reference (stored in credential_manager)
    credential_id = db.Column(UUID(as_uuid=True), nullable=True)
    
    # Metadata
    created_at = db.Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = db.Column(UUID(as_uuid=True), nullable=True)
    updated_by = db.Column(UUID(as_uuid=True), nullable=True)
    
    # Last connectivity test result
    last_test_at = db.Column(DateTime, nullable=True)
    last_test_success = db.Column(Boolean, nullable=True)
    last_test_message = db.Column(Text, nullable=True)
    
    # Relationships (lazy loaded to avoid mapper issues)
    # tenant = db.relationship("Tenant", backref="infrastructure_configs")
    
    def __repr__(self):
        scope = f"tenant:{self.tenant_id}" if self.tenant_id else "global"
        return f"<InfrastructureConfig {self.service_type}:{self.name} ({scope})>"
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        result = {
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
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_test_at": self.last_test_at.isoformat() if self.last_test_at else None,
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
        tenant_id: Optional[str] = None
    ) -> Optional["InfrastructureConfig"]:
        """
        Get the active configuration for a service type.
        
        Priority:
        1. Tenant-specific active config (if tenant_id provided)
        2. Global active config
        3. System default
        
        Args:
            service_type: The infrastructure service type
            tenant_id: Optional tenant ID for tenant-specific config
            
        Returns:
            Active configuration or None
        """
        # Try tenant-specific first
        if tenant_id:
            tenant_config = cls.query.filter(
                cls.service_type == service_type,
                cls.tenant_id == tenant_id,
                cls.is_active == True
            ).first()
            if tenant_config:
                return tenant_config
        
        # Fall back to global config
        global_config = cls.query.filter(
            cls.service_type == service_type,
            cls.tenant_id.is_(None),
            cls.is_active == True
        ).first()
        
        return global_config


# Default configuration values for development/testing
DEFAULT_INFRASTRUCTURE_CONFIGS = {
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
        }
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
            "additional_configs": {}
        }
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
        }
    },
}
