"""
NovaSight Services
==================

Business logic services for the application.
"""

from app.domains.identity.application.auth_service import AuthService
from app.domains.tenants.application.tenant_service import TenantService
from app.domains.identity.application.user_service import UserService
from app.domains.datasources.application.connection_service import ConnectionService
from app.domains.orchestration.application.dag_service import DagService
from app.platform.security.passwords import PasswordService, password_service
from app.platform.auth.token_service import TokenBlacklist, LoginAttemptTracker, token_blacklist, login_tracker

# Template Engine (ADR-002 compliant code generation)
from app.services.template_engine import (
    TemplateEngine,
    template_engine,
    TemplateParameterValidator,
    SQLIdentifier,
    ColumnDefinition,
    TableDefinition,
    DbtModelDefinition,
)

# dbt Service
from app.domains.transformation.application.dbt_service import DbtService, get_dbt_service, DbtResult

# dbt Model Generator
from app.domains.transformation.infrastructure.dbt_model_generator import (
    DbtModelGenerator,
    get_dbt_model_generator,
    DbtModelGeneratorError,
    ModelGenerationError,
)

# ClickHouse Client
from app.domains.analytics.infrastructure.clickhouse_client import (
    ClickHouseClient,
    QueryResult,
    get_clickhouse_client,
)

# Semantic Layer Service
from app.domains.transformation.application.semantic_service import (
    SemanticService,
    SemanticServiceError,
    ModelNotFoundError,
    DimensionNotFoundError,
    MeasureNotFoundError,
    QueryBuildError,
)

# Transformation DAG Generator (Prompt 021)
from app.domains.orchestration.infrastructure.asset_factory import AssetFactory
from app.domains.orchestration.infrastructure.schedule_factory import ScheduleFactory

# Pipeline Generator (Prompt 021)
from app.domains.orchestration.application.pipeline_service import (
    PipelineGenerator,
    PipelineGeneratorError,
    PipelineValidationError,
    FullPipelineBuilder,
    get_pipeline_generator,
)

# RBAC Service (Prompt 031)
from app.domains.identity.application.rbac_service import (
    RBACService,
    rbac_service,
)

# Audit Service (Prompt 032)
from app.services.audit_service import (
    AuditService,
    audit_service,
)

__all__ = [
    # Auth & User Services
    "AuthService",
    "TenantService",
    "UserService",
    "PasswordService",
    "password_service",
    "TokenBlacklist",
    "LoginAttemptTracker",
    "token_blacklist",
    "login_tracker",
    # RBAC Service
    "RBACService",
    "rbac_service",
    # Data Services
    "ConnectionService",
    "DagService",
    # Template Engine
    "TemplateEngine",
    "template_engine",
    "TemplateParameterValidator",
    "SQLIdentifier",
    "ColumnDefinition",
    "TableDefinition",
    "DbtModelDefinition",
    # Asset & Schedule Factories
    "AssetFactory",
    "ScheduleFactory",
    # dbt Service
    "DbtService",
    "get_dbt_service",
    "DbtResult",
    # dbt Model Generator
    "DbtModelGenerator",
    "get_dbt_model_generator",
    "DbtModelGeneratorError",
    "ModelGenerationError",
    # ClickHouse Client
    "ClickHouseClient",
    "QueryResult",
    "get_clickhouse_client",
    # Semantic Layer Service
    "SemanticService",
    "SemanticServiceError",
    "ModelNotFoundError",
    "DimensionNotFoundError",
    "MeasureNotFoundError",
    "QueryBuildError",
    # Pipeline Generator (Prompt 021)
    "PipelineGenerator",
    "PipelineGeneratorError",
    "PipelineValidationError",
    "FullPipelineBuilder",
    "get_pipeline_generator",
    # Audit Service (Prompt 032)
    "AuditService",
    "audit_service",
]
