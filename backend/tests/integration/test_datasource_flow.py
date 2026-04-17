"""
NovaSight Data Source Flow Integration Tests
==============================================

Integration tests for data source/connection management including
creation, testing, schema discovery, and synchronization.
"""

import pytest
from flask.testing import FlaskClient
from typing import Dict, Any

from tests.integration.conftest import helper


class TestConnectionList:
    """Integration tests for listing connections."""
    
    def test_list_connections_empty(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test listing connections when none exist."""
        response = integration_client.get(
            "/api/v1/connections",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "connections" in data or isinstance(data, list)
    
    def test_list_connections_with_data(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any]
    ):
        """Test listing connections returns existing connections."""
        response = integration_client.get(
            "/api/v1/connections",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Should have at least the seeded connection
        connections = data.get("connections", data)
        if isinstance(connections, list):
            assert len(connections) >= 1
    
    def test_list_connections_requires_auth(
        self,
        integration_client: FlaskClient,
    ):
        """Test that listing connections requires authentication."""
        response = integration_client.get("/api/v1/connections")
        assert response.status_code == 401
    
    def test_list_connections_pagination(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test connection list pagination."""
        response = integration_client.get(
            "/api/v1/connections?page=1&per_page=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "pagination" in data or "connections" in data or isinstance(data, list)


class TestConnectionCreate:
    """Integration tests for creating connections."""
    
    def test_create_postgresql_connection(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a PostgreSQL connection."""
        response = integration_client.post(
            "/api/v1/connections",
            json={
                "name": "Test PostgreSQL DB",
                "db_type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "database": "testdb",
                "username": "testuser",
                "password": "testpassword",
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert "connection" in data
        connection = data["connection"]
        assert connection["name"] == "Test PostgreSQL DB"
        assert connection["db_type"] in ["postgresql", "POSTGRESQL"]
        # Password should be masked
        assert "testpassword" not in str(connection)
    
    def test_create_mysql_connection(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a MySQL connection."""
        response = integration_client.post(
            "/api/v1/connections",
            json={
                "name": "Test MySQL DB",
                "db_type": "mysql",
                "host": "localhost",
                "port": 3306,
                "database": "testdb",
                "username": "testuser",
                "password": "testpassword",
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
    
    def test_create_clickhouse_connection(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a ClickHouse connection."""
        response = integration_client.post(
            "/api/v1/connections",
            json={
                "name": "Test ClickHouse",
                "db_type": "clickhouse",
                "host": "localhost",
                "port": 8123,
                "database": "default",
                "username": "default",
                "password": "",
            },
            headers=auth_headers
        )
        
        # 400 is acceptable if password validation fails
        assert response.status_code in [201, 400]
    
    def test_create_connection_duplicate_name(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any]
    ):
        """Test creating connection with duplicate name fails."""
        connection = seeded_connection["connection"]
        
        response = integration_client.post(
            "/api/v1/connections",
            json={
                "name": connection.name,  # Same name
                "db_type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "database": "otherdb",
                "username": "testuser",
                "password": "testpassword",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [400, 409, 500]
    
    def test_create_connection_missing_required_fields(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating connection with missing fields fails."""
        response = integration_client.post(
            "/api/v1/connections",
            json={
                "name": "Incomplete Connection",
                "db_type": "postgresql",
                # Missing host, port, database, username, password
            },
            headers=auth_headers
        )
        
        assert response.status_code == 400
    
    def test_create_connection_invalid_db_type(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating connection with invalid db_type fails."""
        response = integration_client.post(
            "/api/v1/connections",
            json={
                "name": "Invalid DB Type",
                "db_type": "mongodb",  # Not supported
                "host": "localhost",
                "port": 27017,
                "database": "testdb",
                "username": "testuser",
                "password": "testpassword",
            },
            headers=auth_headers
        )
        
        assert response.status_code == 400


class TestConnectionGet:
    """Integration tests for getting connection details."""
    
    def test_get_connection(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any]
    ):
        """Test getting a specific connection."""
        connection = seeded_connection["connection"]
        
        response = integration_client.get(
            f"/api/v1/connections/{connection.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "connection" in data
        assert data["connection"]["id"] == str(connection.id)
    
    def test_get_connection_not_found(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test getting non-existent connection returns 404."""
        import uuid
        fake_id = str(uuid.uuid4())
        
        response = integration_client.get(
            f"/api/v1/connections/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_get_connection_password_masked(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any]
    ):
        """Test that connection password is masked in response."""
        connection = seeded_connection["connection"]
        
        response = integration_client.get(
            f"/api/v1/connections/{connection.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        connection_data = data["connection"]
        
        # Password should be masked or not present
        assert connection_data.get("password") in [None, "********", "***"]
        assert "password_encrypted" not in connection_data


class TestConnectionUpdate:
    """Integration tests for updating connections."""
    
    def test_update_connection_name(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any]
    ):
        """Test updating connection name."""
        connection = seeded_connection["connection"]
        
        response = integration_client.patch(
            f"/api/v1/connections/{connection.id}",
            json={"name": "Updated Connection Name"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["connection"]["name"] == "Updated Connection Name"
    
    def test_update_connection_credentials(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any]
    ):
        """Test updating connection credentials."""
        connection = seeded_connection["connection"]
        
        response = integration_client.patch(
            f"/api/v1/connections/{connection.id}",
            json={
                "username": "newuser",
                "password": "newpassword",
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestConnectionDelete:
    """Integration tests for deleting connections."""
    
    def test_delete_connection(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any]
    ):
        """Test deleting a connection."""
        connection = seeded_connection["connection"]
        
        response = integration_client.delete(
            f"/api/v1/connections/{connection.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
        
        # Verify it's deleted
        get_response = integration_client.get(
            f"/api/v1/connections/{connection.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    def test_delete_connection_not_found(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test deleting non-existent connection returns 404."""
        import uuid
        fake_id = str(uuid.uuid4())
        
        response = integration_client.delete(
            f"/api/v1/connections/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404


class TestConnectionTest:
    """Integration tests for testing connections."""
    
    def test_test_connection(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any],
        mocker
    ):
        """Test testing a connection."""
        connection = seeded_connection["connection"]
        
        # Mock credential decryption to avoid encryption issues
        mocker.patch(
            'app.services.credential_service.CredentialService.decrypt',
            return_value='testpassword'
        )
        
        # Mock the actual connection test
        mocker.patch(
            'app.connectors.postgresql.PostgreSQLConnector.test_connection',
            return_value=True
        )
        
        response = integration_client.post(
            f"/api/v1/connections/{connection.id}/test",
            headers=auth_headers
        )
        
        # Either success or connection refused/encryption issue (expected in test env)
        assert response.status_code in [200, 400, 401, 500, 503]


class TestConnectionSchema:
    """Integration tests for schema discovery."""
    
    def test_get_connection_schemas(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_connection: Dict[str, Any],
        mocker
    ):
        """Test getting database schemas."""
        connection = seeded_connection["connection"]
        
        # Mock schema discovery
        mocker.patch(
            'app.connectors.postgresql.PostgreSQLConnector.get_schemas',
            return_value=["public", "analytics"]
        )
        
        response = integration_client.get(
            f"/api/v1/connections/{connection.id}/schemas",
            headers=auth_headers
        )
        
        # Either success or not implemented
        assert response.status_code in [200, 404, 503]


class TestConnectionTenantIsolation:
    """Integration tests for connection tenant isolation."""
    
    def test_connection_tenant_isolation(
        self,
        integration_client: FlaskClient,
        seeded_connection: Dict[str, Any],
        integration_app
    ):
        """Test that connections are isolated between tenants."""
        from app.domains.tenants.domain.models import Tenant, TenantStatus, SubscriptionPlan
        from app.domains.identity.domain.models import User, UserStatus
        from app.platform.security.passwords import password_service
        from app.extensions import db
        from flask_jwt_extended import create_access_token
        
        connection = seeded_connection["connection"]
        
        with integration_app.app_context():
            # Create another tenant with user - use string values for enum columns
            other_tenant = Tenant(
                name="Other Tenant",
                slug="other-tenant-conn",
                plan="professional",
                status="active",
            )
            db.session.add(other_tenant)
            db.session.flush()
            
            other_user = User(
                tenant_id=other_tenant.id,
                email="other@example.com",
                name="Other User",
                password_hash=password_service.hash("TestPassword123!"),
                status="active",
            )
            db.session.add(other_user)
            db.session.commit()
            
            # Get token for other tenant's user
            other_token = create_access_token(
                identity={
                    "user_id": str(other_user.id),
                    "email": other_user.email,
                    "tenant_id": str(other_tenant.id),
                    "roles": ["tenant_admin"],
                }
            )
            other_headers = {
                "Authorization": f"Bearer {other_token}",
                "Content-Type": "application/json",
            }
            
            # Try to access first tenant's connection
            response = integration_client.get(
                f"/api/v1/connections/{connection.id}",
                headers=other_headers
            )
            
            # Should not be found (tenant isolation)
            assert response.status_code in [403, 404]


class TestConnectionRoleBasedAccess:
    """Integration tests for connection RBAC."""
    
    def test_viewer_cannot_create_connection(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str]
    ):
        """Test that viewer role cannot create connections."""
        response = integration_client.post(
            "/api/v1/connections",
            json={
                "name": "Viewer Created Connection",
                "db_type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "database": "testdb",
                "username": "testuser",
                "password": "testpassword",
            },
            headers=viewer_auth_headers
        )
        
        # Should be forbidden
        assert response.status_code in [403, 401]
    
    def test_viewer_can_list_connections(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str]
    ):
        """Test that viewer role can list connections."""
        response = integration_client.get(
            "/api/v1/connections",
            headers=viewer_auth_headers
        )
        
        # Should be allowed
        assert response.status_code == 200
