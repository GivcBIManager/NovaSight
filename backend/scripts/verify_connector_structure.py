"""
NovaSight Connector Framework - Structure Verification
======================================================

Verify that all connector files are properly created with correct structure.
"""

import os
from pathlib import Path


def check_file_exists(filepath, description):
    """Check if a file exists."""
    if filepath.exists():
        size = filepath.stat().st_size
        print(f"  ✓ {description:50} ({size:,} bytes)")
        return True
    else:
        print(f"  ✗ {description:50} [MISSING]")
        return False


def check_file_contains(filepath, patterns, description):
    """Check if a file contains expected patterns."""
    if not filepath.exists():
        print(f"  ✗ {description:50} [FILE MISSING]")
        return False
    
    content = filepath.read_text(encoding='utf-8')
    
    missing = []
    for pattern in patterns:
        if pattern not in content:
            missing.append(pattern)
    
    if missing:
        print(f"  ✗ {description:50}")
        for p in missing:
            print(f"      Missing: {p[:50]}")
        return False
    else:
        print(f"  ✓ {description:50}")
        return True


def main():
    """Run structure verification."""
    print("=" * 80)
    print("NovaSight Connector Framework - Structure Verification")
    print("=" * 80)
    print()
    
    backend_dir = Path(__file__).parent.parent
    connectors_dir = backend_dir / "app" / "connectors"
    
    results = []
    
    # Check directory structure
    print("Checking directory structure...")
    results.append(check_file_exists(connectors_dir, "connectors/ directory"))
    results.append(check_file_exists(connectors_dir / "utils", "connectors/utils/ directory"))
    print()
    
    # Check core files
    print("Checking core files...")
    files = [
        (connectors_dir / "__init__.py", "connectors/__init__.py"),
        (connectors_dir / "base.py", "connectors/base.py"),
        (connectors_dir / "postgresql.py", "connectors/postgresql.py"),
        (connectors_dir / "mysql.py", "connectors/mysql.py"),
        (connectors_dir / "registry.py", "connectors/registry.py"),
        (connectors_dir / "README.md", "connectors/README.md"),
        (connectors_dir / "IMPLEMENTATION.md", "connectors/IMPLEMENTATION.md"),
    ]
    
    for filepath, description in files:
        results.append(check_file_exists(filepath, description))
    print()
    
    # Check utility files
    print("Checking utility files...")
    utils_files = [
        (connectors_dir / "utils" / "__init__.py", "utils/__init__.py"),
        (connectors_dir / "utils" / "type_mapping.py", "utils/type_mapping.py"),
        (connectors_dir / "utils" / "connection_pool.py", "utils/connection_pool.py"),
    ]
    
    for filepath, description in utils_files:
        results.append(check_file_exists(filepath, description))
    print()
    
    # Check examples and tests
    print("Checking examples and tests...")
    other_files = [
        (backend_dir / "examples" / "connector_usage.py", "examples/connector_usage.py"),
        (backend_dir / "tests" / "unit" / "test_connectors.py", "tests/unit/test_connectors.py"),
    ]
    
    for filepath, description in other_files:
        results.append(check_file_exists(filepath, description))
    print()
    
    # Check content
    print("Checking file contents...")
    
    # base.py should have BaseConnector
    results.append(check_file_contains(
        connectors_dir / "base.py",
        ["class BaseConnector", "class ConnectionConfig", "class ColumnInfo", "class TableInfo"],
        "base.py has required classes"
    ))
    
    # postgresql.py should have PostgreSQLConnector
    results.append(check_file_contains(
        connectors_dir / "postgresql.py",
        ["class PostgreSQLConnector", "connector_type = \"postgresql\"", "def get_schemas"],
        "postgresql.py has PostgreSQL connector"
    ))
    
    # mysql.py should have MySQLConnector
    results.append(check_file_contains(
        connectors_dir / "mysql.py",
        ["class MySQLConnector", "connector_type = \"mysql\"", "def get_schemas"],
        "mysql.py has MySQL connector"
    ))
    
    # registry.py should have ConnectorRegistry
    results.append(check_file_contains(
        connectors_dir / "registry.py",
        ["class ConnectorRegistry", "def register", "def get", "def create_connector"],
        "registry.py has connector registry"
    ))
    
    # type_mapping.py should have TypeMapper
    results.append(check_file_contains(
        connectors_dir / "utils" / "type_mapping.py",
        ["class TypeMapper", "POSTGRESQL_TYPE_MAP", "MYSQL_TYPE_MAP", "normalize_type"],
        "type_mapping.py has type mapper"
    ))
    
    # connection_pool.py should have ConnectionPool
    results.append(check_file_contains(
        connectors_dir / "utils" / "connection_pool.py",
        ["class ConnectionPool", "def get_connection", "def return_connection"],
        "connection_pool.py has connection pool"
    ))
    
    print()
    
    # Check requirements.txt
    print("Checking dependencies...")
    req_file = backend_dir / "requirements.txt"
    if req_file.exists():
        req_content = req_file.read_text()
        if "mysql-connector-python" in req_content:
            print("  ✓ mysql-connector-python added to requirements.txt")
            results.append(True)
        else:
            print("  ✗ mysql-connector-python NOT in requirements.txt")
            results.append(False)
        
        if "psycopg2-binary" in req_content:
            print("  ✓ psycopg2-binary in requirements.txt")
            results.append(True)
        else:
            print("  ✗ psycopg2-binary NOT in requirements.txt")
            results.append(False)
    else:
        print("  ✗ requirements.txt not found")
        results.append(False)
    
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(results)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"Checks passed: {passed}/{total} ({percentage:.1f}%)")
    print()
    
    if passed == total:
        print("🎉 All structure checks passed!")
        print()
        print("Next steps:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Run unit tests: pytest tests/unit/test_connectors.py")
        print("  3. Try examples: python -m examples.connector_usage")
        return 0
    else:
        print(f"❌ {total - passed} check(s) failed")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
