"""
NovaSight Services
==================

Business logic services for the application.
"""

from app.services.auth_service import AuthService
from app.services.tenant_service import TenantService
from app.services.user_service import UserService
from app.services.connection_service import ConnectionService
from app.services.dag_service import DagService
from app.services.airflow_client import AirflowClient
from app.services.password_service import PasswordService, password_service
from app.services.token_service import TokenBlacklist, LoginAttemptTracker, token_blacklist, login_tracker

# Template Engine (ADR-002 compliant code generation)
from app.services.template_engine import (
    TemplateEngine,
    template_engine,
    TemplateParameterValidator,
    SQLIdentifier,
    ColumnDefinition,
    TableDefinition,
    DbtModelDefinition,
    AirflowDagDefinition,
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
    # Data Services
    "ConnectionService",
    "DagService",
    "AirflowClient",
    # Template Engine
    "TemplateEngine",
    "template_engine",
    "TemplateParameterValidator",
    "SQLIdentifier",
    "ColumnDefinition",
    "TableDefinition",
    "DbtModelDefinition",
    "AirflowDagDefinition",
]
