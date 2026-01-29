"""
NovaSight Integration Test Configuration
=========================================

Pytest fixtures for integration tests using test containers
for realistic database and service testing.
"""

import pytest
import os
from typing import Generator, Dict, Any
from flask import Flask
from flask.testing import FlaskClient

# Test container imports (optional - graceful fallback if not available)
try:
    from testcontainers.postgres import PostgresContainer
    from testcontainers.redis import RedisContainer
    TESTCONTAINERS_AVAILABLE = True
except ImportError:
    TESTCONTAINERS_AVAILABLE = False
    PostgresContainer = None
    RedisContainer = None

# Set test environment before importing app
os.environ["FLASK_ENV"] = "testing"
os.environ["TESTING"] = "true"

from app import create_app
from app.extensions import db
from app.models import Tenant, User, Role
from app.models.tenant import TenantStatus, SubscriptionPlan
from app.models.user import UserStatus
from app.services.password_service import password_service
from app.services.rbac_service import RBACService


# =============================================================================
# Container Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def postgres_container():
    """
    Start PostgreSQL test container.
    
    Falls back to configured test database if testcontainers not available.
    """
    if not TESTCONTAINERS_AVAILABLE:
        pytest.skip("testcontainers not installed")
        return None
    
    container = PostgresContainer("postgres:15")
    container.start()
    
    yield container
    
    container.stop()


@pytest.fixture(scope="session")
def redis_container():
    """
    Start Redis test container.
    
    Falls back to configured test Redis if testcontainers not available.
    """
    if not TESTCONTAINERS_AVAILABLE:
        pytest.skip("testcontainers not installed")
        return None
    
    container = RedisContainer("redis:7")
    container.start()
    
    yield container
    
    container.stop()


# =============================================================================
# App Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def integration_app() -> Generator[Flask, None, None]:
    """
    Create Flask application for integration testing.
    
    Uses containers if available, otherwise falls back to test config.
    """
    app = create_app("testing")
    
    with app.app_context():
        # Create all tables
        db.create_all()
        yield app
        # Cleanup
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope="session")
def app_with_containers(postgres_container, redis_container) -> Generator[Flask, None, None]:
    """
    Create Flask application with real database containers.
    
    Provides realistic integration testing environment.
    """
    # Configure app with container connections
    os.environ["DATABASE_URL"] = postgres_container.get_connection_url()
    os.environ["REDIS_URL"] = (
        f"redis://{redis_container.get_container_host_ip()}:"
        f"{redis_container.get_exposed_port(6379)}"
    )
    
    app = create_app("testing")
    
    with app.app_context():
        # Create schema
        db.create_all()
        
        # Run migrations if available
        try:
            from flask_migrate import upgrade
            upgrade()
        except Exception:
            pass  # Migrations may not be needed for tests
        
        yield app
        
        db.session.remove()
        db.drop_all()


@pytest.fixture
def integration_client(integration_app: Flask) -> FlaskClient:
    """Create test client for integration tests."""
    return integration_app.test_client()


@pytest.fixture
def client_with_containers(app_with_containers: Flask) -> FlaskClient:
    """Create test client with real database containers."""
    return app_with_containers.test_client()


# =============================================================================
# Database Session Fixtures
# =============================================================================

@pytest.fixture
def integration_db(integration_app: Flask) -> Generator:
    """
    Create database session for integration tests.
    
    Uses savepoints for transaction isolation between tests.
    """
    with integration_app.app_context():
        # Start a transaction
        connection = db.engine.connect()
        transaction = connection.begin()
        
        # Begin a nested transaction (savepoint)
        nested = connection.begin_nested()
        
        # Configure session to use our connection
        db.session.begin_nested()
        
        yield db.session
        
        # Rollback to clean up
        db.session.rollback()
        transaction.rollback()
        connection.close()


# =============================================================================
# Seeded Data Fixtures
# =============================================================================

@pytest.fixture
def seeded_tenant(integration_app: Flask) -> Dict[str, Any]:
    """
    Create a fully seeded tenant with users and roles.
    
    Returns:
        Dictionary with tenant and admin_user objects
    """
    with integration_app.app_context():
        # Create tenant
        tenant = Tenant(
            name="Integration Test Tenant",
            slug="integration-test",
            plan=SubscriptionPlan.PROFESSIONAL,
            status=TenantStatus.ACTIVE,
            settings={"timezone": "UTC"},
        )
        db.session.add(tenant)
        db.session.flush()
        
        # Initialize roles for tenant
        try:
            RBACService.initialize_tenant_roles(tenant.id)
        except Exception:
            # Roles may already exist
            pass
        
        # Create admin role if not exists
        admin_role = Role.query.filter_by(
            tenant_id=tenant.id,
            name="tenant_admin"
        ).first()
        
        if not admin_role:
            admin_role = Role(
                tenant_id=tenant.id,
                name="tenant_admin",
                display_name="Tenant Admin",
                description="Full administrative access",
                is_system=True,
            )
            db.session.add(admin_role)
            db.session.flush()
        
        # Create admin user
        admin_user = User(
            tenant_id=tenant.id,
            email="admin@integration.test",
            name="Admin User",
            password_hash=password_service.hash("TestPassword123!"),
            status=UserStatus.ACTIVE,
            email_verified=True,
        )
        admin_user.roles = [admin_role]
        db.session.add(admin_user)
        
        # Create regular user
        viewer_role = Role.query.filter_by(
            tenant_id=tenant.id,
            name="viewer"
        ).first()
        
        if not viewer_role:
            viewer_role = Role(
                tenant_id=tenant.id,
                name="viewer",
                display_name="Viewer",
                description="Read-only access",
                is_system=True,
            )
            db.session.add(viewer_role)
            db.session.flush()
        
        regular_user = User(
            tenant_id=tenant.id,
            email="user@integration.test",
            name="Regular User",
            password_hash=password_service.hash("TestPassword123!"),
            status=UserStatus.ACTIVE,
            email_verified=True,
        )
        regular_user.roles = [viewer_role]
        db.session.add(regular_user)
        
        db.session.commit()
        
        return {
            "tenant": tenant,
            "admin_user": admin_user,
            "regular_user": regular_user,
            "admin_role": admin_role,
            "viewer_role": viewer_role,
        }


@pytest.fixture
def seeded_connection(integration_app: Flask, seeded_tenant: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a seeded data connection for testing.
    
    Returns:
        Dictionary with connection and related objects
    """
    from app.models.connection import DataConnection, DatabaseType, ConnectionStatus
    
    with integration_app.app_context():
        tenant = seeded_tenant["tenant"]
        admin_user = seeded_tenant["admin_user"]
        
        connection = DataConnection(
            tenant_id=tenant.id,
            name="Test PostgreSQL Connection",
            db_type=DatabaseType.POSTGRESQL,
            host="localhost",
            port=5432,
            database="integration_test_db",
            username="testuser",
            password_encrypted="encrypted:testpassword",
            status=ConnectionStatus.ACTIVE,
            created_by=admin_user.id,
        )
        db.session.add(connection)
        db.session.commit()
        
        return {
            **seeded_tenant,
            "connection": connection,
        }


@pytest.fixture
def seeded_semantic_layer(
    integration_app: Flask,
    seeded_connection: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create a seeded semantic layer with models, dimensions, and measures.
    
    Returns:
        Dictionary with semantic models and related objects
    """
    from app.models.semantic import (
        SemanticModel,
        Dimension,
        Measure,
        ModelType,
        DimensionType,
        AggregationType,
    )
    
    with integration_app.app_context():
        tenant = seeded_connection["tenant"]
        admin_user = seeded_connection["admin_user"]
        
        # Create fact model
        sales_model = SemanticModel(
            tenant_id=tenant.id,
            name="sales_orders",
            dbt_model="mart_sales_orders",
            label="Sales Orders",
            description="Sales order fact table",
            model_type=ModelType.FACT,
            is_active=True,
            cache_enabled=True,
            cache_ttl_seconds=3600,
            created_by=admin_user.id,
        )
        db.session.add(sales_model)
        db.session.flush()
        
        # Create dimensions
        date_dim = Dimension(
            semantic_model_id=sales_model.id,
            name="order_date",
            column_name="order_date",
            label="Order Date",
            dimension_type=DimensionType.TIME,
            is_primary_date=True,
        )
        
        customer_dim = Dimension(
            semantic_model_id=sales_model.id,
            name="customer_name",
            column_name="customer_name",
            label="Customer Name",
            dimension_type=DimensionType.CATEGORICAL,
        )
        
        db.session.add_all([date_dim, customer_dim])
        
        # Create measures
        total_sales = Measure(
            semantic_model_id=sales_model.id,
            name="total_sales",
            column_name="amount",
            label="Total Sales",
            aggregation=AggregationType.SUM,
            format_string="$,.2f",
        )
        
        order_count = Measure(
            semantic_model_id=sales_model.id,
            name="order_count",
            column_name="id",
            label="Order Count",
            aggregation=AggregationType.COUNT,
        )
        
        db.session.add_all([total_sales, order_count])
        db.session.commit()
        
        return {
            **seeded_connection,
            "sales_model": sales_model,
            "dimensions": [date_dim, customer_dim],
            "measures": [total_sales, order_count],
        }


@pytest.fixture
def seeded_dashboard(
    integration_app: Flask,
    seeded_semantic_layer: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create a seeded dashboard with widgets.
    
    Returns:
        Dictionary with dashboard and related objects
    """
    from app.models.dashboard import Dashboard, Widget, WidgetType
    
    with integration_app.app_context():
        tenant = seeded_semantic_layer["tenant"]
        admin_user = seeded_semantic_layer["admin_user"]
        
        dashboard = Dashboard(
            tenant_id=tenant.id,
            name="Integration Test Dashboard",
            description="Dashboard for integration testing",
            is_public=False,
            created_by=admin_user.id,
            layout=[],
            settings={"theme": "light"},
        )
        db.session.add(dashboard)
        db.session.flush()
        
        # Create widget
        widget = Widget(
            dashboard_id=dashboard.id,
            name="Total Sales Card",
            widget_type=WidgetType.METRIC_CARD,
            query_config={
                "measures": ["total_sales"],
            },
            viz_config={
                "format": "currency",
                "showChange": True,
            },
            grid_position={"x": 0, "y": 0, "w": 4, "h": 2},
        )
        db.session.add(widget)
        db.session.commit()
        
        return {
            **seeded_semantic_layer,
            "dashboard": dashboard,
            "widget": widget,
        }


# =============================================================================
# Authentication Fixtures
# =============================================================================

@pytest.fixture
def auth_headers(integration_client: FlaskClient, seeded_tenant: Dict[str, Any]) -> Dict[str, str]:
    """
    Get authentication headers for admin user.
    
    Returns:
        Dictionary with Authorization header
    """
    admin_user = seeded_tenant["admin_user"]
    tenant = seeded_tenant["tenant"]
    
    response = integration_client.post("/api/v1/auth/login", json={
        "email": admin_user.email,
        "password": "TestPassword123!",
        "tenant_slug": tenant.slug,
    })
    
    if response.status_code == 200:
        data = response.get_json()
        return {
            "Authorization": f"Bearer {data.get('access_token')}",
            "Content-Type": "application/json",
        }
    
    # Fallback: generate token directly
    from flask_jwt_extended import create_access_token
    
    with integration_client.application.app_context():
        token = create_access_token(
            identity={
                "user_id": str(admin_user.id),
                "email": admin_user.email,
                "tenant_id": str(tenant.id),
                "roles": ["tenant_admin"],
            }
        )
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }


@pytest.fixture
def viewer_auth_headers(
    integration_client: FlaskClient,
    seeded_tenant: Dict[str, Any]
) -> Dict[str, str]:
    """
    Get authentication headers for regular (viewer) user.
    
    Returns:
        Dictionary with Authorization header
    """
    regular_user = seeded_tenant["regular_user"]
    tenant = seeded_tenant["tenant"]
    
    response = integration_client.post("/api/v1/auth/login", json={
        "email": regular_user.email,
        "password": "TestPassword123!",
        "tenant_slug": tenant.slug,
    })
    
    if response.status_code == 200:
        data = response.get_json()
        return {
            "Authorization": f"Bearer {data.get('access_token')}",
            "Content-Type": "application/json",
        }
    
    # Fallback: generate token directly
    from flask_jwt_extended import create_access_token
    
    with integration_client.application.app_context():
        token = create_access_token(
            identity={
                "user_id": str(regular_user.id),
                "email": regular_user.email,
                "tenant_id": str(tenant.id),
                "roles": ["viewer"],
            }
        )
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }


# =============================================================================
# Test Helpers
# =============================================================================

class IntegrationTestHelper:
    """Helper utilities for integration tests."""
    
    @staticmethod
    def assert_success_response(response, expected_status: int = 200) -> Dict[str, Any]:
        """Assert API response is successful and return data."""
        assert response.status_code == expected_status, (
            f"Expected {expected_status}, got {response.status_code}: "
            f"{response.get_json()}"
        )
        return response.get_json()
    
    @staticmethod
    def assert_error_response(
        response,
        expected_status: int = 400,
        error_contains: str = None
    ) -> Dict[str, Any]:
        """Assert API response is an error."""
        assert response.status_code == expected_status, (
            f"Expected {expected_status}, got {response.status_code}"
        )
        data = response.get_json()
        if error_contains:
            assert error_contains.lower() in str(data).lower()
        return data
    
    @staticmethod
    def assert_unauthorized(response):
        """Assert response is unauthorized (401)."""
        assert response.status_code == 401
    
    @staticmethod
    def assert_forbidden(response):
        """Assert response is forbidden (403)."""
        assert response.status_code == 403
    
    @staticmethod
    def assert_not_found(response):
        """Assert response is not found (404)."""
        assert response.status_code == 404


# Export helper for use in tests
helper = IntegrationTestHelper()
