"""
NovaSight Connector Tests
=========================

Unit tests for data source connectors.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.connectors import (
    BaseConnector,
    ConnectionConfig,
    ColumnInfo,
    TableInfo,
    ConnectorRegistry,
    PostgreSQLConnector,
    MySQLConnector,
    ConnectorException,
    ConnectionTestException
)


class TestConnectionConfig:
    """Test ConnectionConfig validation."""
    
    def test_valid_config(self):
        """Test valid configuration."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="test_db",
            username="user",
            password="password123"
        )
        
        assert config.host == "localhost"
        assert config.port == 5432
        assert config.ssl is True
    
    def test_invalid_port(self):
        """Test invalid port validation."""
        with pytest.raises(ValueError):
            ConnectionConfig(
                host="localhost",
                port=99999,  # Invalid port
                database="test_db",
                username="user",
                password="password"
            )
    
    def test_extra_params(self):
        """Test extra parameters."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="test_db",
            username="user",
            password="password",
            extra_params={"timeout": 30, "pool_size": 5}
        )
        
        assert config.extra_params["timeout"] == 30
        assert config.extra_params["pool_size"] == 5


class TestConnectorRegistry:
    """Test ConnectorRegistry."""
    
    def test_list_connectors(self):
        """Test listing registered connectors."""
        connectors = ConnectorRegistry.list_connectors()
        
        assert "postgresql" in connectors
        assert "mysql" in connectors
    
    def test_get_connector(self):
        """Test getting connector class."""
        connector_class = ConnectorRegistry.get("postgresql")
        
        assert connector_class == PostgreSQLConnector
    
    def test_get_unknown_connector(self):
        """Test getting unknown connector."""
        with pytest.raises(ValueError, match="Unknown connector type"):
            ConnectorRegistry.get("unknown_db")
    
    def test_get_connector_info(self):
        """Test getting connector info."""
        info = ConnectorRegistry.get_connector_info("postgresql")
        
        assert info["type"] == "postgresql"
        assert info["default_port"] == 5432
        assert info["supports_ssl"] is True
        assert "password" in info["supported_auth_methods"]
    
    def test_create_connector(self):
        """Test creating connector instance."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="test_db",
            username="user",
            password="password"
        )
        
        connector = ConnectorRegistry.create_connector("postgresql", config)
        
        assert isinstance(connector, PostgreSQLConnector)
        assert connector.config.host == "localhost"


class TestPostgreSQLConnector:
    """Test PostgreSQL connector."""
    
    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return ConnectionConfig(
            host="localhost",
            port=5432,
            database="test_db",
            username="test_user",
            password="test_password",
            ssl=False
        )
    
    @pytest.fixture
    def connector(self, config):
        """Create connector instance."""
        return PostgreSQLConnector(config)
    
    @patch('psycopg2.connect')
    def test_connect(self, mock_connect, connector):
        """Test connection."""
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        
        connector.connect()
        
        assert connector._is_connected is True
        assert connector._connection == mock_conn
        mock_connect.assert_called_once()
    
    @patch('psycopg2.connect')
    def test_connect_failure(self, mock_connect, connector):
        """Test connection failure."""
        mock_connect.side_effect = Exception("Connection failed")
        
        with pytest.raises(ConnectorException, match="PostgreSQL connection failed"):
            connector.connect()
    
    @patch('psycopg2.connect')
    def test_test_connection(self, mock_connect, connector):
        """Test connection test."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = ("PostgreSQL 14.0",)
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connect.return_value = mock_conn
        
        connector.connect()
        result = connector.test_connection()
        
        assert result is True
        mock_cursor.execute.assert_called_once_with("SELECT version()")
    
    @patch('psycopg2.connect')
    def test_get_schemas(self, mock_connect, connector):
        """Test getting schemas."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = [("public",), ("sales",), ("analytics",)]
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connect.return_value = mock_conn
        
        connector.connect()
        schemas = connector.get_schemas()
        
        assert schemas == ["public", "sales", "analytics"]
    
    @patch('psycopg2.connect')
    def test_get_tables(self, mock_connect, connector):
        """Test getting tables."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = [
            {
                'table_name': 'users',
                'table_schema': 'public',
                'table_type': 'BASE TABLE',
                'comment': 'User accounts',
                'row_count': 1000
            },
            {
                'table_name': 'orders',
                'table_schema': 'public',
                'table_type': 'BASE TABLE',
                'comment': None,
                'row_count': 5000
            }
        ]
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connect.return_value = mock_conn
        
        connector.connect()
        tables = connector.get_tables("public")
        
        assert len(tables) == 2
        assert tables[0].name == "users"
        assert tables[0].row_count == 1000
        assert tables[1].name == "orders"
    
    @patch('psycopg2.connect')
    def test_fetch_data(self, mock_connect, connector):
        """Test fetching data."""
        mock_conn = Mock()
        mock_cursor = Mock()
        
        # Mock batched results
        mock_cursor.fetchmany.side_effect = [
            [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}],
            [{'id': 3, 'name': 'Charlie'}],
            []  # End of data
        ]
        
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connect.return_value = mock_conn
        
        connector.connect()
        
        batches = list(connector.fetch_data("SELECT * FROM users", batch_size=2))
        
        assert len(batches) == 2
        assert len(batches[0]) == 2
        assert len(batches[1]) == 1
        assert batches[0][0]['name'] == 'Alice'


class TestMySQLConnector:
    """Test MySQL connector."""
    
    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return ConnectionConfig(
            host="localhost",
            port=3306,
            database="test_db",
            username="test_user",
            password="test_password",
            ssl=False
        )
    
    @pytest.fixture
    def connector(self, config):
        """Create connector instance."""
        return MySQLConnector(config)
    
    @patch('mysql.connector.connect')
    def test_connect(self, mock_connect, connector):
        """Test connection."""
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        
        connector.connect()
        
        assert connector._is_connected is True
        assert connector._connection == mock_conn
    
    @patch('mysql.connector.connect')
    def test_test_connection(self, mock_connect, connector):
        """Test connection test."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = ("8.0.32",)
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_connect.return_value = mock_conn
        
        connector.connect()
        result = connector.test_connection()
        
        assert result is True
        mock_cursor.execute.assert_called_once_with("SELECT VERSION()")
    
    @patch('mysql.connector.connect')
    def test_get_schemas(self, mock_connect, connector):
        """Test getting schemas."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = [("app_db",), ("analytics",)]
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_connect.return_value = mock_conn
        
        connector.connect()
        schemas = connector.get_schemas()
        
        assert schemas == ["app_db", "analytics"]


class TestColumnInfo:
    """Test ColumnInfo dataclass."""
    
    def test_create_column_info(self):
        """Test creating column info."""
        col = ColumnInfo(
            name="id",
            data_type="integer",
            nullable=False,
            primary_key=True,
            comment="Primary key"
        )
        
        assert col.name == "id"
        assert col.data_type == "integer"
        assert col.nullable is False
        assert col.primary_key is True
        assert col.comment == "Primary key"
    
    def test_column_with_defaults(self):
        """Test column with default values."""
        col = ColumnInfo(
            name="status",
            data_type="varchar",
            nullable=True
        )
        
        assert col.primary_key is False
        assert col.comment == ""


class TestTableInfo:
    """Test TableInfo dataclass."""
    
    def test_create_table_info(self):
        """Test creating table info."""
        columns = [
            ColumnInfo(name="id", data_type="integer", nullable=False, primary_key=True),
            ColumnInfo(name="name", data_type="varchar", nullable=False),
        ]
        
        table = TableInfo(
            name="users",
            schema="public",
            columns=columns,
            row_count=100,
            comment="User table"
        )
        
        assert table.name == "users"
        assert table.schema == "public"
        assert len(table.columns) == 2
        assert table.row_count == 100
        assert table.comment == "User table"
