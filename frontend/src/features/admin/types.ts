/**
 * Admin Feature Types
 * 
 * Type definitions for admin-related entities
 */

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'professional' | 'enterprise'
  is_active: boolean
  users_count: number
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  suspended_at?: string
  suspended_reason?: string
}

export interface TenantQuota {
  tenant_id: string
  max_users: number
  max_connections: number
  max_pipelines: number
  max_storage_gb: number
  max_queries_per_day: number
  used_storage_gb: number
  queries_today: number
}

export interface User {
  id: string
  tenant_id: string
  email: string
  name: string
  is_active: boolean
  email_verified: boolean
  roles: Role[]
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface Role {
  id: string
  name: string
  description?: string
  is_custom: boolean
  permissions: Permission[]
  users_count?: number
}

export interface Permission {
  id: string
  code: string
  name: string
  description: string
  category: string
}

export interface PlatformStatsData {
  tenants_count: number
  active_users: number
  total_storage_gb: number
  queries_today: number
  tenants_by_plan: {
    starter: number
    professional: number
    enterprise: number
  }
  recent_signups: number
  active_connections: number
}

export interface CreateTenantData {
  name: string
  plan: 'starter' | 'professional' | 'enterprise'
  admin_email: string
  admin_name: string
  admin_password: string
  settings?: Record<string, unknown>
}

export interface UpdateTenantData {
  name?: string
  plan?: 'starter' | 'professional' | 'enterprise'
  settings?: Record<string, unknown>
}

export interface CreateUserData {
  name: string
  email: string
  password: string
  roles: string[]
}

export interface UpdateUserData {
  name?: string
  email?: string
  is_active?: boolean
  roles?: string[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}
