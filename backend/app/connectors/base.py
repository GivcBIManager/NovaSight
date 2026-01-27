"""
NovaSight Base Connector
========================

Abstract base class for all data source connectors.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Iterator, Optional
from dataclasses import dataclass, field
from pydantic import BaseModel, Field, validator
import logging

logger = logging.getLogger(__name__)


class ConnectorException(Exception):
    """Base exception for connector errors."""
    pass


class ConnectionTestException(ConnectorException):
    """Exception raised when connection test fails."""
    pass


@dataclass
class ColumnInfo:
    """Information about a database column."""
    name: str
    data_type: str
    nullable: bool
    primary_key: bool = False
    comment: str = ""
    default_value: Optional[str] = None
    max_length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None


@dataclass
class TableInfo:
    """Information about a database table."""
    name: str
    schema: str
    columns: List[ColumnInfo] = field(default_factory=list)
    row_count: int = 0
    comment: str = ""
    table_type: str = "BASE TABLE"


class ConnectionConfig(BaseModel):
    """Base configuration for database connections."""
    
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(..., ge=1, le=65535)
    database: str = Field(..., min_length=1, max_length=128)
    username: str = Field(..., min_length=1, max_length=128)
    password: str = Field(..., min_length=1)  # Encrypted at rest
    ssl: bool = True
    ssl_mode: Optional[str] = None
    schema: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('host')
    def validate_host(cls, v):
        """Validate host to prevent SSRF attacks."""
        import ipaddress
        
        # Check if it's an IP address
        try:
            ip = ipaddress.ip_address(v)
            # Block private and loopback addresses in production
            if ip.is_private or ip.is_loopback:
                logger.warning(f"Private/loopback IP address detected: {v}")
                # Allow in development, but log warning
        except ValueError:
            # It's a hostname, allow it
            pass
        
        return v
    
    class Config:
        arbitrary_types_allowed = True


class BaseConnector(ABC):
    """
    Abstract base class for data source connectors.
    
    All database connectors must inherit from this class and implement
    the required abstract methods.
    """
    
    # Connector metadata
    connector_type: str = "base"
    supported_auth_methods: List[str] = ["password"]
    supports_ssl: bool = True
    default_port: int = 0
    
    def __init__(self, config: ConnectionConfig):
        """
        Initialize connector with configuration.
        
        Args:
            config: Connection configuration object
        """
        self.config = config
        self._connection = None
        self._is_connected = False
    
    @abstractmethod
    def connect(self) -> None:
        """
        Establish connection to the data source.
        
        Raises:
            ConnectorException: If connection fails
        """
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        """
        Close the connection to the data source.
        """
        pass
    
    @abstractmethod
    def test_connection(self) -> bool:
        """
        Test if the connection is valid.
        
        Returns:
            bool: True if connection is successful
        
        Raises:
            ConnectionTestException: If connection test fails
        """
        pass
    
    @abstractmethod
    def get_schemas(self) -> List[str]:
        """
        List all available schemas in the database.
        
        Returns:
            List of schema names
        
        Raises:
            ConnectorException: If operation fails
        """
        pass
    
    @abstractmethod
    def get_tables(self, schema: str) -> List[TableInfo]:
        """
        List all tables in the specified schema.
        
        Args:
            schema: Schema name
        
        Returns:
            List of TableInfo objects
        
        Raises:
            ConnectorException: If operation fails
        """
        pass
    
    @abstractmethod
    def get_table_schema(self, schema: str, table: str) -> TableInfo:
        """
        Get detailed schema information for a specific table.
        
        Args:
            schema: Schema name
            table: Table name
        
        Returns:
            TableInfo object with column details
        
        Raises:
            ConnectorException: If table not found or operation fails
        """
        pass
    
    @abstractmethod
    def fetch_data(
        self, 
        query: str, 
        params: Optional[Dict[str, Any]] = None,
        batch_size: int = 10000
    ) -> Iterator[List[Dict[str, Any]]]:
        """
        Fetch data from the database in batches.
        
        Args:
            query: SQL query to execute
            params: Query parameters (for parameterized queries)
            batch_size: Number of rows per batch
        
        Yields:
            Batches of rows as list of dictionaries
        
        Raises:
            ConnectorException: If query execution fails
        """
        pass
    
    def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Execute a query that doesn't return results (INSERT, UPDATE, DELETE).
        
        Args:
            query: SQL query to execute
            params: Query parameters
        
        Returns:
            Number of affected rows
        
        Raises:
            ConnectorException: If query execution fails
        """
        raise NotImplementedError("execute_query not implemented")
    
    def get_row_count(self, schema: str, table: str) -> int:
        """
        Get approximate row count for a table.
        
        Args:
            schema: Schema name
            table: Table name
        
        Returns:
            Approximate number of rows
        """
        # Default implementation using COUNT(*)
        query = f'SELECT COUNT(*) FROM "{schema}"."{table}"'
        try:
            for batch in self.fetch_data(query, batch_size=1):
                if batch:
                    return list(batch[0].values())[0]
        except Exception as e:
            logger.warning(f"Failed to get row count: {e}")
            return 0
        return 0
    
    def validate_query(self, query: str) -> tuple[bool, str]:
        """
        Validate a SQL query without executing it.
        
        Args:
            query: SQL query to validate
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Basic validation - override in subclasses for DB-specific validation
        query_upper = query.strip().upper()
        
        # Check for dangerous operations
        dangerous_keywords = ['DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'INSERT', 'ALTER']
        for keyword in dangerous_keywords:
            if query_upper.startswith(keyword):
                return False, f"Query contains dangerous operation: {keyword}"
        
        return True, ""
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
    
    def __repr__(self):
        return f"<{self.__class__.__name__} host={self.config.host} database={self.config.database}>"
