"""
NovaSight Data Sources Domain — Value Objects
===============================================

Unified DTOs for schema metadata.

Merges two previous sets of DTOs that overlapped:
- ``connectors.base.ColumnInfo / TableInfo`` — lightweight, used by connectors
- ``models.data_source.DataSourceColumn / DataSourceTable / DataSourceSchema``
  — richer, used for storing introspection results

This module keeps **both** shapes for backward compatibility but makes them
interoperable.  New code should prefer ``DataSourceColumn`` / ``DataSourceTable``
/ ``DataSourceSchema`` for rich metadata, and ``ColumnInfo`` / ``TableInfo``
when interacting with the connector layer.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


# ─── Connector-level DTOs (lightweight) ────────────────────────────

@dataclass
class ColumnInfo:
    """
    Lightweight column descriptor returned by connectors.

    This is the canonical shape for connector ``get_tables()`` /
    ``get_table_schema()`` results.
    """
    name: str
    data_type: str
    nullable: bool
    primary_key: bool = False
    comment: str = ""
    default_value: Optional[str] = None
    max_length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None

    def to_datasource_column(self) -> "DataSourceColumn":
        """Promote to a richer ``DataSourceColumn``."""
        return DataSourceColumn(
            name=self.name,
            source_name=self.name,
            type=self.data_type,
            nullable=self.nullable,
            primary_key=self.primary_key,
            description=self.comment or None,
            default_value=self.default_value,
            max_length=self.max_length,
            precision=self.precision,
            scale=self.scale,
        )


@dataclass
class TableInfo:
    """
    Lightweight table descriptor returned by connectors.
    """
    name: str
    schema: str
    columns: List[ColumnInfo] = field(default_factory=list)
    row_count: int = 0
    comment: str = ""
    table_type: str = "BASE TABLE"

    def to_datasource_table(self) -> "DataSourceTable":
        """Promote to a richer ``DataSourceTable``."""
        return DataSourceTable(
            name=self.name,
            source_name=self.name,
            schema_name=self.schema,
            columns=[c.to_datasource_column() for c in self.columns],
            description=self.comment or None,
            row_count=self.row_count,
        )


# ─── Rich metadata DTOs ───────────────────────────────────────────

@dataclass
class DataSourceColumn:
    """
    Full column metadata — used for storing introspected schema info.

    Attributes:
        name: Column name (snake_case normalised)
        source_name: Original column name in the source
        type: Column data type
        nullable: Whether the column allows NULL values
        primary_key: Whether this column is part of the primary key
        foreign_key: Foreign key reference if applicable
        description: Column description / comment
        default_value: Default value expression
        max_length: Maximum length for string types
        precision: Numeric precision
        scale: Numeric scale
        ordinal_position: Position in the table (1-based)
    """
    name: str
    source_name: str
    type: str
    nullable: bool = True
    primary_key: bool = False
    foreign_key: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[str] = None
    max_length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None
    ordinal_position: int = 0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "source_name": self.source_name,
            "type": self.type,
            "nullable": self.nullable,
            "primary_key": self.primary_key,
            "foreign_key": self.foreign_key,
            "description": self.description,
            "default_value": self.default_value,
            "max_length": self.max_length,
            "precision": self.precision,
            "scale": self.scale,
            "ordinal_position": self.ordinal_position,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "DataSourceColumn":
        return cls(
            name=data.get("name", ""),
            source_name=data.get("source_name", data.get("name", "")),
            type=data.get("type", "unknown"),
            nullable=data.get("nullable", True),
            primary_key=data.get("primary_key", False),
            foreign_key=data.get("foreign_key"),
            description=data.get("description"),
            default_value=data.get("default_value"),
            max_length=data.get("max_length"),
            precision=data.get("precision"),
            scale=data.get("scale"),
            ordinal_position=data.get("ordinal_position", 0),
        )

    def to_column_info(self) -> ColumnInfo:
        """Downgrade to a lightweight ``ColumnInfo``."""
        return ColumnInfo(
            name=self.name,
            data_type=self.type,
            nullable=self.nullable,
            primary_key=self.primary_key,
            comment=self.description or "",
            default_value=self.default_value,
            max_length=self.max_length,
            precision=self.precision,
            scale=self.scale,
        )


@dataclass
class DataSourceTable:
    """
    Full table metadata — used for storing introspection results.
    """
    name: str
    source_name: str
    schema_name: Optional[str] = None
    columns: List[DataSourceColumn] = field(default_factory=list)
    description: Optional[str] = None
    row_count: Optional[int] = None
    primary_key_columns: List[str] = field(default_factory=list)
    foreign_keys: List[dict] = field(default_factory=list)
    indexes: List[dict] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()
        if not self.primary_key_columns:
            self.primary_key_columns = [
                col.name for col in self.columns if col.primary_key
            ]

    def get_column(self, name: str) -> Optional[DataSourceColumn]:
        for col in self.columns:
            if col.name == name or col.source_name == name:
                return col
        return None

    def has_column(self, name: str) -> bool:
        return self.get_column(name) is not None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "source_name": self.source_name,
            "schema_name": self.schema_name,
            "columns": [col.to_dict() for col in self.columns],
            "description": self.description,
            "row_count": self.row_count,
            "primary_key_columns": self.primary_key_columns,
            "foreign_keys": self.foreign_keys,
            "indexes": self.indexes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "DataSourceTable":
        columns = [
            DataSourceColumn.from_dict(col) for col in data.get("columns", [])
        ]
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        return cls(
            name=data.get("name", ""),
            source_name=data.get("source_name", data.get("name", "")),
            schema_name=data.get("schema_name"),
            columns=columns,
            description=data.get("description"),
            row_count=data.get("row_count"),
            primary_key_columns=data.get("primary_key_columns", []),
            foreign_keys=data.get("foreign_keys", []),
            indexes=data.get("indexes", []),
            created_at=created_at,
            updated_at=updated_at,
        )

    def to_table_info(self) -> TableInfo:
        """Downgrade to a lightweight ``TableInfo``."""
        return TableInfo(
            name=self.name,
            schema=self.schema_name or "",
            columns=[c.to_column_info() for c in self.columns],
            row_count=self.row_count or 0,
            comment=self.description or "",
        )


@dataclass
class DataSourceSchema:
    """
    Complete data source schema — all tables from a connection.
    """
    source_name: str
    database: str
    schema_name: Optional[str] = None
    tables: List[DataSourceTable] = field(default_factory=list)
    description: Optional[str] = None
    connection_id: Optional[str] = None
    tenant_id: Optional[str] = None
    introspected_at: Optional[datetime] = None

    def __post_init__(self):
        if self.introspected_at is None:
            self.introspected_at = datetime.utcnow()

    def get_table(self, name: str) -> Optional[DataSourceTable]:
        for table in self.tables:
            if table.name == name or table.source_name == name:
                return table
        return None

    def has_table(self, name: str) -> bool:
        return self.get_table(name) is not None

    def to_dict(self) -> dict:
        return {
            "source_name": self.source_name,
            "database": self.database,
            "schema_name": self.schema_name,
            "tables": [t.to_dict() for t in self.tables],
            "description": self.description,
            "connection_id": self.connection_id,
            "tenant_id": self.tenant_id,
            "introspected_at": self.introspected_at.isoformat() if self.introspected_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "DataSourceSchema":
        tables = [
            DataSourceTable.from_dict(t) for t in data.get("tables", [])
        ]
        introspected_at = data.get("introspected_at")
        if isinstance(introspected_at, str):
            introspected_at = datetime.fromisoformat(introspected_at)
        return cls(
            source_name=data.get("source_name", ""),
            database=data.get("database", ""),
            schema_name=data.get("schema_name"),
            tables=tables,
            description=data.get("description"),
            connection_id=data.get("connection_id"),
            tenant_id=data.get("tenant_id"),
            introspected_at=introspected_at,
        )
