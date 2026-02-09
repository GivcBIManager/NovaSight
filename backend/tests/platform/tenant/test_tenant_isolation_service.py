"""
TenantIsolationService Unit Tests
==================================

Tests for the TenantIsolationService class that enforces tenant isolation
across all NovaSight artifacts (PySpark, DAGs, dbt, connections).

These tests verify ADR-003: Multi-Tenant Isolation Strategy compliance.
"""

import pytest
from unittest.mock import patch, MagicMock
from flask import g

from app.platform.tenant.isolation import (
    TenantIsolationService,
    TenantIsolationError,
    get_current_tenant_isolation,
    require_tenant_isolation,
)


class TestTenantIsolationServiceInitialization:
    """Test TenantIsolationService initialization and properties."""

    def test_init_with_tenant_id_only(self):
        """Service initializes with just tenant_id."""
        service = TenantIsolationService(tenant_id="abc-123")
        assert service.tenant_id == "abc-123"
        assert service._tenant_slug is None

    def test_init_with_tenant_slug(self):
        """Service initializes with both tenant_id and slug."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme-corp"
        )
        assert service.tenant_id == "abc-123"
        assert service._tenant_slug == "acme-corp"

    def test_tenant_database_property(self):
        """Tenant database name follows pattern: tenant_{slug}."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.tenant_database == "tenant_acme_corp"

    def test_tenant_schema_property(self):
        """Tenant schema name follows pattern: tenant_{slug}."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.tenant_schema == "tenant_acme_corp"

    def test_tenant_dag_folder_property(self):
        """Tenant DAG folder follows pattern: tenant_{slug}."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.tenant_dag_folder == "tenant_acme_corp"

    def test_tenant_dbt_folder_property(self):
        """Tenant dbt folder follows pattern: tenant_{slug}."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.tenant_dbt_folder == "tenant_acme_corp"


class TestValidateTargetDatabase:
    """Test validate_target_database method."""

    def test_empty_database_returns_true(self):
        """Empty database is allowed (will use default)."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_target_database("") is True

    def test_own_database_allowed(self):
        """Tenant can access their own database."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_target_database("tenant_acme_corp") is True

    def test_other_tenant_database_raises_error(self):
        """Accessing another tenant's database raises TenantIsolationError."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_target_database("tenant_globex_inc")
        
        assert "Access denied" in str(exc_info.value)
        assert "tenant_globex_inc" in str(exc_info.value)
        assert "tenant_acme_corp" in str(exc_info.value)

    def test_system_databases_allowed_with_warning(self):
        """System databases (system, default) are allowed."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_target_database("system") is True
        assert service.validate_target_database("default") is True
        assert service.validate_target_database("information_schema") is True

    def test_non_tenant_database_allowed(self):
        """Non-tenant databases (shared data) are allowed with logging."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        # Shared datasets that don't follow tenant_ pattern
        assert service.validate_target_database("public_datasets") is True
        assert service.validate_target_database("reference_data") is True


class TestValidateConnectionOwnership:
    """Test validate_connection_ownership method."""

    @patch('app.domains.datasources.domain.models.DataConnection')
    def test_own_connection_allowed(self, mock_connection_class):
        """Tenant can access their own connection."""
        mock_connection = MagicMock()
        mock_connection.tenant_id = "abc-123"
        mock_connection_class.query.filter.return_value.first.return_value = mock_connection

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_connection_ownership("conn-001") is True

    @patch('app.domains.datasources.domain.models.DataConnection')
    def test_other_tenant_connection_raises_error(self, mock_connection_class):
        """Accessing another tenant's connection raises TenantIsolationError."""
        mock_connection = MagicMock()
        mock_connection.tenant_id = "other-tenant-456"
        mock_connection_class.query.filter.return_value.first.return_value = mock_connection

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_connection_ownership("conn-002")
        
        assert "Access denied" in str(exc_info.value)
        assert "belongs to another tenant" in str(exc_info.value)

    @patch('app.domains.datasources.domain.models.DataConnection')
    def test_nonexistent_connection_raises_error(self, mock_connection_class):
        """Non-existent connection raises TenantIsolationError."""
        mock_connection_class.query.filter.return_value.first.return_value = None

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_connection_ownership("conn-nonexistent")
        
        assert "not found" in str(exc_info.value)


class TestValidatePySparkAppOwnership:
    """Test validate_pyspark_app_ownership method."""

    @patch('app.domains.compute.domain.models.PySparkApp')
    def test_own_app_allowed(self, mock_app_class):
        """Tenant can access their own PySpark app."""
        mock_app = MagicMock()
        mock_app.tenant_id = "abc-123"
        mock_app_class.query.filter.return_value.first.return_value = mock_app

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_pyspark_app_ownership("app-001") is True

    @patch('app.domains.compute.domain.models.PySparkApp')
    def test_other_tenant_app_raises_error(self, mock_app_class):
        """Accessing another tenant's PySpark app raises TenantIsolationError."""
        mock_app = MagicMock()
        mock_app.tenant_id = "other-tenant-456"
        mock_app_class.query.filter.return_value.first.return_value = mock_app

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_pyspark_app_ownership("app-002")
        
        assert "Access denied" in str(exc_info.value)
        assert "belongs to another tenant" in str(exc_info.value)

    @patch('app.domains.compute.domain.models.PySparkApp')
    def test_nonexistent_app_raises_error(self, mock_app_class):
        """Non-existent PySpark app raises TenantIsolationError."""
        mock_app_class.query.filter.return_value.first.return_value = None

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_pyspark_app_ownership("app-nonexistent")
        
        assert "not found" in str(exc_info.value)


class TestValidateDagConfigOwnership:
    """Test validate_dag_config_ownership method."""

    @patch('app.domains.orchestration.domain.models.DagConfig')
    def test_own_dag_config_allowed(self, mock_dag_class):
        """Tenant can access their own DAG config."""
        mock_dag = MagicMock()
        mock_dag.tenant_id = "abc-123"
        mock_dag_class.query.filter.return_value.first.return_value = mock_dag

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_dag_config_ownership("dag-001") is True

    @patch('app.domains.orchestration.domain.models.DagConfig')
    def test_other_tenant_dag_config_raises_error(self, mock_dag_class):
        """Accessing another tenant's DAG config raises TenantIsolationError."""
        mock_dag = MagicMock()
        mock_dag.tenant_id = "other-tenant-456"
        mock_dag_class.query.filter.return_value.first.return_value = mock_dag

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_dag_config_ownership("dag-002")
        
        assert "Access denied" in str(exc_info.value)
        assert "belongs to another tenant" in str(exc_info.value)

    @patch('app.domains.orchestration.domain.models.DagConfig')
    def test_nonexistent_dag_config_raises_error(self, mock_dag_class):
        """Non-existent DAG config raises TenantIsolationError."""
        mock_dag_class.query.filter.return_value.first.return_value = None

        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_dag_config_ownership("dag-nonexistent")
        
        assert "not found" in str(exc_info.value)


class TestValidateDagId:
    """Test validate_dag_id method."""

    def test_dag_with_tenant_id_allowed(self):
        """DAG ID containing tenant_id is allowed."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_dag_id("pyspark_abc-123_my_job") is True
        assert service.validate_dag_id("ingest_abc-123_sales") is True

    def test_dag_with_tenant_slug_allowed(self):
        """DAG ID containing tenant_slug is allowed."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_dag_id("pyspark_acme_corp_my_job") is True
        assert service.validate_dag_id("transform_acme_corp_orders") is True

    def test_dag_without_tenant_reference_raises_error(self):
        """DAG ID without tenant reference raises TenantIsolationError."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_dag_id("generic_dag_name")
        
        assert "does not belong to this tenant" in str(exc_info.value)

    def test_dag_with_other_tenant_raises_error(self):
        """DAG ID with another tenant's reference raises TenantIsolationError."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_dag_id("pyspark_globex_inc_job")
        
        assert "does not belong to this tenant" in str(exc_info.value)


class TestValidateSqlQuery:
    """Test validate_sql_query method."""

    def test_query_without_database_reference_allowed(self):
        """Query without explicit database reference is allowed."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        assert service.validate_sql_query("SELECT * FROM users") is True
        assert service.validate_sql_query("INSERT INTO orders VALUES (1, 'test')") is True

    def test_query_with_own_database_allowed(self):
        """Query referencing own tenant database is allowed."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        query = "SELECT * FROM tenant_acme_corp.users"
        assert service.validate_sql_query(query) is True

    def test_query_with_other_tenant_database_raises_error(self):
        """Query referencing another tenant's database raises error."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        query = "SELECT * FROM tenant_globex_inc.users"
        with pytest.raises(TenantIsolationError) as exc_info:
            service.validate_sql_query(query)
        
        assert "unauthorized database" in str(exc_info.value)
        assert "tenant_globex_inc" in str(exc_info.value)

    def test_query_with_multiple_database_references(self):
        """Query with multiple database references validates all."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        # Query with own database in multiple places - allowed
        query = """
            SELECT a.id, b.name 
            FROM tenant_acme_corp.users a 
            JOIN tenant_acme_corp.orders b ON a.id = b.user_id
        """
        assert service.validate_sql_query(query) is True
        
        # Query with cross-tenant join - not allowed
        cross_tenant_query = """
            SELECT a.id, b.name 
            FROM tenant_acme_corp.users a 
            JOIN tenant_globex_inc.orders b ON a.id = b.user_id
        """
        with pytest.raises(TenantIsolationError):
            service.validate_sql_query(cross_tenant_query)

    def test_case_insensitive_database_detection(self):
        """Database detection is case-insensitive."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        # Lowercase - should work
        assert service.validate_sql_query("SELECT * FROM TENANT_ACME_CORP.users") is True
        
        # Mixed case other tenant - should fail
        with pytest.raises(TenantIsolationError):
            service.validate_sql_query("SELECT * FROM Tenant_Globex_Inc.users")


class TestEnforceTargetDatabase:
    """Test enforce_target_database method."""

    def test_none_returns_tenant_database(self):
        """None target database returns tenant's database."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        result = service.enforce_target_database(None)
        assert result == "tenant_acme_corp"

    def test_empty_returns_tenant_database(self):
        """Empty target database returns tenant's database."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        result = service.enforce_target_database("")
        assert result == "tenant_acme_corp"

    def test_own_database_returns_same(self):
        """Own tenant database returns same value."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        result = service.enforce_target_database("tenant_acme_corp")
        assert result == "tenant_acme_corp"

    def test_other_tenant_database_raises_error(self):
        """Other tenant's database raises error."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        with pytest.raises(TenantIsolationError):
            service.enforce_target_database("tenant_globex_inc")


class TestFilePaths:
    """Test file path generation methods."""

    def test_get_dag_file_path(self):
        """DAG file path includes tenant folder."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        path = service.get_dag_file_path("my_dag")
        assert path == "/opt/airflow/dags/tenant_acme_corp/my_dag.py"

    def test_get_pyspark_job_path(self):
        """PySpark job path includes tenant folder."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        path = service.get_pyspark_job_path("my_job")
        assert path == "/opt/airflow/spark_apps/tenant_acme_corp/my_job.py"

    def test_get_dbt_model_path(self):
        """dbt model path includes tenant folder."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        path = service.get_dbt_model_path("stg_orders")
        assert path == "models/tenant_acme_corp/stg_orders.sql"


class TestGetTemplateContext:
    """Test get_template_context method."""

    def test_returns_all_context_variables(self):
        """Template context contains all tenant isolation variables."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        context = service.get_template_context()
        
        assert context["tenant_id"] == "abc-123"
        assert context["tenant_slug"] == "acme_corp"
        assert context["tenant_database"] == "tenant_acme_corp"
        assert context["tenant_schema"] == "tenant_acme_corp"
        assert context["tenant_dag_folder"] == "tenant_acme_corp"
        assert context["tenant_dbt_folder"] == "tenant_acme_corp"


class TestGetCurrentTenantIsolation:
    """Test get_current_tenant_isolation helper function."""

    def test_returns_none_outside_request_context(self, app):
        """Returns None when not in request context."""
        result = get_current_tenant_isolation()
        assert result is None

    def test_returns_none_without_tenant(self, app):
        """Returns None when no tenant in context."""
        with app.test_request_context():
            result = get_current_tenant_isolation()
            assert result is None

    def test_returns_service_with_tenant_id_in_g(self, app):
        """Returns service when tenant_id in g."""
        with app.test_request_context():
            g.tenant_id = "abc-123"
            result = get_current_tenant_isolation()
            assert result is not None
            assert result.tenant_id == "abc-123"

    def test_returns_service_with_tenant_object_in_g(self, app):
        """Returns service when tenant object in g."""
        mock_tenant = MagicMock()
        mock_tenant.id = "abc-123"
        mock_tenant.slug = "acme_corp"
        
        with app.test_request_context():
            g.tenant = mock_tenant
            result = get_current_tenant_isolation()
            assert result is not None
            assert result.tenant_id == "abc-123"
            assert result._tenant_slug == "acme_corp"


class TestRequireTenantIsolationDecorator:
    """Test require_tenant_isolation decorator."""

    def test_injects_isolation_service(self, app):
        """Decorator injects isolation parameter."""
        mock_tenant = MagicMock()
        mock_tenant.id = "abc-123"
        mock_tenant.slug = "acme_corp"
        
        @require_tenant_isolation
        def my_function(isolation: TenantIsolationService):
            return isolation.tenant_database
        
        with app.test_request_context():
            g.tenant = mock_tenant
            result = my_function()  # type: ignore - isolation injected by decorator
            assert result == "tenant_acme_corp"

    def test_raises_error_without_tenant_context(self, app):
        """Decorator raises error when no tenant context."""
        @require_tenant_isolation
        def my_function(isolation: TenantIsolationService):
            return isolation.tenant_database
        
        with app.test_request_context():
            with pytest.raises(TenantIsolationError) as exc_info:
                my_function()  # type: ignore - isolation injected by decorator
            
            assert "No tenant context available" in str(exc_info.value)

    def test_preserves_other_arguments(self, app):
        """Decorator preserves other function arguments."""
        mock_tenant = MagicMock()
        mock_tenant.id = "abc-123"
        mock_tenant.slug = "acme_corp"
        
        @require_tenant_isolation
        def my_function(name: str, isolation: TenantIsolationService, count: int = 5):
            return f"{name}:{isolation.tenant_slug}:{count}"
        
        with app.test_request_context():
            g.tenant = mock_tenant
            result = my_function("test", count=10)  # type: ignore - isolation injected by decorator
            assert result == "test:acme_corp:10"


class TestTenantDatabasePattern:
    """Test tenant database name pattern validation."""

    def test_valid_tenant_database_patterns(self):
        """Valid tenant database patterns are recognized."""
        pattern = TenantIsolationService.TENANT_DB_PATTERN
        
        assert pattern.match("tenant_acme") is not None
        assert pattern.match("tenant_acme_corp") is not None
        assert pattern.match("tenant_abc123") is not None
        assert pattern.match("tenant_a1b2c3") is not None

    def test_invalid_tenant_database_patterns(self):
        """Invalid patterns are not matched."""
        pattern = TenantIsolationService.TENANT_DB_PATTERN
        
        assert pattern.match("acme_tenant") is None
        assert pattern.match("public") is None
        assert pattern.match("tenant-acme") is None  # Hyphen not allowed
        assert pattern.match("tenant_ACME") is None  # Uppercase not allowed
        assert pattern.match("tenant_") is None  # Empty slug


class TestSafeIdentifierPattern:
    """Test safe SQL identifier pattern."""

    def test_valid_identifiers(self):
        """Valid SQL identifiers are recognized."""
        pattern = TenantIsolationService.SAFE_IDENTIFIER_PATTERN
        
        assert pattern.match("users") is not None
        assert pattern.match("_private") is not None
        assert pattern.match("Table1") is not None
        assert pattern.match("my_table_name") is not None

    def test_invalid_identifiers(self):
        """Invalid SQL identifiers are not matched."""
        pattern = TenantIsolationService.SAFE_IDENTIFIER_PATTERN
        
        assert pattern.match("123abc") is None
        assert pattern.match("table-name") is None
        assert pattern.match("table.name") is None
        assert pattern.match("table name") is None
        assert pattern.match("") is None
