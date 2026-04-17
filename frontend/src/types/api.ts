/**
 * API-related type definitions
 *
 * Aligned with the backend modular-monolith contracts.
 * All field names use snake_case to match backend JSON responses.
 */

// ============================================================
// Canonical Roles (mirrors backend platform/auth/constants.py)
// ============================================================

export const ROLE_SUPER_ADMIN = 'super_admin' as const
export const ROLE_TENANT_ADMIN = 'tenant_admin' as const
export const ROLE_DATA_ENGINEER = 'data_engineer' as const
export const ROLE_BI_DEVELOPER = 'bi_developer' as const
export const ROLE_ANALYST = 'analyst' as const
export const ROLE_VIEWER = 'viewer' as const
export const ROLE_AUDITOR = 'auditor' as const

export type UserRole =
  | typeof ROLE_SUPER_ADMIN
  | typeof ROLE_TENANT_ADMIN
  | typeof ROLE_DATA_ENGINEER
  | typeof ROLE_BI_DEVELOPER
  | typeof ROLE_ANALYST
  | typeof ROLE_VIEWER
  | typeof ROLE_AUDITOR

/** Display labels for canonical roles */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrator',
  tenant_admin: 'Tenant Administrator',
  data_engineer: 'Data Engineer',
  bi_developer: 'BI Developer',
  analyst: 'Analyst',
  viewer: 'Viewer',
  auditor: 'Auditor',
}

/** Admin-level roles */
export const ADMIN_ROLES: ReadonlySet<UserRole> = new Set([
  ROLE_SUPER_ADMIN,
  ROLE_TENANT_ADMIN,
])

/** Roles that bypass tenant restrictions */
export const SUPER_ROLES: ReadonlySet<UserRole> = new Set([
  ROLE_SUPER_ADMIN,
])

// ============================================================
// Generic API Envelope
// ============================================================

/** Generic wrapper – some endpoints still use this shape */
export interface ApiResponse<T> {
  data: T
  message?: string
}

// ============================================================
// Pagination (mirrors backend PaginationSchema)
// ============================================================

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * Paginated list response.
 *
 * The backend returns the resource array under a domain-specific key
 * (e.g. `connections`, `tenants`) plus a `pagination` object.
 * For convenience, services normalise the array into `items`.
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationMeta
  /** Shorthand accessors */
  total: number
  page: number
  per_page: number
  pages: number
}

// ============================================================
// Error Envelope (mirrors backend NovaSightException.to_dict)
// ============================================================

export interface ApiErrorDetail {
  code: string
  message: string
  details: Record<string, unknown>
}

export interface ApiError {
  error: ApiErrorDetail
}

// ============================================================
// Authentication
// ============================================================

export interface LoginRequest {
  email: string
  password: string
  tenant_slug?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  tenant_slug: string
}

/** Backend register returns { message, user } – NO tokens */
export interface RegisterResponse {
  message: string
  user: Pick<User, 'id' | 'email' | 'name' | 'tenant_id'>
}

export interface User {
  id: string
  email: string
  name: string
  roles: string[]
  tenant_id: string
  tenant_name?: string
}

// Token refresh
export interface RefreshTokenResponse {
  access_token: string
  token_type: string
}
