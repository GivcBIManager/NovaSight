"""
NovaSight Database Models
=========================

SQLAlchemy models for the NovaSight metadata store.
"""

from app.models.tenant import Tenant, TenantStatus
from app.models.user import User, Role, UserRole, UserStatus
from app.models.connection import DataConnection
from app.models.dag import DagConfig, DagVersion, TaskConfig
from app.models.audit import AuditLog, AuditSeverity
from app.models.rbac import (
    Permission,
    ResourcePermission,
    RoleHierarchy,
    role_permissions,
)
from app.models.pyspark_app import (
    PySparkApp,
    PySparkAppStatus,
    SourceType,
    WriteMode,
    SCDType,
    CDCType,
)
from app.models.data_source import (
    DataSourceColumn,
    DataSourceTable,
    DataSourceSchema,
    ColumnDataType,
)
from app.models.semantic import (
    SemanticModel,
    Dimension,
    Measure,
    Relationship,
    DimensionType,
    AggregationType,
    ModelType,
    RelationshipType,
    JoinType,
)
from app.models.dashboard import (
    Dashboard,
    Widget,
    WidgetType,
)
from app.models.infrastructure_config import (
    InfrastructureConfig,
    InfrastructureType,
    DEFAULT_INFRASTRUCTURE_CONFIGS,
)
from app.models.mixins import (
    TenantMixin,
    TimestampMixin,
    AuditMixin,
    SoftDeleteMixin,
)

__all__ = [
    # Core models
    "Tenant",
    "TenantStatus",
    "User",
    "UserStatus",
    "Role",
    "UserRole",
    "DataConnection",
    "DagConfig",
    "DagVersion",
    "TaskConfig",
    "AuditLog",
    "AuditSeverity",
    # RBAC models
    "Permission",
    "ResourcePermission",
    "RoleHierarchy",
    "role_permissions",
    # PySpark models
    "PySparkApp",
    "PySparkAppStatus",
    "SourceType",
    "WriteMode",
    "SCDType",
    "CDCType",
    # Data source models
    "DataSourceColumn",
    "DataSourceTable",
    "DataSourceSchema",
    "ColumnDataType",
    # Semantic layer models
    "SemanticModel",
    "Dimension",
    "Measure",
    "Relationship",
    "DimensionType",
    "AggregationType",
    "ModelType",
    "RelationshipType",
    "JoinType",
    # Dashboard models
    "Dashboard",
    "Widget",
    "WidgetType",
    # Infrastructure config models
    "InfrastructureConfig",
    "InfrastructureType",
    "DEFAULT_INFRASTRUCTURE_CONFIGS",
    # Mixins
    "TenantMixin",
    "TimestampMixin",
    "AuditMixin",
    "SoftDeleteMixin",
]
