/**
 * Domain model type definitions
 *
 * Aligned with the backend modular-monolith contracts.
 * Field names use snake_case to match backend JSON responses.
 */

// ============================================================
// Connection types (mirrors backend datasources domain)
// ============================================================

export interface Connection {
  id: string
  name: string
  db_type: ConnectionType
  host: string
  port: number
  database: string
  username: string
  status: ConnectionStatus
  ssl_mode?: string
  last_tested_at?: string
  created_at: string
  updated_at: string
  created_by?: string
  tenant_id?: string
  extra_params?: Record<string, unknown>
}

/** Supported database types (backend: DatabaseTypeEnum) */
export type ConnectionType =
  | 'postgresql'
  | 'mysql'
  | 'oracle'
  | 'sqlserver'
  | 'clickhouse'

/** Connection status (backend: ConnectionStatusEnum) */
export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'testing'

// ============================================================
// DAG types
// ============================================================

export interface Dag {
  id: string
  name: string
  description?: string
  schedule?: string
  status: DagStatus
  nodes: DagNode[]
  edges: DagEdge[]
  created_at: string
  updated_at: string
  last_run_at?: string
}

export type DagStatus = 'active' | 'paused' | 'draft' | 'error'

export interface DagNode {
  id: string
  type: DagNodeType
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export type DagNodeType =
  | 'source'
  | 'transformation'
  | 'destination'
  | 'python'
  | 'sql'
  | 'dbt'

export interface DagEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

// ============================================================
// Dashboard types (simple model; detailed types in types/dashboard.ts)
// ============================================================

export interface Dashboard {
  id: string
  name: string
  description?: string
  widgets: Widget[]
  created_at: string
  updated_at: string
}

export interface Widget {
  id: string
  type: WidgetType
  title: string
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, unknown>
}

export type WidgetType =
  | 'chart'
  | 'table'
  | 'kpi'
  | 'text'
  | 'filter'

// ============================================================
// Tenant types (backend plans: basic, professional, enterprise)
// ============================================================

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  is_active: boolean
  quotas?: TenantQuotas
  created_at: string
  updated_at?: string
}

export type TenantPlan = 'basic' | 'professional' | 'enterprise'

export interface TenantQuotas {
  max_users: number
  max_connections: number
  max_pipelines: number
  max_storage_gb: number
  max_queries_per_day: number
  used_storage_gb?: number
  queries_today?: number
}

