# NovaSight Data Source Connectors

Pluggable connector architecture for database integrations in NovaSight.

## Overview

The connector framework provides a unified interface for connecting to various database systems, introspecting schemas, and fetching data. It supports connection pooling, type mapping, and batch processing.

## Supported Databases

- **PostgreSQL** (9.6+)
- **MySQL/MariaDB** (5.7+, 8.0+)
- Oracle (planned)
- SQL Server (planned)
- ClickHouse (via existing integration)

## Features

✅ **Unified Interface** - Single API for all database types  
✅ **Connection Pooling** - Efficient connection reuse  
✅ **Schema Introspection** - Browse schemas, tables, and columns  
✅ **Batch Processing** - Memory-efficient data fetching  
✅ **Type Mapping** - Cross-database type normalization  
✅ **SSL/TLS Support** - Secure connections  
✅ **Error Handling** - Consistent exception hierarchy  
✅ **Credential Encryption** - Passwords encrypted at rest  

## Quick Start

### Basic Usage

```python
from app.connectors import ConnectorRegistry, ConnectionConfig

# Create configuration
config = ConnectionConfig(
    host="localhost",
    port=5432,
    database="analytics_db",
    username="data_user",
    password="encrypted_password",
    ssl=True
)

# Create connector
connector = ConnectorRegistry.create_connector("postgresql", config)

# Use with context manager
with connector:
    # Test connection
    connector.test_connection()
    
    # Get schemas
    schemas = connector.get_schemas()
    
    # Get tables
    tables = connector.get_tables("public")
    
    # Get table schema
    table_info = connector.get_table_schema("public", "users")
    
    # Fetch data
    for batch in connector.fetch_data("SELECT * FROM users", batch_size=1000):
        process_batch(batch)
```

### Connection Pooling

```python
from app.connectors import PostgreSQLConnector
from app.connectors.utils import ConnectionPool

config = ConnectionConfig(...)

# Create pool
pool = ConnectionPool(
    PostgreSQLConnector,
    config,
    pool_size=5,
    max_overflow=10
)

# Get connection from pool
conn = pool.get_connection()
try:
    data = conn.fetch_data("SELECT * FROM users")
finally:
    pool.return_connection(conn)
```

### Type Mapping

```python
from app.connectors.utils import TypeMapper

# Normalize PostgreSQL types
pg_type = "character varying"
normalized = TypeMapper.normalize_type(pg_type, "postgresql")
# Returns: "varchar"

category = TypeMapper.get_type_category(normalized)
# Returns: "string"

# Check type category
TypeMapper.is_numeric("integer")  # True
TypeMapper.is_string("varchar")   # True
TypeMapper.is_date("timestamp")   # True
```

## Architecture

### Class Hierarchy

```
BaseConnector (ABC)
├── PostgreSQLConnector
├── MySQLConnector
├── OracleConnector (planned)
└── SQLServerConnector (planned)
```

### Core Components

- **`base.py`** - Abstract base connector class
- **`postgresql.py`** - PostgreSQL implementation
- **`mysql.py`** - MySQL implementation
- **`registry.py`** - Connector registration and factory
- **`utils/type_mapping.py`** - Type normalization
- **`utils/connection_pool.py`** - Connection pooling

## Configuration

### Connection Config

```python
class ConnectionConfig(BaseModel):
    host: str                      # Database host
    port: int                      # Port (1-65535)
    database: str                  # Database name
    username: str                  # Username
    password: str                  # Password (encrypted at rest)
    ssl: bool = True              # Enable SSL
    ssl_mode: Optional[str] = None # SSL mode (require, verify-ca, etc.)
    schema: Optional[str] = None   # Default schema
    extra_params: Dict[str, Any] = {} # Additional params
```

### PostgreSQL SSL Modes

- `disable` - No SSL
- `require` - Require SSL (no verification)
- `verify-ca` - Verify CA certificate
- `verify-full` - Verify CA and hostname

### MySQL SSL

```python
config = ConnectionConfig(
    host="mysql.example.com",
    port=3306,
    database="app_db",
    username="app_user",
    password="encrypted_pass",
    ssl=True,
    extra_params={
        "ssl_ca": "/path/to/ca.pem",
        "ssl_cert": "/path/to/client-cert.pem",
        "ssl_key": "/path/to/client-key.pem"
    }
)
```

## API Reference

### BaseConnector

#### Methods

**`connect() -> None`**  
Establish connection to database.

**`disconnect() -> None`**  
Close database connection.

**`test_connection() -> bool`**  
Test if connection is valid.

**`get_schemas() -> List[str]`**  
List all schemas/databases.

**`get_tables(schema: str) -> List[TableInfo]`**  
List tables in schema.

**`get_table_schema(schema: str, table: str) -> TableInfo`**  
Get detailed table schema with columns.

**`fetch_data(query: str, params: Dict = None, batch_size: int = 10000) -> Iterator[List[Dict]]`**  
Fetch data in batches.

**`execute_query(query: str, params: Dict = None) -> int`**  
Execute query without results (INSERT/UPDATE/DELETE).

**`get_row_count(schema: str, table: str) -> int`**  
Get approximate row count.

**`validate_query(query: str) -> Tuple[bool, str]`**  
Validate SQL query.

### ConnectorRegistry

**`register(connector_class: Type[BaseConnector]) -> Type[BaseConnector]`**  
Register connector class.

**`get(connector_type: str) -> Type[BaseConnector]`**  
Get connector class by type.

**`list_connectors() -> List[str]`**  
List registered connector types.

**`get_connector_info(connector_type: str) -> Dict`**  
Get connector metadata.

**`create_connector(connector_type: str, config: ConnectionConfig) -> BaseConnector`**  
Create connector instance.

## Data Structures

### ColumnInfo

```python
@dataclass
class ColumnInfo:
    name: str
    data_type: str
    nullable: bool
    primary_key: bool = False
    comment: str = ""
    default_value: Optional[str] = None
    max_length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None
```

### TableInfo

```python
@dataclass
class TableInfo:
    name: str
    schema: str
    columns: List[ColumnInfo] = []
    row_count: int = 0
    comment: str = ""
    table_type: str = "BASE TABLE"
```

## Error Handling

```python
from app.connectors import ConnectorException, ConnectionTestException

try:
    connector.connect()
except ConnectorException as e:
    logger.error(f"Connection failed: {e}")

try:
    connector.test_connection()
except ConnectionTestException as e:
    logger.error(f"Connection test failed: {e}")
```

## Security

### Credential Encryption

Passwords are encrypted at rest using AES-256 (Fernet):

```python
from app.utils.encryption import encrypt_credential, decrypt_credential

# Encrypt password before storing
encrypted_password = encrypt_credential("plain_password")

# Store in database
connection.password_encrypted = encrypted_password

# Decrypt when creating connector
password = decrypt_credential(connection.password_encrypted)
config = ConnectionConfig(..., password=password)
```

### SSRF Prevention

The `ConnectionConfig` validator blocks private/loopback IP addresses in production:

```python
config = ConnectionConfig(
    host="127.0.0.1",  # Blocked in production
    ...
)
# Raises: ValueError("Private/loopback addresses not allowed")
```

### Query Validation

Basic query validation prevents dangerous operations:

```python
is_valid, error = connector.validate_query("DROP TABLE users")
# Returns: (False, "Query contains dangerous operation: DROP")
```

## Performance

### Batch Processing

Fetch data in batches to avoid memory exhaustion:

```python
# Good - Memory efficient
for batch in connector.fetch_data(query, batch_size=10000):
    process_batch(batch)

# Bad - Loads all data into memory
all_data = list(connector.fetch_data(query, batch_size=1000000))
```

### Connection Pooling

Reuse connections to avoid connection overhead:

```python
# Connection pool maintains 5 connections, allows up to 10 overflow
pool = ConnectionPool(PostgreSQLConnector, config, pool_size=5, max_overflow=10)
```

### Row Count Estimation

Get approximate row counts efficiently:

```python
# PostgreSQL - Uses pg_class statistics (fast)
row_count = connector.get_row_count("public", "large_table")

# Falls back to COUNT(*) if stats unavailable
```

## Testing

Run connector tests:

```bash
# All connector tests
pytest backend/tests/unit/test_connectors.py

# Specific test
pytest backend/tests/unit/test_connectors.py::TestPostgreSQLConnector::test_connect

# With coverage
pytest backend/tests/unit/test_connectors.py --cov=app.connectors
```

## Examples

See `backend/examples/connector_usage.py` for comprehensive examples:

- Basic usage
- Connection pooling
- Type mapping
- Multi-database support
- Error handling
- Batch processing
- Query validation

Run examples:

```bash
cd backend
python -m examples.connector_usage
```

## Adding New Connectors

To add a new database connector:

1. Create connector class inheriting from `BaseConnector`
2. Implement all abstract methods
3. Set connector metadata (type, port, etc.)
4. Register with `ConnectorRegistry`
5. Add type mappings to `TypeMapper`
6. Add tests

Example:

```python
from app.connectors import BaseConnector, ConnectorRegistry

class OracleConnector(BaseConnector):
    connector_type = "oracle"
    supported_auth_methods = ["password", "kerberos"]
    supports_ssl = True
    default_port = 1521
    
    def connect(self):
        # Implementation
        pass
    
    # ... implement other methods

# Register
ConnectorRegistry.register(OracleConnector)
```

## Dependencies

Required Python packages:

- `psycopg2-binary>=2.9.9` - PostgreSQL
- `mysql-connector-python>=8.2.0` - MySQL
- `cryptography>=41.0.7` - Encryption
- `pydantic>=2.5.3` - Validation

Install:

```bash
pip install -r backend/requirements.txt
```

## License

Part of the NovaSight project.
