/**
 * SQL Editor Types
 */

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  comment?: string
}

export interface TableSchema {
  name: string
  schema: string
  columns: ColumnInfo[]
  rowCount?: number
  comment?: string
}

export interface SchemaInfo {
  name: string
  tables: TableSchema[]
}

export interface SqlQueryResult {
  columns: Array<{
    name: string
    type: string
  }>
  rows: Record<string, unknown>[]
  rowCount: number
  executionTimeMs: number
  truncated: boolean
  error?: string
}

export interface SavedQuery {
  id: string
  tenant_id: string
  name: string
  description?: string
  sql: string
  query_type: 'adhoc' | 'pyspark' | 'dbt' | 'report'
  tags: string[]
  connection_id?: string
  is_clickhouse: boolean
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface DatasourceOption {
  id: string
  name: string
  db_type: string
  status?: string
  is_tenant_clickhouse?: boolean
}

export interface QueryTab {
  id: string
  name: string
  sql: string
  datasourceId?: string
  isClickhouse?: boolean
  result?: SqlQueryResult
  isExecuting?: boolean
  isDirty?: boolean
  savedQueryId?: string
}
