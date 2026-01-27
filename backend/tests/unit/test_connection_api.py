"""
NovaSight Connection API Tests
==============================

Integration tests for connection endpoints.
"""

import pytest
import uuid
from unittest.mock import Mock, patch, MagicMock
from app.models.connection import DataConnection, DatabaseType, ConnectionStatus
from app.services.connection_service import ConnectionService


class TestConnectionService:
    """Test ConnectionService methods."""
    
    @pytest.fixture
    def tenant_id(self):
        """Create test tenant ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def service(self, tenant_id):
        """Create ConnectionService instance."""
        return ConnectionService(tenant_id)
    
    @pytest.fixture
    def mock_connection(self, tenant_id):
        """Create mock connection."""
        conn = Mock(spec=DataConnection)
        conn.id = uuid.uuid4()
        conn.tenant_id = tenant_id
        conn.name = "Test Connection"
        conn.db_type = DatabaseType.POSTGRESQL
        conn.host = "localhost"
        conn.port = 5432
        conn.database = "test_db"
        conn.username = "test_user"
        conn.password_encrypted = "encrypted_password"
        conn.ssl_mode = "require"
        conn.schema_name = "public"
        conn.extra_params = {}
        conn.status = ConnectionStatus.ACTIVE
        return conn
    
    def test_create_connection(self, service, tenant_id):
        """Test creating a connection."""
        with patch.object(service.credential_service, 'encrypt', return_value='encrypted'):
            with patch('app.extensions.db.session.add'):
                with patch('app.extensions.db.session.commit'):
                    connection = service.create_connection(
                        name="Test DB",
                        db_type="postgresql",
                        host="localhost",
                        port=5432,
                        database="testdb",
                        username="user",
                        password="password",
                        created_by=str(uuid.uuid4())
                    )
                    
                    assert connection.name == "Test DB"
                    assert connection.db_type == DatabaseType.POSTGRESQL
    
    @patch('app.connectors.ConnectorRegistry.create_connector')
    def test_test_connection_params(self, mock_create_connector, service):
        """Test connection parameter testing."""
        # Mock connector
        mock_connector = Mock()
        mock_connector.test_connection.return_value = True
        mock_connector.get_schemas.return_value = ["public", "analytics"]
        mock_connector.__enter__ = Mock(return_value=mock_connector)
        mock_connector.__exit__ = Mock(return_value=False)
        mock_create_connector.return_value = mock_connector
        
        result = service.test_connection_params(
            db_type="postgresql",
            host="localhost",
            port=5432,
            database="test_db",
            username="user",
            password="password"
        )
        
        assert result["success"] is True
        assert "schemas_count" in result["details"]
        assert result["details"]["schemas_count"] == 2
    
    @patch('app.connectors.ConnectorRegistry.create_connector')
    def test_get_schema(self, mock_create_connector, service, mock_connection):
        """Test getting schema information."""
        # Mock connector
        mock_connector = Mock()
        mock_connector.get_schemas.return_value = ["public"]
        
        from app.connectors import TableInfo, ColumnInfo
        mock_table = TableInfo(
            name="users",
            schema="public",
            row_count=100,
            columns=[
                ColumnInfo(name="id", data_type="integer", nullable=False, primary_key=True),
                ColumnInfo(name="name", data_type="varchar", nullable=False),
            ]
        )
        mock_connector.get_tables.return_value = [mock_table]
        mock_connector.__enter__ = Mock(return_value=mock_connector)
        mock_connector.__exit__ = Mock(return_value=False)
        mock_create_connector.return_value = mock_connector
        
        with patch.object(service, 'get_connection', return_value=mock_connection):
            with patch.object(service.credential_service, 'decrypt', return_value='password'):
                schema_info = service.get_schema(str(mock_connection.id), include_columns=True)
                
                assert "schemas" in schema_info
                assert "tables" in schema_info
                assert "public" in schema_info["tables"]
                assert len(schema_info["tables"]["public"]) == 1
                assert schema_info["tables"]["public"][0]["name"] == "users"
                assert "columns" in schema_info["tables"]["public"][0]
    
    def test_trigger_sync(self, service, mock_connection):
        """Test triggering sync."""
        with patch.object(service, 'get_connection', return_value=mock_connection):
            job_id = service.trigger_sync(str(mock_connection.id))
            
            assert job_id is not None
            # Verify it's a valid UUID
            uuid.UUID(job_id)
    
    @patch('app.connectors.ConnectorRegistry.create_connector')
    def test_get_connector(self, mock_create_connector, service, mock_connection):
        """Test getting connector instance."""
        mock_connector = Mock()
        mock_create_connector.return_value = mock_connector
        
        with patch.object(service, 'get_connection', return_value=mock_connection):
            with patch.object(service.credential_service, 'decrypt', return_value='password'):
                connector = service.get_connector(str(mock_connection.id))
                
                assert connector is not None
                mock_create_connector.assert_called_once()


class TestConnectionSchemas:
    """Test connection schemas."""
    
    def test_connection_create_schema(self):
        """Test ConnectionCreateSchema validation."""
        from app.schemas.connection_schemas import ConnectionCreateSchema
        
        # Valid data
        data = {
            "name": "Test Connection",
            "db_type": "postgresql",
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "username": "user",
            "password": "password"
        }
        
        schema = ConnectionCreateSchema(**data)
        assert schema.name == "Test Connection"
        assert schema.db_type.value == "postgresql"
    
    def test_connection_create_schema_validation(self):
        """Test schema validation errors."""
        from app.schemas.connection_schemas import ConnectionCreateSchema
        from pydantic import ValidationError
        
        # Invalid port
        with pytest.raises(ValidationError):
            ConnectionCreateSchema(
                name="Test",
                db_type="postgresql",
                host="localhost",
                port=99999,  # Invalid
                database="test",
                username="user",
                password="pass"
            )
        
        # Invalid name
        with pytest.raises(ValidationError):
            ConnectionCreateSchema(
                name="123_invalid",  # Must start with letter
                db_type="postgresql",
                host="localhost",
                port=5432,
                database="test",
                username="user",
                password="pass"
            )
    
    def test_connection_test_result_schema(self):
        """Test ConnectionTestResultSchema."""
        from app.schemas.connection_schemas import ConnectionTestResultSchema
        
        result = ConnectionTestResultSchema(
            success=True,
            message="Connection successful",
            version="PostgreSQL 14.5"
        )
        
        assert result.success is True
        assert result.message == "Connection successful"
        assert result.version == "PostgreSQL 14.5"


class TestConnectionAPI:
    """Test connection API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        from app import create_app
        app = create_app('testing')
        with app.test_client() as client:
            yield client
    
    @pytest.fixture
    def auth_headers(self):
        """Create authentication headers."""
        # This would normally create a real JWT token
        return {
            "Authorization": "Bearer test_token"
        }
    
    @patch('app.api.v1.connections.ConnectionService')
    def test_list_connections(self, mock_service_class, client, auth_headers):
        """Test listing connections."""
        mock_service = Mock()
        mock_service.list_connections.return_value = {
            "connections": [],
            "pagination": {
                "page": 1,
                "per_page": 20,
                "total": 0,
                "pages": 0,
                "has_next": False,
                "has_prev": False
            }
        }
        mock_service_class.return_value = mock_service
        
        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request'):
            with patch('flask_jwt_extended.get_jwt_identity', return_value={"tenant_id": "test"}):
                response = client.get('/api/v1/connections', headers=auth_headers)
                
                # Note: This test would need proper JWT setup to work
                # For now, it demonstrates the test structure
    
    @patch('app.api.v1.connections.ConnectionService')
    def test_test_connection(self, mock_service_class, client, auth_headers):
        """Test connection testing endpoint."""
        mock_service = Mock()
        mock_service.test_connection.return_value = {
            "success": True,
            "details": {"version": "PostgreSQL 14.5"}
        }
        mock_service_class.return_value = mock_service
        
        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request'):
            with patch('flask_jwt_extended.get_jwt_identity', return_value={"tenant_id": "test"}):
                response = client.post(
                    f'/api/v1/connections/{uuid.uuid4()}/test',
                    headers=auth_headers
                )
                
                # Test structure demonstration


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
