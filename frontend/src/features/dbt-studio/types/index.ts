/**
 * dbt Studio Type Definitions
 * 
 * Types for dbt model building, MCP queries, and lineage visualization.
 */

// ============================================================================
// MCP Types
// ============================================================================

/** Filter operators for semantic queries */
export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in'
  | 'between'

/** Metric types in semantic layer */
export type MetricType = 'simple' | 'derived' | 'cumulative' | 'conversion'

/** Dimension types in semantic layer */
export type MCPDimensionType = 'categorical' | 'time'

/** Aggregation functions */
export type AggregationType = 
  | 'sum' 
  | 'count' 
  | 'count_distinct' 
  | 'average' 
  | 'min' 
  | 'max' 
  | 'median' 
  | 'percentile'

/** Resource types in dbt project */
export type ResourceType = 'model' | 'source' | 'seed' | 'snapshot' | 'test' | 'metric' | 'exposure'

/** dbt model layer (matches backend VisualModelDefinition.layer) */
export type ModelLayer = 'source' | 'staging' | 'intermediate' | 'marts'

/** Materialization strategies */
export type Materialization = 'view' | 'table' | 'incremental' | 'ephemeral'

/** Join types */
export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross'


// ============================================================================
// MCP Query Types
// ============================================================================

/** Filter condition for semantic queries */
export interface MCPQueryFilter {
  dimension: string
  operator: FilterOperator
  value: string | number | (string | number)[] | null
}

/** Test definition for visual builder */
export interface VisualTestDefinition {
  type: string
  column: string
  config?: Record<string, unknown>
}

/** Request to execute a semantic layer query */
export interface MCPQueryRequest {
  metrics: string[]
  dimensions?: string[]
  group_by?: string[]
  where?: MCPQueryFilter[]
  filters?: MCPQueryFilter[]
  order_by?: string[]
  limit?: number
  compile_only?: boolean
}

/** Response from semantic layer query */
export interface MCPQueryResponse {
  success: boolean
  data?: Record<string, unknown>[]
  columns?: string[]
  row_count?: number
  query_id?: string
  compiled_sql?: string
  execution_time_ms?: number
  error?: string
}


// ============================================================================
// Model Types
// ============================================================================

/** Column metadata from catalog */
export interface MCPColumnInfo {
  name: string
  data_type: string
  description?: string
  meta?: Record<string, unknown>
  tests?: string[]
}

/** Model information from MCP server */
export interface MCPModel {
  name: string
  unique_id: string
  resource_type: ResourceType
  description?: string
  schema_name?: string
  database?: string
  materialization?: Materialization
  columns?: Record<string, MCPColumnInfo>
  depends_on?: string[]
  tags?: string[]
  meta?: Record<string, unknown>
  path?: string
}

/** Response from list models request */
export interface MCPModelListResponse {
  models: MCPModel[]
  total_count: number
}


// ============================================================================
// Semantic Layer Metadata Types
// ============================================================================

/** Metric information from semantic layer */
export interface MCPMetric {
  name: string
  unique_id?: string
  description?: string
  type: MetricType
  type_params?: Record<string, unknown>
  filter?: string
  dimensions?: string[]
  time_grains?: string[]
  tags?: string[]
}

/** Dimension information from semantic layer */
export interface MCPDimension {
  name: string
  unique_id?: string
  description?: string
  type: MCPDimensionType
  expr?: string
  is_partition?: boolean
  time_grains?: string[]
  entity?: string
}


// ============================================================================
// Lineage Types
// ============================================================================

/** Test status for a node */
export type TestStatus = 'pass' | 'fail' | 'warn' | 'error' | 'skipped' | 'pending'

/** Run status for a node */
export type RunStatus = 'success' | 'error' | 'skipped' | 'pending'

/** Node in lineage graph */
export interface LineageNode {
  unique_id: string
  name: string
  resource_type: ResourceType
  package_name?: string
  schema_name?: string
  database?: string
  layer?: ModelLayer
  run_status?: RunStatus
  test_status?: TestStatus
  description?: string
  path?: string
  fqn?: string[]
  tags?: string[]
  depends_on?: string[]
}

/** Edge in lineage graph */
export interface LineageEdge {
  source: string
  target: string
}

/** Complete lineage graph */
export interface LineageGraph {
  nodes: LineageNode[]
  edges: LineageEdge[]
  root_model?: string
}


// ============================================================================
// Test Types
// ============================================================================

/** Test result from dbt run */
export interface MCPTestResult {
  unique_id: string
  name: string
  status: TestStatus
  execution_time?: number
  failures?: number
  message?: string
  model?: string
  column?: string
}

/** Response from get test results request */
export interface MCPTestResultsResponse {
  results: MCPTestResult[]
  total_tests: number
  passed: number
  failed: number
  warned: number
  errored: number
  skipped: number
}


// ============================================================================
// Visual Model Builder Types
// ============================================================================

/** Source table reference for visual model builder */
export interface VisualModelSource {
  source_name: string
  table_name: string
  alias?: string
}

/** Column definition for visual model builder */
export interface VisualColumnDefinition {
  name: string
  source_column?: string
  target_column?: string
  data_type?: string
  expression: string
  description?: string
  tests?: string[]
}

/** Join definition for visual model builder */
export interface VisualJoinDefinition {
  left_table: string
  right_table: string
  join_type: JoinType
  left_column: string
  right_column: string
  additional_conditions?: string
}

/** Aggregation definition for visual model builder */
export interface VisualAggregation {
  column: string
  function: AggregationType
  alias: string
}

/** Complete visual model definition */
export interface VisualModelDefinition {
  name: string
  description?: string
  layer: ModelLayer
  materialization: Materialization
  sources?: VisualModelSource[]
  columns?: VisualColumnDefinition[]
  joins?: VisualJoinDefinition[]
  where_clause?: string
  group_by?: string[]
  aggregations?: VisualAggregation[]
  having_clause?: string
  order_by?: string[]
  tags?: string[]
  meta?: Record<string, unknown>
  incremental_key?: string
  unique_key?: string
  tests?: VisualTestDefinition[]
  dependencies?: string[]
}

/** Request to create a model from visual definition */
export interface VisualModelCreateRequest {
  definition: VisualModelDefinition
  generate_schema?: boolean
  validate_only?: boolean
}

/** Response from visual model creation */
export interface VisualModelCreateResponse {
  success: boolean
  model_name: string
  model_path?: string
  schema_path?: string
  generated_sql: string
  schema_yaml?: string
  validation_errors?: string[]
}


// ============================================================================
// Canvas / React Flow Types
// ============================================================================

/** Types for ReactFlow nodes */
export type CanvasNodeType = 'source' | 'staging' | 'intermediate' | 'marts' | 'test' | 'metric'

/** Canvas node data */
export interface CanvasNodeData {
  label: string
  type?: CanvasNodeType
  layer?: ModelLayer
  modelName?: string
  tableName?: string
  sourceName?: string
  columns?: VisualColumnDefinition[]
  description?: string
  materialization?: Materialization
  tags?: string[]
  runStatus?: RunStatus
  testStatus?: TestStatus
  definition?: VisualModelDefinition
}

/** Position for canvas nodes */
export interface CanvasNodePosition {
  x: number
  y: number
}


// ============================================================================
// MCP Server Status Types
// ============================================================================

/** MCP server state */
export type MCPServerState = 'stopped' | 'starting' | 'running' | 'error'

/** MCP server status response */
export interface MCPServerStatus {
  status: MCPServerState
  is_running: boolean
  project_path: string
  target: string
}


// ============================================================================
// Query Builder Types
// ============================================================================

/** Saved query definition */
export interface SavedQuery {
  id: string
  name: string
  description?: string
  metrics: string[]
  dimensions: string[]
  filters: MCPQueryFilter[]
  order_by?: string[]
  limit?: number
  created_at: string
  updated_at: string
  tenant_id: string
  user_id: string
}

/** Query history entry */
export interface QueryHistoryEntry {
  id: string
  query: MCPQueryRequest
  compiled_sql?: string
  row_count?: number
  execution_time_ms?: number
  executed_at: string
  success: boolean
  error?: string
}
