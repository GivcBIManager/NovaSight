"""
Unit Tests for Data Source Service
===================================

Comprehensive tests for the ConnectionService including:
- CRUD operations
- Credential encryption
- Connection testing
- Schema discovery
"""

import pytest
import uuid
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from app.models.connection import DataConnection, DatabaseType, ConnectionStatus
from app.services.connection_service import ConnectionService


class TestConnectionServiceCreate:
    """Tests for connection creation functionality."""
    
    @pytest.fixture
    def tenant_id(self):
        """Create test tenant ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user_id(self):
        """Create test user ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def service(self, tenant_id, mocker):
        """Create ConnectionService with mocked credentials."""
        mocker.patch.object(
            ConnectionService,
            '__init__',
            lambda self, tid: setattr(self, 'tenant_id', tid) or setattr(
                self, 'credential_service', MagicMock()
            )
        )
        svc = ConnectionService(tenant_id)
        svc.credential_service.encrypt.return_value = "encrypted_password"
        return svc
    
    def test_create_connection_postgresql(self, service, tenant_id, user_id):
        """Test creating a PostgreSQL connection."""
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.first.return_value = None
            
            with patch('app.extensions.db.session.add'):
                with patch('app.extensions.db.session.commit'):
                    connection = service.create_connection(
                        name="Test PostgreSQL",
                        db_type="postgresql",
                        host="localhost",
                        port=5432,
                        database="testdb",
                        username="user",
                        password="password",
                        created_by=user_id
                    )
                    
                    assert connection.name == "Test PostgreSQL"
                    assert connection.db_type == DatabaseType.POSTGRESQL
                    assert connection.host == "localhost"
                    assert connection.port == 5432
    
    def test_create_connection_duplicate_name_rejected(self, service, tenant_id, user_id):
        """Test that duplicate connection names are rejected."""
        existing_conn = Mock(spec=DataConnection)
        existing_conn.name = "Existing Connection"
        
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.first.return_value = existing_conn
            
            with pytest.raises(ValueError, match="already exists"):
                service.create_connection(
                    name="Existing Connection",
                    db_type="postgresql",
                    host="localhost",
                    port=5432,
                    database="testdb",
                    username="user",
                    password="password",
                    created_by=user_id
                )
    
    def test_create_connection_invalid_db_type(self, service, user_id):
        """Test that invalid database type is rejected."""
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.first.return_value = None
            
            with pytest.raises(ValueError, match="Invalid database type"):
                service.create_connection(
                    name="Invalid Type",
                    db_type="invalid_database",
                    host="localhost",
                    port=5432,
                    database="testdb",
                    username="user",
                    password="password",
                    created_by=user_id
                )
    
    def test_credentials_encrypted_on_create(self, service, tenant_id, user_id):
        """Test that credentials are encrypted when creating connection."""
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.first.return_value = None
            
            with patch('app.extensions.db.session.add'):
                with patch('app.extensions.db.session.commit'):
                    connection = service.create_connection(
                        name="Encrypted Test",
                        db_type="postgresql",
                        host="localhost",
                        port=5432,
                        database="testdb",
                        username="user",
                        password="my_secret_password",
                        created_by=user_id
                    )
                    
                    # Verify encryption was called
                    service.credential_service.encrypt.assert_called_once_with("my_secret_password")
                    assert connection.password_encrypted == "encrypted_password"


class TestConnectionServiceRead:
    """Tests for connection reading/listing functionality."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def service(self, tenant_id, mocker):
        mocker.patch.object(
            ConnectionService,
            '__init__',
            lambda self, tid: setattr(self, 'tenant_id', tid)
        )
        return ConnectionService(tenant_id)
    
    @pytest.fixture
    def mock_connections(self, tenant_id):
        """Create mock connections for testing."""
        connections = []
        for i in range(5):
            conn = Mock(spec=DataConnection)
            conn.id = uuid.uuid4()
            conn.tenant_id = tenant_id
            conn.name = f"Connection {i}"
            conn.db_type = DatabaseType.POSTGRESQL
            conn.status = ConnectionStatus.ACTIVE
            conn.to_dict.return_value = {
                "id": str(conn.id),
                "name": conn.name,
                "db_type": "postgresql",
            }
            connections.append(conn)
        return connections
    
    def test_list_connections(self, service, mock_connections):
        """Test listing connections."""
        mock_pagination = Mock()
        mock_pagination.items = mock_connections
        mock_pagination.total = 5
        mock_pagination.pages = 1
        mock_pagination.has_next = False
        mock_pagination.has_prev = False
        
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.order_by.return_value.paginate.return_value = mock_pagination
            
            result = service.list_connections(page=1, per_page=20)
            
            assert len(result["connections"]) == 5
            assert result["pagination"]["total"] == 5
    
    def test_list_connections_with_filter(self, service, mock_connections):
        """Test listing connections with type filter."""
        mock_pagination = Mock()
        mock_pagination.items = mock_connections[:2]
        mock_pagination.total = 2
        mock_pagination.pages = 1
        mock_pagination.has_next = False
        mock_pagination.has_prev = False
        
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.filter.return_value.order_by.return_value.paginate.return_value = mock_pagination
            
            result = service.list_connections(page=1, per_page=20, db_type="postgresql")
            
            assert len(result["connections"]) == 2
    
    def test_get_connection_exists(self, service, tenant_id):
        """Test getting an existing connection."""
        conn_id = str(uuid.uuid4())
        mock_conn = Mock(spec=DataConnection)
        mock_conn.id = conn_id
        mock_conn.tenant_id = tenant_id
        
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.first.return_value = mock_conn
            
            result = service.get_connection(conn_id)
            
            assert result is not None
            assert str(result.id) == conn_id
    
    def test_get_connection_not_found(self, service):
        """Test getting a non-existent connection."""
        conn_id = str(uuid.uuid4())
        
        with patch.object(DataConnection, 'query') as mock_query:
            mock_query.filter.return_value.first.return_value = None
            
            result = service.get_connection(conn_id)
            
            assert result is None


class TestConnectionServiceUpdate:
    """Tests for connection update functionality."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def service(self, tenant_id, mocker):
        mocker.patch.object(
            ConnectionService,
            '__init__',
            lambda self, tid: (
                setattr(self, 'tenant_id', tid) or
                setattr(self, 'credential_service', MagicMock())
            )
        )
        svc = ConnectionService(tenant_id)
        svc.credential_service.encrypt.return_value = "new_encrypted_password"
        return svc
    
    @pytest.fixture
    def existing_connection(self, tenant_id):
        conn = Mock(spec=DataConnection)
        conn.id = uuid.uuid4()
        conn.tenant_id = tenant_id
        conn.name = "Original Name"
        conn.host = "old-host"
        conn.port = 5432
        return conn
    
    def test_update_connection_name(self, service, existing_connection):
        """Test updating connection name."""
        with patch.object(service, 'get_connection', return_value=existing_connection):
            with patch('app.extensions.db.session.commit'):
                result = service.update_connection(
                    str(existing_connection.id),
                    name="Updated Name"
                )
                
                assert result.name == "Updated Name"
    
    def test_update_connection_password(self, service, existing_connection):
        """Test updating connection password re-encrypts."""
        with patch.object(service, 'get_connection', return_value=existing_connection):
            with patch('app.extensions.db.session.commit'):
                service.update_connection(
                    str(existing_connection.id),
                    password="new_secret_password"
                )
                
                service.credential_service.encrypt.assert_called_with("new_secret_password")
    
    def test_update_nonexistent_connection(self, service):
        """Test updating non-existent connection returns None."""
        with patch.object(service, 'get_connection', return_value=None):
            result = service.update_connection(
                str(uuid.uuid4()),
                name="New Name"
            )
            
            assert result is None


class TestConnectionServiceTest:
    """Tests for connection testing functionality."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def service(self, tenant_id, mocker):
        mocker.patch.object(
            ConnectionService,
            '__init__',
            lambda self, tid: (
                setattr(self, 'tenant_id', tid) or
                setattr(self, 'credential_service', MagicMock())
            )
        )
        svc = ConnectionService(tenant_id)
        svc.credential_service.decrypt.return_value = "decrypted_password"
        return svc
    
    def test_test_connection_params_success(self, service):
        """Test successful connection parameter testing."""
        mock_connector = MagicMock()
        mock_connector.test_connection.return_value = True
        mock_connector.get_schemas.return_value = ["public", "analytics"]
        mock_connector.__enter__ = Mock(return_value=mock_connector)
        mock_connector.__exit__ = Mock(return_value=False)
        
        with patch('app.connectors.ConnectorRegistry.create_connector', return_value=mock_connector):
            result = service.test_connection_params(
                db_type="postgresql",
                host="localhost",
                port=5432,
                database="testdb",
                username="user",
                password="password"
            )
            
            assert result["success"] is True
            assert result["details"]["schemas_count"] == 2
    
    def test_test_connection_params_failure(self, service):
        """Test failed connection parameter testing."""
        mock_connector = MagicMock()
        mock_connector.test_connection.side_effect = Exception("Connection refused")
        mock_connector.__enter__ = Mock(return_value=mock_connector)
        mock_connector.__exit__ = Mock(return_value=False)
        
        with patch('app.connectors.ConnectorRegistry.create_connector', return_value=mock_connector):
            result = service.test_connection_params(
                db_type="postgresql",
                host="localhost",
                port=5432,
                database="testdb",
                username="user",
                password="password"
            )
            
            assert result["success"] is False
            assert "Connection refused" in result["message"]


class TestConnectionServiceSchema:
    """Tests for schema discovery functionality."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def service(self, tenant_id, mocker):
        mocker.patch.object(
            ConnectionService,
            '__init__',
            lambda self, tid: (
                setattr(self, 'tenant_id', tid) or
                setattr(self, 'credential_service', MagicMock())
            )
        )
        svc = ConnectionService(tenant_id)
        svc.credential_service.decrypt.return_value = "password"
        return svc
    
    @pytest.fixture
    def mock_connection(self, tenant_id):
        conn = Mock(spec=DataConnection)
        conn.id = uuid.uuid4()
        conn.tenant_id = tenant_id
        conn.db_type = DatabaseType.POSTGRESQL
        conn.host = "localhost"
        conn.port = 5432
        conn.database = "testdb"
        conn.username = "user"
        conn.password_encrypted = "encrypted"
        conn.ssl_mode = None
        conn.extra_params = {}
        return conn
    
    def test_get_schema_with_tables(self, service, mock_connection):
        """Test getting schema with tables."""
        from app.connectors import TableInfo, ColumnInfo
        
        mock_table = TableInfo(
            name="users",
            schema="public",
            row_count=100,
            columns=[
                ColumnInfo(name="id", data_type="integer", nullable=False, primary_key=True),
                ColumnInfo(name="email", data_type="varchar", nullable=False),
            ]
        )
        
        mock_connector = MagicMock()
        mock_connector.get_schemas.return_value = ["public"]
        mock_connector.get_tables.return_value = [mock_table]
        mock_connector.__enter__ = Mock(return_value=mock_connector)
        mock_connector.__exit__ = Mock(return_value=False)
        
        with patch.object(service, 'get_connection', return_value=mock_connection):
            with patch('app.connectors.ConnectorRegistry.create_connector', return_value=mock_connector):
                result = service.get_schema(str(mock_connection.id), include_columns=True)
                
                assert "public" in result["schemas"]
                assert "users" in [t["name"] for t in result["tables"]["public"]]


class TestConnectionCredentialSecurity:
    """Tests for credential security and encryption."""
    
    def test_password_never_in_plaintext(self, db_session, sample_tenant, sample_user):
        """Test that passwords are never stored in plaintext."""
        from tests.fixtures.sample_data import SampleConnections
        
        service = ConnectionService(str(sample_tenant.id))
        
        with patch.object(service.credential_service, 'encrypt', return_value="encrypted") as mock_encrypt:
            with patch('app.extensions.db.session.add'):
                with patch('app.extensions.db.session.commit'):
                    with patch.object(DataConnection, 'query') as mock_query:
                        mock_query.filter.return_value.first.return_value = None
                        
                        connection = service.create_connection(
                            **SampleConnections.POSTGRESQL,
                            created_by=str(sample_user.id)
                        )
                        
                        # Verify password was encrypted
                        mock_encrypt.assert_called()
                        assert connection.password_encrypted == "encrypted"
    
    def test_password_masked_in_response(self, db_session, sample_connection):
        """Test that password is masked when converting to dict."""
        result = sample_connection.to_dict(mask_password=True)
        
        assert result["password"] == "********"
        assert "encrypted" not in result["password"]
