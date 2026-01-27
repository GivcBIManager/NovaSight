"""
NovaSight Type Mapping Utilities
=================================

Database type mapping to standard types.
"""

from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class TypeMapper:
    """
    Map database-specific types to standard types.
    
    Provides normalized type names for cross-database compatibility.
    """
    
    # Standard type categories
    NUMERIC_TYPES = {'integer', 'bigint', 'smallint', 'decimal', 'numeric', 'float', 'double', 'real'}
    STRING_TYPES = {'varchar', 'char', 'text', 'string'}
    DATE_TYPES = {'date', 'time', 'timestamp', 'datetime'}
    BOOLEAN_TYPES = {'boolean', 'bool'}
    BINARY_TYPES = {'binary', 'varbinary', 'blob', 'bytea'}
    JSON_TYPES = {'json', 'jsonb'}
    
    # PostgreSQL type mappings
    POSTGRESQL_TYPE_MAP = {
        'character varying': 'varchar',
        'character': 'char',
        'integer': 'integer',
        'bigint': 'bigint',
        'smallint': 'smallint',
        'double precision': 'double',
        'real': 'float',
        'numeric': 'decimal',
        'timestamp without time zone': 'timestamp',
        'timestamp with time zone': 'timestamptz',
        'time without time zone': 'time',
        'time with time zone': 'timetz',
        'boolean': 'boolean',
        'bytea': 'binary',
        'text': 'text',
        'json': 'json',
        'jsonb': 'jsonb',
        'uuid': 'uuid',
        'array': 'array',
    }
    
    # MySQL type mappings
    MYSQL_TYPE_MAP = {
        'int': 'integer',
        'tinyint': 'smallint',
        'bigint': 'bigint',
        'varchar': 'varchar',
        'char': 'char',
        'text': 'text',
        'longtext': 'text',
        'mediumtext': 'text',
        'tinytext': 'text',
        'datetime': 'datetime',
        'timestamp': 'timestamp',
        'date': 'date',
        'time': 'time',
        'decimal': 'decimal',
        'float': 'float',
        'double': 'double',
        'boolean': 'boolean',
        'blob': 'binary',
        'longblob': 'binary',
        'mediumblob': 'binary',
        'tinyblob': 'binary',
        'json': 'json',
    }
    
    # Oracle type mappings
    ORACLE_TYPE_MAP = {
        'VARCHAR2': 'varchar',
        'NVARCHAR2': 'varchar',
        'CHAR': 'char',
        'NCHAR': 'char',
        'CLOB': 'text',
        'NCLOB': 'text',
        'NUMBER': 'decimal',
        'BINARY_FLOAT': 'float',
        'BINARY_DOUBLE': 'double',
        'DATE': 'datetime',
        'TIMESTAMP': 'timestamp',
        'BLOB': 'binary',
        'RAW': 'binary',
    }
    
    # SQL Server type mappings
    SQLSERVER_TYPE_MAP = {
        'varchar': 'varchar',
        'nvarchar': 'varchar',
        'char': 'char',
        'nchar': 'char',
        'text': 'text',
        'ntext': 'text',
        'int': 'integer',
        'bigint': 'bigint',
        'smallint': 'smallint',
        'tinyint': 'smallint',
        'decimal': 'decimal',
        'numeric': 'decimal',
        'float': 'double',
        'real': 'float',
        'datetime': 'datetime',
        'datetime2': 'datetime',
        'date': 'date',
        'time': 'time',
        'bit': 'boolean',
        'binary': 'binary',
        'varbinary': 'binary',
    }
    
    @classmethod
    def normalize_type(cls, db_type: str, database: str = 'postgresql') -> str:
        """
        Normalize a database-specific type to a standard type.
        
        Args:
            db_type: Database-specific type name
            database: Database system ('postgresql', 'mysql', 'oracle', 'sqlserver')
        
        Returns:
            Normalized type name
        """
        db_type_lower = db_type.lower().strip()
        
        # Get appropriate mapping
        type_map = {
            'postgresql': cls.POSTGRESQL_TYPE_MAP,
            'mysql': cls.MYSQL_TYPE_MAP,
            'oracle': cls.ORACLE_TYPE_MAP,
            'sqlserver': cls.SQLSERVER_TYPE_MAP,
        }.get(database, {})
        
        # Map to standard type
        normalized = type_map.get(db_type_lower, db_type_lower)
        
        return normalized
    
    @classmethod
    def get_type_category(cls, normalized_type: str) -> str:
        """
        Get the category of a normalized type.
        
        Args:
            normalized_type: Normalized type name
        
        Returns:
            Type category ('numeric', 'string', 'date', 'boolean', 'binary', 'json', 'other')
        """
        normalized_type = normalized_type.lower()
        
        if normalized_type in cls.NUMERIC_TYPES:
            return 'numeric'
        elif normalized_type in cls.STRING_TYPES:
            return 'string'
        elif normalized_type in cls.DATE_TYPES:
            return 'date'
        elif normalized_type in cls.BOOLEAN_TYPES:
            return 'boolean'
        elif normalized_type in cls.BINARY_TYPES:
            return 'binary'
        elif normalized_type in cls.JSON_TYPES:
            return 'json'
        else:
            return 'other'
    
    @classmethod
    def is_numeric(cls, normalized_type: str) -> bool:
        """Check if type is numeric."""
        return normalized_type.lower() in cls.NUMERIC_TYPES
    
    @classmethod
    def is_string(cls, normalized_type: str) -> bool:
        """Check if type is string."""
        return normalized_type.lower() in cls.STRING_TYPES
    
    @classmethod
    def is_date(cls, normalized_type: str) -> bool:
        """Check if type is date/time."""
        return normalized_type.lower() in cls.DATE_TYPES
