"""
NovaSight Connector Usage Examples
==================================

Examples demonstrating how to use the connector framework.
"""

from app.connectors import (
    ConnectorRegistry,
    ConnectionConfig,
    PostgreSQLConnector,
    MySQLConnector
)
from app.connectors.utils import ConnectionPool, TypeMapper


def example_basic_usage():
    """Basic connector usage example."""
    print("=== Basic Connector Usage ===\n")
    
    # Create configuration
    config = ConnectionConfig(
        host="localhost",
        port=5432,
        database="analytics_db",
        username="data_user",
        password="encrypted_password_here",
        ssl=True,
        schema="public"
    )
    
    # Create connector using registry
    connector = ConnectorRegistry.create_connector("postgresql", config)
    
    # Or create directly
    # connector = PostgreSQLConnector(config)
    
    # Use context manager for automatic cleanup
    with connector:
        # Test connection
        if connector.test_connection():
            print("✓ Connection successful\n")
        
        # Get schemas
        schemas = connector.get_schemas()
        print(f"Schemas: {', '.join(schemas)}\n")
        
        # Get tables in a schema
        tables = connector.get_tables("public")
        print(f"Tables in 'public' schema:")
        for table in tables[:5]:  # Show first 5
            print(f"  - {table.name} ({table.row_count:,} rows)")
        print()
        
        # Get detailed table schema
        if tables:
            table_info = connector.get_table_schema("public", tables[0].name)
            print(f"\nColumns in '{tables[0].name}':")
            for col in table_info.columns:
                pk = " [PK]" if col.primary_key else ""
                null = "NULL" if col.nullable else "NOT NULL"
                print(f"  - {col.name}: {col.data_type} {null}{pk}")
        
        # Fetch data
        print("\n\nFetching data...")
        query = "SELECT * FROM users LIMIT 10"
        for batch in connector.fetch_data(query, batch_size=10):
            print(f"Retrieved batch of {len(batch)} rows")
            for row in batch[:3]:  # Show first 3 rows
                print(f"  {row}")


def example_connection_pool():
    """Connection pool usage example."""
    print("\n\n=== Connection Pool Usage ===\n")
    
    config = ConnectionConfig(
        host="localhost",
        port=5432,
        database="analytics_db",
        username="data_user",
        password="encrypted_password_here"
    )
    
    # Create connection pool
    with ConnectionPool(
        PostgreSQLConnector,
        config,
        pool_size=5,
        max_overflow=10
    ) as pool:
        
        # Get connection from pool
        conn = pool.get_connection()
        
        try:
            # Use connection
            schemas = conn.get_schemas()
            print(f"Schemas: {schemas}")
        
        finally:
            # Return to pool
            pool.return_connection(conn)
        
        # Or use context manager
        from app.connectors.utils.connection_pool import PooledConnection
        
        with PooledConnection(pool) as conn:
            tables = conn.get_tables("public")
            print(f"Found {len(tables)} tables")


def example_type_mapping():
    """Type mapping usage example."""
    print("\n\n=== Type Mapping ===\n")
    
    # PostgreSQL types
    pg_types = ["character varying", "integer", "timestamp without time zone", "jsonb"]
    
    print("PostgreSQL type mappings:")
    for db_type in pg_types:
        normalized = TypeMapper.normalize_type(db_type, "postgresql")
        category = TypeMapper.get_type_category(normalized)
        print(f"  {db_type:30} -> {normalized:15} [{category}]")
    
    # MySQL types
    print("\nMySQL type mappings:")
    mysql_types = ["varchar", "int", "datetime", "longtext"]
    
    for db_type in mysql_types:
        normalized = TypeMapper.normalize_type(db_type, "mysql")
        category = TypeMapper.get_type_category(normalized)
        print(f"  {db_type:30} -> {normalized:15} [{category}]")


def example_multi_database():
    """Example using multiple database types."""
    print("\n\n=== Multi-Database Usage ===\n")
    
    # List available connectors
    connectors = ConnectorRegistry.list_connectors()
    print(f"Available connectors: {', '.join(connectors)}\n")
    
    # Get info about each connector
    for connector_type in connectors:
        info = ConnectorRegistry.get_connector_info(connector_type)
        print(f"{connector_type.upper()}:")
        print(f"  Default port: {info['default_port']}")
        print(f"  SSL support: {info['supports_ssl']}")
        print(f"  Auth methods: {', '.join(info['supported_auth_methods'])}")
        print()


def example_error_handling():
    """Example of error handling."""
    print("\n\n=== Error Handling ===\n")
    
    from app.connectors import ConnectorException, ConnectionTestException
    
    config = ConnectionConfig(
        host="invalid-host",
        port=5432,
        database="test_db",
        username="user",
        password="pass"
    )
    
    connector = PostgreSQLConnector(config)
    
    try:
        connector.connect()
    except ConnectorException as e:
        print(f"Connection failed: {e}")
    
    try:
        connector.test_connection()
    except ConnectionTestException as e:
        print(f"Connection test failed: {e}")


def example_batch_processing():
    """Example of batch data processing."""
    print("\n\n=== Batch Processing ===\n")
    
    config = ConnectionConfig(
        host="localhost",
        port=5432,
        database="analytics_db",
        username="data_user",
        password="encrypted_password_here"
    )
    
    with PostgreSQLConnector(config) as connector:
        
        # Process large dataset in batches
        query = """
            SELECT 
                user_id,
                event_type,
                event_timestamp,
                metadata
            FROM user_events
            WHERE event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
        """
        
        total_rows = 0
        batch_count = 0
        
        print("Processing user events...")
        
        for batch in connector.fetch_data(query, batch_size=10000):
            batch_count += 1
            total_rows += len(batch)
            
            # Process batch (e.g., transform and load to ClickHouse)
            # process_batch(batch)
            
            if batch_count % 10 == 0:
                print(f"  Processed {batch_count} batches, {total_rows:,} rows")
        
        print(f"\nCompleted: {total_rows:,} total rows in {batch_count} batches")


def example_query_validation():
    """Example of query validation."""
    print("\n\n=== Query Validation ===\n")
    
    config = ConnectionConfig(
        host="localhost",
        port=5432,
        database="test_db",
        username="user",
        password="pass"
    )
    
    connector = PostgreSQLConnector(config)
    
    # Safe queries
    safe_queries = [
        "SELECT * FROM users WHERE id = 1",
        "SELECT COUNT(*) FROM orders",
    ]
    
    # Dangerous queries
    dangerous_queries = [
        "DROP TABLE users",
        "DELETE FROM orders",
        "UPDATE users SET password = 'hacked'",
    ]
    
    print("Validating safe queries:")
    for query in safe_queries:
        is_valid, error = connector.validate_query(query)
        print(f"  {query[:50]:50} -> {'✓ Valid' if is_valid else f'✗ {error}'}")
    
    print("\nValidating dangerous queries:")
    for query in dangerous_queries:
        is_valid, error = connector.validate_query(query)
        print(f"  {query[:50]:50} -> {'✓ Valid' if is_valid else f'✗ {error}'}")


if __name__ == "__main__":
    """
    Run examples.
    
    Note: These examples require actual database connections.
    Update the connection configurations with your database credentials.
    """
    
    print("NovaSight Connector Framework Examples")
    print("=" * 60)
    print()
    print("Note: Update connection configurations with real credentials")
    print("to run these examples against actual databases.")
    print()
    
    # Uncomment to run specific examples:
    
    # example_basic_usage()
    # example_connection_pool()
    # example_type_mapping()
    # example_multi_database()
    # example_error_handling()
    # example_batch_processing()
    # example_query_validation()
    
    # Show available connectors without connection
    example_multi_database()
    example_type_mapping()
    example_query_validation()
