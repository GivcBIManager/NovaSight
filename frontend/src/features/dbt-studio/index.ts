/**
 * dbt Studio Feature Module
 * 
 * No-code/low-code dbt model builder with MCP server integration.
 * 
 * Features:
 * - Visual model canvas with drag-drop support
 * - Lineage viewer with full DAG visualization
 * - Semantic layer query builder
 * - dbt command execution (run, test, build)
 * - MCP server management
 */

// Types
export * from './types'

// Hooks
export * from './hooks/useDbtStudio'
export * from './hooks/useVisualModels'
export * from './hooks/useWarehouseSchema'
export * from './hooks/useWebSocket'
export * from './hooks/useCodePreview'

// Components
export { ModelCanvas, LineageViewer, MCPQueryBuilder } from './components'
export type { ModelCanvasProps, LineageViewerProps, MCPQueryBuilderProps } from './components'

// Pages
export { DbtStudioPage, EnhancedDbtStudioPage, ModelDetailPage } from './pages'

// Services
export { dbtStudioApi, dbtCoreApi } from './services/dbtStudioApi'
export * from './services/visualModelApi'
