"""
NovaSight Connector Validation Script
=====================================

Validate the connector framework implementation without requiring databases.
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))


def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")
    
    try:
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
        print("  ✓ Core imports successful")
    except Exception as e:
        print(f"  ✗ Core imports failed: {e}")
        return False
    
    try:
        from app.connectors.utils import TypeMapper, ConnectionPool
        print("  ✓ Utils imports successful")
    except Exception as e:
        print(f"  ✗ Utils imports failed: {e}")
        return False
    
    return True


def test_connection_config():
    """Test ConnectionConfig validation."""
    print("\nTesting ConnectionConfig...")
    
    from app.connectors import ConnectionConfig
    from pydantic import ValidationError
    
    # Valid config
    try:
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="test_db",
            username="user",
            password="password123"
        )
        assert config.host == "localhost"
        assert config.ssl is True
        print("  ✓ Valid config creation works")
    except Exception as e:
        print(f"  ✗ Valid config failed: {e}")
        return False
    
    # Invalid port
    try:
        config = ConnectionConfig(
            host="localhost",
            port=99999,
            database="test_db",
            username="user",
            password="password"
        )
        print("  ✗ Invalid port should have been rejected")
        return False
    except ValidationError:
        print("  ✓ Invalid port correctly rejected")
    
    return True


def test_registry():
    """Test ConnectorRegistry."""
    print("\nTesting ConnectorRegistry...")
    
    from app.connectors import ConnectorRegistry, PostgreSQLConnector, MySQLConnector
    
    # List connectors
    connectors = ConnectorRegistry.list_connectors()
    if "postgresql" not in connectors or "mysql" not in connectors:
        print(f"  ✗ Expected connectors not found: {connectors}")
        return False
    print(f"  ✓ Found connectors: {', '.join(connectors)}")
    
    # Get connector
    try:
        pg_class = ConnectorRegistry.get("postgresql")
        if pg_class != PostgreSQLConnector:
            print("  ✗ Wrong connector class returned")
            return False
        print("  ✓ Connector retrieval works")
    except Exception as e:
        print(f"  ✗ Failed to get connector: {e}")
        return False
    
    # Get info
    try:
        info = ConnectorRegistry.get_connector_info("postgresql")
        if info["default_port"] != 5432:
            print(f"  ✗ Wrong port in info: {info['default_port']}")
            return False
        print(f"  ✓ Connector info correct: port={info['default_port']}")
    except Exception as e:
        print(f"  ✗ Failed to get info: {e}")
        return False
    
    return True


def test_type_mapper():
    """Test TypeMapper."""
    print("\nTesting TypeMapper...")
    
    from app.connectors.utils import TypeMapper
    
    # PostgreSQL types
    tests = [
        ("character varying", "postgresql", "varchar"),
        ("integer", "postgresql", "integer"),
        ("timestamp without time zone", "postgresql", "timestamp"),
        ("int", "mysql", "integer"),
        ("datetime", "mysql", "datetime"),
    ]
    
    all_passed = True
    for db_type, database, expected in tests:
        result = TypeMapper.normalize_type(db_type, database)
        if result != expected:
            print(f"  ✗ {db_type} ({database}) -> {result}, expected {expected}")
            all_passed = False
        else:
            print(f"  ✓ {db_type} ({database}) -> {result}")
    
    # Category tests
    if not TypeMapper.is_numeric("integer"):
        print("  ✗ integer should be numeric")
        all_passed = False
    else:
        print("  ✓ Type category detection works")
    
    return all_passed


def test_data_structures():
    """Test ColumnInfo and TableInfo."""
    print("\nTesting data structures...")
    
    from app.connectors import ColumnInfo, TableInfo
    
    try:
        # Create column
        col = ColumnInfo(
            name="id",
            data_type="integer",
            nullable=False,
            primary_key=True,
            comment="Primary key"
        )
        assert col.name == "id"
        assert col.primary_key is True
        print("  ✓ ColumnInfo creation works")
        
        # Create table
        table = TableInfo(
            name="users",
            schema="public",
            columns=[col],
            row_count=100
        )
        assert table.name == "users"
        assert len(table.columns) == 1
        print("  ✓ TableInfo creation works")
        
    except Exception as e:
        print(f"  ✗ Data structure test failed: {e}")
        return False
    
    return True


def test_connector_creation():
    """Test connector instance creation."""
    print("\nTesting connector creation...")
    
    from app.connectors import ConnectorRegistry, ConnectionConfig
    
    try:
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="test_db",
            username="user",
            password="password"
        )
        
        # Create PostgreSQL connector
        pg_conn = ConnectorRegistry.create_connector("postgresql", config)
        if pg_conn.connector_type != "postgresql":
            print(f"  ✗ Wrong connector type: {pg_conn.connector_type}")
            return False
        print("  ✓ PostgreSQL connector created")
        
        # Create MySQL connector
        config.port = 3306
        mysql_conn = ConnectorRegistry.create_connector("mysql", config)
        if mysql_conn.connector_type != "mysql":
            print(f"  ✗ Wrong connector type: {mysql_conn.connector_type}")
            return False
        print("  ✓ MySQL connector created")
        
    except Exception as e:
        print(f"  ✗ Connector creation failed: {e}")
        return False
    
    return True


def test_query_validation():
    """Test query validation."""
    print("\nTesting query validation...")
    
    from app.connectors import PostgreSQLConnector, ConnectionConfig
    
    config = ConnectionConfig(
        host="localhost",
        port=5432,
        database="test",
        username="user",
        password="pass"
    )
    
    connector = PostgreSQLConnector(config)
    
    # Safe query
    is_valid, error = connector.validate_query("SELECT * FROM users")
    if not is_valid:
        print(f"  ✗ Safe query rejected: {error}")
        return False
    print("  ✓ Safe query accepted")
    
    # Dangerous query
    is_valid, error = connector.validate_query("DROP TABLE users")
    if is_valid:
        print("  ✗ Dangerous query accepted")
        return False
    print(f"  ✓ Dangerous query rejected: {error}")
    
    return True


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("NovaSight Connector Framework Validation")
    print("=" * 60)
    
    tests = [
        ("Imports", test_imports),
        ("ConnectionConfig", test_connection_config),
        ("ConnectorRegistry", test_registry),
        ("TypeMapper", test_type_mapper),
        ("Data Structures", test_data_structures),
        ("Connector Creation", test_connector_creation),
        ("Query Validation", test_query_validation),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ {name} failed with exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:8} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All validation tests passed!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
