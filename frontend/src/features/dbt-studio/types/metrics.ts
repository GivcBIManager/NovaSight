/**
 * dbt Semantic Layer metric types.
 */

export type MetricType = 'simple' | 'derived' | 'cumulative' | 'ratio'

export type TimeGrain = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface MetricFilter {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value: string | number | string[] | number[]
}

export interface MetricDefinition {
  name: string
  label: string
  description?: string
  type: MetricType
  
  // For simple metrics
  measure?: string
  
  // For derived metrics
  expression?: string
  metrics?: string[]
  
  // For cumulative metrics
  window?: { count: number; grain: TimeGrain }
  
  // For ratio metrics
  numerator?: string
  denominator?: string
  
  // Common
  time_grains: TimeGrain[]
  dimensions: string[]
  filters?: MetricFilter[]
  
  // Metadata
  model_name: string
  tags?: string[]
  owner?: string
  created_at?: string
  updated_at?: string
}

export interface MetricQueryRequest {
  metrics: string[]
  group_by?: string[]
  time_grain?: TimeGrain
  filters?: MetricFilter[]
  limit?: number
}

export interface MetricQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  query_time_ms: number
  compiled_sql?: string
}
