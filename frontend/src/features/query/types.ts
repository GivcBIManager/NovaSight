/**
 * Query Interface Types
 * Types for natural language query feature
 */

export interface QueryIntent {
  query_type: 'trend' | 'comparison' | 'aggregation' | 'detail' | 'correlation'
  dimensions: string[]
  measures: string[]
  filters?: QueryFilter[]
  time_range?: TimeRange
  confidence: number
}

export interface QueryFilter {
  field: string
  operator: string
  value: any
}

export interface TimeRange {
  start?: string
  end?: string
  relative?: string
}

export interface QueryData {
  columns: string[]
  rows: any[][]
  metadata?: {
    row_count: number
    execution_time: number
    cached: boolean
  }
}

export interface QueryResult {
  id: string
  query: string
  intent: QueryIntent
  data: QueryData
  sql: string
  explanation: string
  model_id?: string
  created_at: string
}

export interface QueryHistoryItem {
  id: string
  query: string
  created_at: string
  result_summary?: {
    row_count: number
    query_type: string
  }
}

export interface SaveToWidgetConfig {
  dimensions: string[]
  measures: string[]
  filters?: QueryFilter[]
}
