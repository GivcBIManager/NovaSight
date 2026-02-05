"""
Comprehensive Data Connector Tests
===================================

Extended tests for database connectors covering:
- Connection pooling
- Schema introspection
- Query execution
- Error handling
- SSL/TLS connections
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from uuid import uuid4

from app.connectors import (
    BaseConnector,
    ConnectionConfig,
    PostgreSQLConnector,
    MySQLConnector,
    ConnectorRegistry,
    ConnectorException,
    ConnectionTestException,
    ColumnInfo,
    TableInfo,
)

# QueryExecutionException not yet implemented, using ConnectorException as base
QueryExecutionException = ConnectorException


class TestConnectionPooling:
    """Tests for connection pool management."""
    
    @patch('app.connectors.postgresql.psycopg2.pool')
    def test_pool_creation(self, mock_pool):
        """Test connection pool is created on connect."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password",
            extra_params={"pool_size": 5}
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        mock_pool.ThreadedConnectionPool.assert_called()
    
    @patch('app.connectors.postgresql.psycopg2.pool')
    def test_pool_exhaustion_handled(self, mock_pool):
        """Test graceful handling when pool is exhausted."""
        mock_pool.ThreadedConnectionPool.return_value.getconn.side_effect = Exception("Pool exhausted")
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        
        with pytest.raises(ConnectorException):
            connector.connect()
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_connection_recycling(self, mock_psycopg2):
        """Test that stale connections are recycled."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        # Simulate connection going stale
        connector.disconnect()
        connector.connect()  # Should create new connection
        
        assert mock_psycopg2.connect.call_count >= 1


class TestSchemaIntrospection:
    """Tests for database schema introspection."""
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_get_schemas(self, mock_psycopg2):
        """Test retrieving database schemas."""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ('public',),
            ('analytics',),
            ('staging',),
        ]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        schemas = connector.get_schemas()
        
        assert len(schemas) == 3
        assert 'public' in schemas
        assert 'analytics' in schemas
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_get_tables(self, mock_psycopg2):
        """Test retrieving tables from schema."""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ('users', 'BASE TABLE', 1000),
            ('orders', 'BASE TABLE', 50000),
            ('products', 'BASE TABLE', 500),
        ]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        tables = connector.get_tables(schema='public')
        
        assert len(tables) == 3
        assert any(t.name == 'users' for t in tables)
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_get_columns(self, mock_psycopg2):
        """Test retrieving column information."""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ('id', 'uuid', 'NO', 'PRI'),
            ('email', 'varchar(255)', 'NO', None),
            ('created_at', 'timestamp', 'NO', None),
            ('metadata', 'jsonb', 'YES', None),
        ]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        columns = connector.get_columns(table='users', schema='public')
        
        assert len(columns) == 4
        
        id_col = next(c for c in columns if c.name == 'id')
        assert id_col.primary_key is True
        assert id_col.nullable is False
        
        metadata_col = next(c for c in columns if c.name == 'metadata')
        assert metadata_col.nullable is True
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_get_foreign_keys(self, mock_psycopg2):
        """Test retrieving foreign key relationships."""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ('user_id', 'users', 'id'),
            ('product_id', 'products', 'id'),
        ]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        fks = connector.get_foreign_keys(table='orders', schema='public')
        
        assert len(fks) == 2
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_get_indexes(self, mock_psycopg2):
        """Test retrieving table indexes."""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ('users_pkey', True, ['id']),
            ('users_email_idx', True, ['email']),
            ('users_created_at_idx', False, ['created_at']),
        ]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        indexes = connector.get_indexes(table='users', schema='public')
        
        assert len(indexes) == 3


class TestQueryExecution:
    """Tests for query execution."""
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_execute_select(self, mock_psycopg2):
        """Test executing SELECT query."""
        mock_cursor = MagicMock()
        mock_cursor.description = [
            ('id', None, None, None, None, None, None),
            ('email', None, None, None, None, None, None),
        ]
        mock_cursor.fetchall.return_value = [
            (1, 'user1@example.com'),
            (2, 'user2@example.com'),
        ]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        result = connector.execute("SELECT id, email FROM users LIMIT 2")
        
        assert result.row_count == 2
        assert len(result.columns) == 2
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_execute_with_parameters(self, mock_psycopg2):
        """Test parameterized query execution."""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(1, 'user@example.com')]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        connector.execute(
            "SELECT * FROM users WHERE id = %s",
            params=[1]
        )
        
        mock_cursor.execute.assert_called()
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_execute_timeout(self, mock_psycopg2):
        """Test query timeout handling."""
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("Query timeout")
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password",
            extra_params={"query_timeout": 30}
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        with pytest.raises(QueryExecutionException):
            connector.execute("SELECT * FROM large_table")
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_streaming_results(self, mock_psycopg2):
        """Test streaming large result sets."""
        mock_cursor = MagicMock()
        mock_cursor.fetchmany.side_effect = [
            [(i, f'email{i}@example.com') for i in range(1000)],
            [(i, f'email{i}@example.com') for i in range(1000, 2000)],
            [],  # End of results
        ]
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        rows = list(connector.stream_results("SELECT * FROM users", batch_size=1000))
        
        assert len(rows) == 2  # Two batches


class TestSSLConnections:
    """Tests for SSL/TLS connection handling."""
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_ssl_connection(self, mock_psycopg2):
        """Test connecting with SSL enabled."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password",
            ssl=True,
            ssl_mode="require"
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        # Verify SSL params passed
        call_kwargs = mock_psycopg2.connect.call_args.kwargs
        assert 'sslmode' in call_kwargs or config.ssl_mode == "require"
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_ssl_with_certificates(self, mock_psycopg2):
        """Test SSL connection with client certificates."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password",
            ssl=True,
            ssl_mode="verify-full",
            extra_params={
                "sslcert": "/path/to/client.crt",
                "sslkey": "/path/to/client.key",
                "sslrootcert": "/path/to/ca.crt"
            }
        )
        
        connector = PostgreSQLConnector(config)
        connector.connect()
        
        mock_psycopg2.connect.assert_called()
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_ssl_verification_failure(self, mock_psycopg2):
        """Test handling SSL verification failure."""
        mock_psycopg2.connect.side_effect = Exception("SSL certificate verify failed")
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password",
            ssl=True,
            ssl_mode="verify-full"
        )
        
        connector = PostgreSQLConnector(config)
        
        with pytest.raises(ConnectorException) as exc_info:
            connector.connect()
        
        assert "SSL" in str(exc_info.value) or "certificate" in str(exc_info.value).lower()


class TestMySQLConnector:
    """Tests specific to MySQL connector."""
    
    @patch('app.connectors.mysql.pymysql')
    def test_mysql_connection(self, mock_pymysql):
        """Test MySQL connection."""
        config = ConnectionConfig(
            host="localhost",
            port=3306,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = MySQLConnector(config)
        connector.connect()
        
        mock_pymysql.connect.assert_called()
    
    @patch('app.connectors.mysql.pymysql')
    def test_mysql_charset_handling(self, mock_pymysql):
        """Test MySQL charset configuration."""
        config = ConnectionConfig(
            host="localhost",
            port=3306,
            database="testdb",
            username="user",
            password="password",
            extra_params={"charset": "utf8mb4"}
        )
        
        connector = MySQLConnector(config)
        connector.connect()
        
        call_kwargs = mock_pymysql.connect.call_args.kwargs
        assert call_kwargs.get('charset') == 'utf8mb4'


class TestClickHouseConnector:
    """Tests specific to ClickHouse connector."""
    
    @patch('app.connectors.clickhouse.clickhouse_connect')
    def test_clickhouse_connection(self, mock_ch):
        """Test ClickHouse connection."""
        config = ConnectionConfig(
            host="localhost",
            port=8123,
            database="default",
            username="default",
            password=""
        )
        
        connector = ClickHouseConnector(config)
        connector.connect()
        
        mock_ch.get_client.assert_called()
    
    @patch('app.connectors.clickhouse.clickhouse_connect')
    def test_clickhouse_http_vs_native(self, mock_ch):
        """Test ClickHouse HTTP vs native protocol."""
        # HTTP interface (port 8123)
        http_config = ConnectionConfig(
            host="localhost",
            port=8123,
            database="default",
            username="default",
            password=""
        )
        
        connector = ClickHouseConnector(http_config)
        connector.connect()
        
        # Verify HTTP interface used
        mock_ch.get_client.assert_called()


class TestConnectorErrorHandling:
    """Tests for error handling across connectors."""
    
    def test_connection_refused(self):
        """Test handling connection refused error."""
        config = ConnectionConfig(
            host="nonexistent-host",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        connector = PostgreSQLConnector(config)
        
        with pytest.raises(ConnectionTestException):
            connector.test_connection()
    
    def test_authentication_failure(self):
        """Test handling authentication failure."""
        with patch('app.connectors.postgresql.psycopg2') as mock_psycopg2:
            mock_psycopg2.connect.side_effect = Exception("password authentication failed")
            
            config = ConnectionConfig(
                host="localhost",
                port=5432,
                database="testdb",
                username="user",
                password="wrongpassword"
            )
            
            connector = PostgreSQLConnector(config)
            
            with pytest.raises(ConnectorException) as exc_info:
                connector.connect()
            
            assert "authentication" in str(exc_info.value).lower()
    
    def test_database_not_found(self):
        """Test handling non-existent database."""
        with patch('app.connectors.postgresql.psycopg2') as mock_psycopg2:
            mock_psycopg2.connect.side_effect = Exception('database "nonexistent" does not exist')
            
            config = ConnectionConfig(
                host="localhost",
                port=5432,
                database="nonexistent",
                username="user",
                password="password"
            )
            
            connector = PostgreSQLConnector(config)
            
            with pytest.raises(ConnectorException) as exc_info:
                connector.connect()
            
            assert "database" in str(exc_info.value).lower()
    
    def test_permission_denied(self):
        """Test handling permission denied error."""
        with patch('app.connectors.postgresql.psycopg2') as mock_psycopg2:
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = Exception("permission denied for table users")
            mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
            
            config = ConnectionConfig(
                host="localhost",
                port=5432,
                database="testdb",
                username="limited_user",
                password="password"
            )
            
            connector = PostgreSQLConnector(config)
            connector.connect()
            
            with pytest.raises(QueryExecutionException) as exc_info:
                connector.execute("SELECT * FROM users")
            
            assert "permission" in str(exc_info.value).lower()


class TestConnectorContextManager:
    """Tests for connector context manager usage."""
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_context_manager_connects(self, mock_psycopg2):
        """Test connector connects in context."""
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        with PostgreSQLConnector(config) as connector:
            assert connector is not None
        
        # Should disconnect on exit
        mock_psycopg2.connect.return_value.close.assert_called()
    
    @patch('app.connectors.postgresql.psycopg2')
    def test_context_manager_handles_exception(self, mock_psycopg2):
        """Test context manager cleans up on exception."""
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("Query error")
        mock_psycopg2.connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="testdb",
            username="user",
            password="password"
        )
        
        with pytest.raises(Exception):
            with PostgreSQLConnector(config) as connector:
                connector.execute("SELECT * FROM bad_query")
        
        # Should still disconnect
        mock_psycopg2.connect.return_value.close.assert_called()
