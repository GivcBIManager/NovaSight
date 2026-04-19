/**
 * Common shared components for NovaSight
 * 
 * Reusable components that extend Shadcn/UI:
 * - Loading states
 * - Error boundaries
 * - Empty states
 * - Data display components
 * - Route protection
 */

export { LoadingSpinner } from './LoadingSpinner'
export { ErrorBoundary } from './ErrorBoundary'
export { EmptyState } from './EmptyState'
export { PageHeader } from './PageHeader'
export type { PageHeaderProps } from './PageHeader'
export { ProtectedRoute } from '../auth/ProtectedRoute'
