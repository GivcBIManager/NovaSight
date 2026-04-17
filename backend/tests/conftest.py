"""
NovaSight Test Configuration
============================

Pytest fixtures and configuration for backend tests.
"""

import os
import pytest
from typing import Generator
from flask import Flask
from flask.testing import FlaskClient

# Set test environment before importing app
os.environ["FLASK_ENV"] = "testing"

from app import create_app
from app.extensions import db
from app.models import Tenant, User, Role
from app.domains.tenants.domain.models import TenantStatus
from app.domains.identity.domain.models import UserStatus


@pytest.fixture(scope="session")
def app() -> Generator[Flask, None, None]:
    """Create application for testing."""
    app = create_app("testing")
    
    # Create app context
    with app.app_context():
        yield app


@pytest.fixture(scope="function")
def client(app: Flask) -> FlaskClient:
    """Create test client."""
    return app.test_client()


@pytest.fixture(scope="function")
def db_session(app: Flask) -> Generator:
    """Create database session for testing."""
    with app.app_context():
        # Create all tables
        db.create_all()
        
        yield db.session
        
        # Cleanup: close all sessions first to release locks
        db.session.remove()
        
        # Drop tables in correct order to avoid FK constraint issues
        # Use raw SQL with CASCADE for reliable cleanup
        from sqlalchemy import text
        try:
            db.session.execute(text("SET session_replication_role = 'replica';"))
            db.drop_all()
            db.session.execute(text("SET session_replication_role = 'origin';"))
            db.session.commit()
        except Exception:
            db.session.rollback()
            # Fallback: drop with CASCADE
            db.drop_all()


@pytest.fixture
def sample_tenant(db_session) -> Tenant:
    """Create a sample tenant for testing."""
    tenant = Tenant(
        name="Test Tenant",
        slug="test-tenant",
        plan="professional",
        status="active",  # Use string value, not enum
        settings={"timezone": "UTC"}
    )
    db_session.add(tenant)
    db_session.commit()
    return tenant


@pytest.fixture
def sample_user(db_session, sample_tenant) -> User:
    """Create a sample user for testing."""
    from app.platform.security.passwords import password_service
    
    user = User(
        tenant_id=sample_tenant.id,
        email="admin@novasight.dev",
        name="Admin User",
        status="active",  # Use string value, not enum
        password_hash=password_service.hash("Admin123!")
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def auth_headers(client: FlaskClient, sample_user: User, sample_tenant: Tenant) -> dict:
    """Get authentication headers for API requests."""
    response = client.post("/api/v1/auth/login", json={
        "email": sample_user.email,
        "password": "Admin123!",
        "tenant_slug": sample_tenant.slug
    })
    
    if response.status_code == 200:
        data = response.json
        return {
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
        }
    
    # Return empty headers if login fails
    return {"access_token": None, "refresh_token": None}


@pytest.fixture
def admin_role(db_session) -> Role:
    """Create admin role for testing."""
    role = Role(
        name="tenant_admin",
        display_name="Tenant Admin",
        description="Administrator role",
        is_system=True,
        permissions={"tenant": "all"}
    )
    db_session.add(role)
    db_session.commit()
    return role


# =============================================================================
# External Service Mocks
# =============================================================================

@pytest.fixture
def mock_clickhouse(mocker):
    """
    Mock ClickHouse client for testing.
    
    Usage:
        def test_query(mock_clickhouse):
            mock_clickhouse.return_value.execute.return_value = [{"id": 1}]
    """
    mock = mocker.patch('app.domains.analytics.infrastructure.clickhouse_client.ClickHouseClient')
    mock_instance = mock.return_value
    mock_instance.execute.return_value = []
    mock_instance.query.return_value = {"data": [], "rows": 0}
    mock_instance.ping.return_value = True
    return mock


@pytest.fixture
def mock_ollama(mocker):
    """
    Mock Ollama client for AI service testing.
    
    Usage:
        def test_ai_query(mock_ollama):
            mock_ollama.return_value.generate.return_value = "AI response"
    """
    mock = mocker.patch('app.services.ollama.client.OllamaClient')
    mock_instance = mock.return_value
    mock_instance.generate.return_value = '{"dimensions": [], "measures": []}'
    mock_instance.is_available.return_value = True
    mock_instance.list_models.return_value = ["llama3.1", "codellama"]
    return mock


@pytest.fixture
def mock_dagster(mocker):
    """
    Mock Dagster client for job testing.
    
    Usage:
        def test_job_trigger(mock_dagster):
            mock_dagster.return_value.trigger_job.return_value = {"run_id": "123"}
    """
    mock = mocker.patch('app.domains.orchestration.infrastructure.dagster_client.DagsterClient')
    mock_instance = mock.return_value
    mock_instance.trigger_job.return_value = {"run_id": "test-run-123"}
    mock_instance.get_run_status.return_value = {"status": "SUCCESS"}
    mock_instance.list_jobs.return_value = []
    return mock


@pytest.fixture
def mock_postgresql_connector(mocker):
    """Mock PostgreSQL connector for connection testing."""
    mock = mocker.patch('app.connectors.postgresql.PostgreSQLConnector')
    mock_instance = mock.return_value
    mock_instance.test_connection.return_value = True
    mock_instance.get_schemas.return_value = ["public", "analytics"]
    mock_instance.__enter__ = lambda self: mock_instance
    mock_instance.__exit__ = lambda self, *args: None
    return mock


@pytest.fixture
def mock_encryption_service(mocker):
    """Mock encryption service for credential testing."""
    mock = mocker.patch('app.platform.security.encryption.EncryptionService')
    mock_instance = mock.return_value
    mock_instance.encrypt.side_effect = lambda x: f"encrypted:{x}"
    mock_instance.decrypt.side_effect = lambda x: x.replace("encrypted:", "") if x.startswith("encrypted:") else x
    return mock


# =============================================================================
# Model Fixtures
# =============================================================================

@pytest.fixture
def sample_connection(db_session, sample_tenant, sample_user):
    """Create a sample data connection for testing."""
    from app.domains.datasources.domain.models import DataConnection, DatabaseType, ConnectionStatus
    
    connection = DataConnection(
        tenant_id=sample_tenant.id,
        name="Test PostgreSQL",
        db_type=DatabaseType.POSTGRESQL,
        host="localhost",
        port=5432,
        database="testdb",
        username="testuser",
        password_encrypted="encrypted:testpassword",
        status=ConnectionStatus.ACTIVE,
        created_by=sample_user.id,
    )
    db_session.add(connection)
    db_session.commit()
    return connection


@pytest.fixture
def sample_semantic_model(db_session, sample_tenant, sample_user):
    """Create a sample semantic model for testing."""
    from app.domains.transformation.domain.models import SemanticModel, ModelType
    
    model = SemanticModel(
        tenant_id=sample_tenant.id,
        name="sales_orders",
        dbt_model="mart_sales_orders",
        label="Sales Orders",
        model_type=ModelType.FACT,
        is_active=True,
        created_by=sample_user.id,
    )
    db_session.add(model)
    db_session.commit()
    return model


@pytest.fixture
def sample_dashboard(db_session, sample_tenant, sample_user):
    """Create a sample dashboard for testing."""
    from app.domains.analytics.domain.models import Dashboard
    
    dashboard = Dashboard(
        tenant_id=sample_tenant.id,
        name="Test Dashboard",
        description="A test dashboard",
        is_public=False,
        created_by=sample_user.id,
        layout=[],
        settings={},
    )
    db_session.add(dashboard)
    db_session.commit()
    return dashboard


# =============================================================================
# JWT Token Fixtures
# =============================================================================

@pytest.fixture
def jwt_access_token(app, sample_user, sample_tenant):
    """Generate a valid JWT access token for testing."""
    from flask_jwt_extended import create_access_token
    
    with app.app_context():
        token = create_access_token(
            identity=str(sample_user.id),
            additional_claims={
                'tenant_id': str(sample_tenant.id),
                'roles': ['tenant_admin'],
                'permissions': ['*'],
            }
        )
        return token


@pytest.fixture
def api_headers(jwt_access_token):
    """Create headers for authenticated API requests."""
    return {
        'Authorization': f'Bearer {jwt_access_token}',
        'Content-Type': 'application/json',
    }


# =============================================================================
# Test Helpers
# =============================================================================

class TestConfig:
    """Test configuration helpers."""
    
    @staticmethod
    def mock_clickhouse_response(data: list) -> dict:
        """Create mock ClickHouse query response."""
        return {
            "data": data,
            "rows": len(data),
            "statistics": {
                "elapsed": 0.001,
                "rows_read": len(data),
                "bytes_read": 1024
            }
        }
    
    @staticmethod
    def mock_query_result(columns: list, rows: list):
        """Create a mock QueryResult for semantic queries."""
        from app.domains.analytics.infrastructure.clickhouse_client import QueryResult
        return QueryResult(
            columns=columns,
            data=rows,
            row_count=len(rows),
            execution_time_ms=10,
            query=""
        )
    
    @staticmethod
    def generate_uuid():
        """Generate a random UUID string."""
        import uuid
        return str(uuid.uuid4())


class APITestHelper:
    """Helper class for API testing."""
    
    @staticmethod
    def assert_success_response(response, expected_status=200):
        """Assert API response is successful."""
        assert response.status_code == expected_status
        data = response.get_json()
        assert 'error' not in data or data.get('error') is None
        return data
    
    @staticmethod
    def assert_error_response(response, expected_status=400, error_contains=None):
        """Assert API response is an error."""
        assert response.status_code == expected_status
        data = response.get_json()
        if error_contains:
            assert error_contains.lower() in str(data).lower()
        return data
    
    @staticmethod
    def assert_validation_error(response, field_name=None):
        """Assert API response is a validation error."""
        assert response.status_code == 400 or response.status_code == 422
        data = response.get_json()
        if field_name:
            assert field_name in str(data)
        return data
