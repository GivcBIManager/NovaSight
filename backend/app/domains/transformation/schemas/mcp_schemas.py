"""
Pydantic schemas for dbt-MCP operations.

Request and response models for MCP server interactions,
semantic layer queries, and lineage visualization.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal, Union
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class MCPResourceType(str, Enum):
    """Resource types in dbt project."""
    MODEL = "model"
    SOURCE = "source"
    SEED = "seed"
    SNAPSHOT = "snapshot"
    TEST = "test"
    METRIC = "metric"
    EXPOSURE = "exposure"


class MetricType(str, Enum):
    """Semantic layer metric types."""
    SIMPLE = "simple"
    DERIVED = "derived"
    CUMULATIVE = "cumulative"
    CONVERSION = "conversion"


class DimensionType(str, Enum):
    """Semantic layer dimension types."""
    CATEGORICAL = "categorical"
    TIME = "time"


class AggregationType(str, Enum):
    """Aggregation function types."""
    SUM = "sum"
    COUNT = "count"
    COUNT_DISTINCT = "count_distinct"
    AVG = "average"
    MIN = "min"
    MAX = "max"
    MEDIAN = "median"
    PERCENTILE = "percentile"


class FilterOperator(str, Enum):
    """Filter condition operators."""
    EQUALS = "="
    NOT_EQUALS = "!="
    GREATER_THAN = ">"
    GREATER_THAN_OR_EQUALS = ">="
    LESS_THAN = "<"
    LESS_THAN_OR_EQUALS = "<="
    IN = "in"
    NOT_IN = "not_in"
    LIKE = "like"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


# ============================================================================
# Request Schemas
# ============================================================================

class MCPQueryFilter(BaseModel):
    """Filter condition for semantic queries."""
    dimension: str = Field(..., description="Dimension to filter on")
    operator: FilterOperator = Field(FilterOperator.EQUALS, description="Filter operator")
    value: Union[str, int, float, List[str], List[int], List[float], None] = Field(
        None, description="Filter value(s)"
    )

    class Config:
        use_enum_values = True


class MCPQueryRequest(BaseModel):
    """Request to execute a semantic layer query."""
    metrics: List[str] = Field(
        ...,
        min_length=1,
        description="Metric names to query"
    )
    dimensions: Optional[List[str]] = Field(
        None,
        description="Dimension names to group by (group_by)"
    )
    filters: Optional[List[MCPQueryFilter]] = Field(
        None,
        description="Filter conditions"
    )
    order_by: Optional[List[str]] = Field(
        None,
        description="Order by columns (prefix with '-' for descending)"
    )
    limit: Optional[int] = Field(
        None,
        ge=1,
        le=10000,
        description="Maximum rows to return"
    )
    compile_only: bool = Field(
        False,
        description="Only compile to SQL without executing"
    )


class MCPModelListRequest(BaseModel):
    """Request to list models."""
    resource_type: Optional[MCPResourceType] = Field(
        None,
        description="Filter by resource type"
    )
    tags: Optional[List[str]] = Field(
        None,
        description="Filter by tags"
    )
    schema_name: Optional[str] = Field(
        None,
        description="Filter by schema"
    )


class MCPMetricListRequest(BaseModel):
    """Request to list metrics."""
    tags: Optional[List[str]] = Field(
        None,
        description="Filter by tags"
    )


class MCPDimensionListRequest(BaseModel):
    """Request to list dimensions."""
    metric_name: Optional[str] = Field(
        None,
        description="Filter dimensions for a specific metric"
    )


class MCPLineageRequest(BaseModel):
    """Request to get model lineage."""
    model_name: str = Field(
        ...,
        description="Model name or unique_id"
    )
    upstream: bool = Field(
        True,
        description="Include upstream dependencies"
    )
    downstream: bool = Field(
        True,
        description="Include downstream dependents"
    )
    depth: int = Field(
        10,
        ge=1,
        le=50,
        description="Maximum traversal depth"
    )


# ============================================================================
# Response Schemas
# ============================================================================

class MCPColumnInfo(BaseModel):
    """Column metadata from catalog."""
    name: str
    data_type: str
    description: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    tests: Optional[List[str]] = None


class MCPModelResponse(BaseModel):
    """Model information from MCP server."""
    name: str
    unique_id: str
    resource_type: str
    description: Optional[str] = None
    schema_name: Optional[str] = Field(None, alias="schema")
    database: Optional[str] = None
    materialization: Optional[str] = None
    columns: Optional[Dict[str, MCPColumnInfo]] = None
    depends_on: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    meta: Optional[Dict[str, Any]] = None
    path: Optional[str] = None
    
    class Config:
        populate_by_name = True


class MCPModelListResponse(BaseModel):
    """Response from list models request."""
    models: List[MCPModelResponse]
    total_count: int


class MCPMetricResponse(BaseModel):
    """Metric information from semantic layer."""
    name: str
    unique_id: Optional[str] = None
    description: Optional[str] = None
    type: str = "simple"
    type_params: Optional[Dict[str, Any]] = None
    filter: Optional[str] = None
    dimensions: Optional[List[str]] = None
    time_grains: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class MCPMetricListResponse(BaseModel):
    """Response from list metrics request."""
    metrics: List[MCPMetricResponse]


class MCPDimensionResponse(BaseModel):
    """Dimension information from semantic layer."""
    name: str
    unique_id: Optional[str] = None
    description: Optional[str] = None
    type: str = "categorical"
    expr: Optional[str] = None
    is_partition: bool = False
    time_grains: Optional[List[str]] = None


class MCPDimensionListResponse(BaseModel):
    """Response from list dimensions request."""
    dimensions: List[MCPDimensionResponse]


class MCPQueryResultRow(BaseModel):
    """Single row in query result."""
    values: Dict[str, Any]


class MCPQueryResponse(BaseModel):
    """Response from semantic layer query."""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    row_count: int = 0
    query_id: Optional[str] = None
    compiled_sql: Optional[str] = None
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None


class MCPLineageNode(BaseModel):
    """Node in lineage graph."""
    unique_id: str
    name: str
    resource_type: str
    package_name: Optional[str] = None
    schema_name: Optional[str] = Field(None, alias="schema")
    database: Optional[str] = None
    
    # Visual metadata for frontend
    layer: Optional[str] = None  # staging, intermediate, marts
    run_status: Optional[str] = None  # success, error, skipped
    test_status: Optional[str] = None  # pass, fail, warn
    
    class Config:
        populate_by_name = True


class MCPLineageEdge(BaseModel):
    """Edge in lineage graph."""
    source: str = Field(..., description="Source node unique_id")
    target: str = Field(..., description="Target node unique_id")


class MCPLineageResponse(BaseModel):
    """Response from lineage request."""
    nodes: List[MCPLineageNode]
    edges: List[MCPLineageEdge]
    root_model: Optional[str] = None


class MCPTestResult(BaseModel):
    """Test result from dbt run."""
    unique_id: str
    name: str
    status: str  # pass, fail, warn, error, skipped
    execution_time: Optional[float] = None
    failures: Optional[int] = None
    message: Optional[str] = None
    model: Optional[str] = None
    column: Optional[str] = None


class MCPTestResultsResponse(BaseModel):
    """Response from get test results request."""
    results: List[MCPTestResult]
    total_tests: int
    passed: int
    failed: int
    warned: int
    errored: int
    skipped: int


class MCPCatalogResponse(BaseModel):
    """Response from get catalog request."""
    tables: Dict[str, Dict[str, MCPColumnInfo]]
    generated_at: Optional[str] = None


# ============================================================================
# Visual Model Builder Schemas
# ============================================================================

class VisualModelSource(BaseModel):
    """Source table reference for visual model builder."""
    source_name: str = Field(..., description="Source name (e.g., 'salesforce')")
    table_name: str = Field(..., description="Table name (e.g., 'accounts')")
    alias: Optional[str] = Field(None, description="Alias for the table in SQL")


class VisualColumnDefinition(BaseModel):
    """Column definition for visual model builder."""
    source_column: str = Field(..., description="Original column name")
    target_column: Optional[str] = Field(None, description="Renamed column (defaults to source)")
    data_type: Optional[str] = Field(None, description="Target data type for casting")
    expression: Optional[str] = Field(None, description="Custom SQL expression")
    description: Optional[str] = Field(None, description="Column description")
    tests: Optional[List[str]] = Field(None, description="Tests to apply")


class VisualJoinDefinition(BaseModel):
    """Join definition for visual model builder."""
    left_table: str = Field(..., description="Left table alias")
    right_table: str = Field(..., description="Right table alias")
    join_type: Literal["inner", "left", "right", "full"] = Field("left")
    left_column: str = Field(..., description="Left join key")
    right_column: str = Field(..., description="Right join key")
    additional_conditions: Optional[str] = Field(None, description="Extra join conditions")


class VisualAggregation(BaseModel):
    """Aggregation definition for visual model builder."""
    column: str = Field(..., description="Column to aggregate")
    function: AggregationType = Field(..., description="Aggregation function")
    alias: str = Field(..., description="Result column name")


class VisualModelDefinition(BaseModel):
    """Complete visual model definition."""
    name: str = Field(..., min_length=1, max_length=100, description="Model name")
    description: Optional[str] = Field(None, description="Model description")
    layer: Literal["staging", "intermediate", "marts"] = Field(
        ..., description="Model layer"
    )
    materialization: Literal["view", "table", "incremental", "ephemeral"] = Field(
        "view", description="Materialization strategy"
    )
    
    # Source tables
    sources: List[VisualModelSource] = Field(
        ..., min_length=1, description="Source tables"
    )
    
    # Columns
    columns: List[VisualColumnDefinition] = Field(
        ..., min_length=1, description="Column definitions"
    )
    
    # Joins (if multiple sources)
    joins: Optional[List[VisualJoinDefinition]] = Field(
        None, description="Join definitions"
    )
    
    # Filters and aggregations
    where_clause: Optional[str] = Field(None, description="WHERE clause")
    group_by: Optional[List[str]] = Field(None, description="GROUP BY columns")
    aggregations: Optional[List[VisualAggregation]] = Field(
        None, description="Aggregation definitions"
    )
    having_clause: Optional[str] = Field(None, description="HAVING clause")
    
    # Ordering and limits
    order_by: Optional[List[str]] = Field(None, description="ORDER BY columns")
    
    # Metadata
    tags: Optional[List[str]] = Field(None, description="Model tags")
    meta: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    # Incremental config
    incremental_key: Optional[str] = Field(
        None, description="Column for incremental builds"
    )
    unique_key: Optional[str] = Field(
        None, description="Unique key for merge strategy"
    )


class VisualModelCreateRequest(BaseModel):
    """Request to create a model from visual definition."""
    definition: VisualModelDefinition
    generate_schema: bool = Field(True, description="Generate schema.yml file")
    validate_only: bool = Field(False, description="Validate without creating files")


class VisualModelCreateResponse(BaseModel):
    """Response from visual model creation."""
    success: bool
    model_name: str
    model_path: Optional[str] = None
    schema_path: Optional[str] = None
    generated_sql: str
    schema_yaml: Optional[str] = None
    validation_errors: Optional[List[str]] = None


# ============================================================================
# Semantic Model Definition Schemas
# ============================================================================

class SemanticEntityDefinition(BaseModel):
    """Entity definition for semantic model."""
    name: str
    type: Literal["primary", "foreign", "natural"]
    expr: str
    description: Optional[str] = None


class SemanticDimensionDefinition(BaseModel):
    """Dimension definition for semantic model."""
    name: str
    type: DimensionType
    expr: str
    description: Optional[str] = None
    is_partition: bool = False
    type_params: Optional[Dict[str, Any]] = None


class SemanticMeasureDefinition(BaseModel):
    """Measure definition for semantic model."""
    name: str
    agg: AggregationType
    expr: str
    description: Optional[str] = None
    create_metric: bool = False


class SemanticModelDefinition(BaseModel):
    """Complete semantic model YAML definition."""
    name: str
    description: Optional[str] = None
    model: str = Field(..., description="Reference to underlying dbt model (ref)")
    
    entities: List[SemanticEntityDefinition] = Field(
        ..., min_length=1, description="Entity definitions"
    )
    dimensions: Optional[List[SemanticDimensionDefinition]] = Field(
        None, description="Dimension definitions"
    )
    measures: Optional[List[SemanticMeasureDefinition]] = Field(
        None, description="Measure definitions"
    )
    
    defaults: Optional[Dict[str, Any]] = Field(None, description="Default values")


class SemanticMetricDefinition(BaseModel):
    """Semantic layer metric definition."""
    name: str
    description: Optional[str] = None
    type: MetricType
    
    type_params: Dict[str, Any] = Field(
        ..., description="Type-specific parameters"
    )
    
    filter: Optional[str] = Field(None, description="Metric filter")
    
    label: Optional[str] = Field(None, description="Display label")
    

class SemanticLayerExportRequest(BaseModel):
    """Request to export semantic models to dbt YAML."""
    model_ids: Optional[List[str]] = Field(
        None, description="Specific model IDs to export (None = all)"
    )
    overwrite: bool = Field(
        False, description="Overwrite existing YAML files"
    )


class SemanticLayerExportResponse(BaseModel):
    """Response from semantic layer export."""
    success: bool
    files_created: List[str]
    files_updated: List[str]
    errors: Optional[List[str]] = None
