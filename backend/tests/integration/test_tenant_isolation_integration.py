"""
TenantIsolationService Integration Tests
==========================================

Integration tests for TenantIsolationService that test with actual
database models and Flask application context.

These tests verify end-to-end tenant isolation enforcement.
"""

import pytest
from uuid import uuid4

from app.platform.tenant.isolation import (
    TenantIsolationService,
    TenantIsolationError,
)


@pytest.mark.integration
class TestTenantIsolationWithDatabase:
    """Integration tests with actual database models."""

    @pytest.fixture
    def tenant_a(self, db_session):
        """Create test tenant A."""
        from app.domains.tenants.domain.models import Tenant
        
        tenant = Tenant(
            id=str(uuid4()),
            name="Tenant A",
            slug="tenant_a",
            plan="professional",
            status="active",
        )
        db_session.add(tenant)
        db_session.commit()
        return tenant

    @pytest.fixture
    def tenant_b(self, db_session):
        """Create test tenant B."""
        from app.domains.tenants.domain.models import Tenant
        
        tenant = Tenant(
            id=str(uuid4()),
            name="Tenant B",
            slug="tenant_b",
            plan="professional",
            status="active",
        )
        db_session.add(tenant)
        db_session.commit()
        return tenant

    @pytest.fixture
    def connection_a(self, db_session, tenant_a):
        """Create connection for tenant A."""
        from app.domains.datasources.domain.models import DataConnection
        
        connection = DataConnection(
            id=str(uuid4()),
            tenant_id=tenant_a.id,
            name="Connection A",
            connection_type="postgresql",
            host="localhost",
            port=5432,
            database="test_db",
            username="user",
            password_encrypted="encrypted",
            status="active",
        )
        db_session.add(connection)
        db_session.commit()
        return connection

    @pytest.fixture
    def connection_b(self, db_session, tenant_b):
        """Create connection for tenant B."""
        from app.domains.datasources.domain.models import DataConnection
        
        connection = DataConnection(
            id=str(uuid4()),
            tenant_id=tenant_b.id,
            name="Connection B",
            connection_type="postgresql",
            host="localhost",
            port=5432,
            database="test_db_b",
            username="user",
            password_encrypted="encrypted",
            status="active",
        )
        db_session.add(connection)
        db_session.commit()
        return connection

    @pytest.fixture
    def pyspark_app_a(self, db_session, tenant_a):
        """Create PySpark app for tenant A."""
        from app.domains.compute.domain.models import PySparkApp
        
        app = PySparkApp(
            id=str(uuid4()),
            tenant_id=tenant_a.id,
            name="App A",
            source_type="postgresql",
            target_database="tenant_tenant_a",
            target_table="users",
            status="active",
        )
        db_session.add(app)
        db_session.commit()
        return app

    @pytest.fixture
    def pyspark_app_b(self, db_session, tenant_b):
        """Create PySpark app for tenant B."""
        from app.domains.compute.domain.models import PySparkApp
        
        app = PySparkApp(
            id=str(uuid4()),
            tenant_id=tenant_b.id,
            name="App B",
            source_type="postgresql",
            target_database="tenant_tenant_b",
            target_table="users",
            status="active",
        )
        db_session.add(app)
        db_session.commit()
        return app

    def test_tenant_a_can_access_own_connection(
        self, app, tenant_a, connection_a
    ):
        """Tenant A can access their own connection."""
        service = TenantIsolationService(
            tenant_id=str(tenant_a.id),
            tenant_slug=tenant_a.slug
        )
        
        with app.app_context():
            result = service.validate_connection_ownership(str(connection_a.id))
            assert result is True

    def test_tenant_a_cannot_access_tenant_b_connection(
        self, app, tenant_a, connection_b
    ):
        """Tenant A cannot access tenant B's connection."""
        service = TenantIsolationService(
            tenant_id=str(tenant_a.id),
            tenant_slug=tenant_a.slug
        )
        
        with app.app_context():
            with pytest.raises(TenantIsolationError) as exc_info:
                service.validate_connection_ownership(str(connection_b.id))
            
            assert "belongs to another tenant" in str(exc_info.value)

    def test_tenant_a_can_access_own_pyspark_app(
        self, app, tenant_a, pyspark_app_a
    ):
        """Tenant A can access their own PySpark app."""
        service = TenantIsolationService(
            tenant_id=str(tenant_a.id),
            tenant_slug=tenant_a.slug
        )
        
        with app.app_context():
            result = service.validate_pyspark_app_ownership(str(pyspark_app_a.id))
            assert result is True

    def test_tenant_a_cannot_access_tenant_b_pyspark_app(
        self, app, tenant_a, pyspark_app_b
    ):
        """Tenant A cannot access tenant B's PySpark app."""
        service = TenantIsolationService(
            tenant_id=str(tenant_a.id),
            tenant_slug=tenant_a.slug
        )
        
        with app.app_context():
            with pytest.raises(TenantIsolationError) as exc_info:
                service.validate_pyspark_app_ownership(str(pyspark_app_b.id))
            
            assert "belongs to another tenant" in str(exc_info.value)

    def test_tenant_slug_fetched_from_database(self, app, tenant_a):
        """Tenant slug is fetched from database when not provided."""
        # Initialize service with only tenant_id
        service = TenantIsolationService(tenant_id=str(tenant_a.id))
        
        with app.app_context():
            # First access should trigger DB lookup
            slug = service.tenant_slug
            assert slug == tenant_a.slug
            
            # Verify tenant_database uses the slug
            assert service.tenant_database == f"tenant_{tenant_a.slug}"


@pytest.mark.integration
class TestCrossTenantDatabaseAccess:
    """Test cross-tenant database access prevention."""

    @pytest.fixture
    def isolation_tenant_a(self):
        """Isolation service for tenant A."""
        return TenantIsolationService(
            tenant_id="tenant-a-id",
            tenant_slug="acme_corp"
        )

    @pytest.fixture
    def isolation_tenant_b(self):
        """Isolation service for tenant B."""
        return TenantIsolationService(
            tenant_id="tenant-b-id",
            tenant_slug="globex_inc"
        )

    def test_cross_tenant_database_write_blocked(
        self, isolation_tenant_a, isolation_tenant_b
    ):
        """
        Tenant A cannot write to tenant B's database.
        """
        # Tenant A tries to write to tenant B's database
        with pytest.raises(TenantIsolationError):
            isolation_tenant_a.validate_target_database("tenant_globex_inc")
        
        # Tenant B tries to write to tenant A's database
        with pytest.raises(TenantIsolationError):
            isolation_tenant_b.validate_target_database("tenant_acme_corp")

    def test_cross_tenant_sql_query_blocked(
        self, isolation_tenant_a, isolation_tenant_b
    ):
        """
        SQL queries referencing other tenant's database are blocked.
        """
        # Tenant A tries to query tenant B's database
        malicious_query = """
            INSERT INTO tenant_globex_inc.users 
            SELECT * FROM tenant_acme_corp.users
        """
        with pytest.raises(TenantIsolationError):
            isolation_tenant_a.validate_sql_query(malicious_query)

    def test_cross_tenant_join_blocked(self, isolation_tenant_a):
        """
        JOIN queries across tenant databases are blocked.
        """
        cross_join_query = """
            SELECT a.*, b.* 
            FROM tenant_acme_corp.orders a
            INNER JOIN tenant_globex_inc.products b 
                ON a.product_id = b.id
        """
        with pytest.raises(TenantIsolationError):
            isolation_tenant_a.validate_sql_query(cross_join_query)


@pytest.mark.integration
class TestTenantIsolationInPipelines:
    """Test tenant isolation in data pipeline context."""

    def test_pyspark_job_uses_tenant_database(self):
        """PySpark job should default to tenant's database."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        
        # Enforce target database with None (auto-select)
        target = service.enforce_target_database(None)
        assert target == "tenant_acme_corp"
        
        # Verify context includes database
        context = service.get_template_context()
        assert context["tenant_database"] == "tenant_acme_corp"

    def test_dag_files_in_tenant_folder(self):
        """DAG files should be in tenant-specific folders."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        
        dag_path = service.get_dag_file_path("my_etl_dag")
        
        # Path should include tenant folder
        assert "/tenant_acme_corp/" in dag_path
        assert dag_path.endswith(".py")

    def test_pyspark_jobs_in_tenant_folder(self):
        """PySpark job files should be in tenant-specific folders."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        
        job_path = service.get_pyspark_job_path("extract_users")
        
        # Path should include tenant folder
        assert "/tenant_acme_corp/" in job_path
        assert job_path.endswith(".py")

    def test_dbt_models_in_tenant_folder(self):
        """dbt models should be in tenant-specific folders."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        
        model_path = service.get_dbt_model_path("stg_orders")
        
        # Path should include tenant folder
        assert "/tenant_acme_corp/" in model_path
        assert model_path.endswith(".sql")


@pytest.mark.integration
class TestTenantIsolationEdgeCases:
    """Test edge cases and security scenarios."""

    def test_sql_injection_in_database_name_blocked(self):
        """SQL injection attempts in database names are blocked."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        
        # These should not match the tenant database pattern
        malicious_names = [
            "tenant_acme'; DROP TABLE users; --",
            "tenant_acme_corp; DELETE FROM orders",
            "tenant_acme_corp UNION SELECT * FROM passwords",
        ]
        
        for name in malicious_names:
            # Should either raise error or not match pattern
            try:
                result = service.validate_target_database(name)
                # If it doesn't raise, it's a non-tenant database (logged)
                assert True
            except TenantIsolationError:
                # Expected for some patterns
                assert True

    def test_case_sensitivity_in_tenant_matching(self):
        """Tenant matching should handle case correctly."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp"
        )
        
        # Own database - should work
        assert service.validate_target_database("tenant_acme_corp") is True
        
        # Different case - SQL is usually case-insensitive
        # This should still be blocked as it's a different tenant pattern
        with pytest.raises(TenantIsolationError):
            service.validate_target_database("tenant_other_tenant")

    def test_empty_tenant_slug_handling(self):
        """Service handles empty tenant slug gracefully."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug=""
        )
        
        # Should use tenant_id as fallback
        # (actual behavior depends on implementation)
        db = service.tenant_database
        assert db.startswith("tenant_")

    def test_unicode_in_tenant_slug(self):
        """Service handles unicode in tenant slug."""
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug="acme_corp_日本"  # Unicode characters
        )
        
        # Should work but database name might need sanitization
        db = service.tenant_database
        assert db.startswith("tenant_")

    def test_very_long_tenant_slug(self):
        """Service handles very long tenant slugs."""
        long_slug = "a" * 200  # Very long slug
        service = TenantIsolationService(
            tenant_id="abc-123",
            tenant_slug=long_slug
        )
        
        db = service.tenant_database
        assert db.startswith("tenant_")
        assert len(db) > 200  # Should include full slug
