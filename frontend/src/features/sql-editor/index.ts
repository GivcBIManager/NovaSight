/**
 * SQL Editor Feature Module
 * Direct SQL query interface with Monaco editor
 */

// Pages
export { SqlEditorPage } from './pages/SqlEditorPage'

// Components
export { SQLEditor } from './components/SQLEditor'
export { ResultsTable } from './components/ResultsTable'
export { SchemaExplorer } from './components/SchemaExplorer'
export { QueryTabs } from './components/QueryTabs'

// Hooks
export { useSqlQuery } from './hooks/useSqlQuery'
export { useSchemaExplorer } from './hooks/useSchemaExplorer'
export { useSavedQueries, useCreateSavedQuery, useUpdateSavedQuery, useDeleteSavedQuery } from './hooks/useSavedQueries'
export { useTenantClickHouseInfo, useClickHouseQuery } from './hooks/useTenantClickHouse'

// Types
export type { SqlQueryResult, SchemaInfo, TableSchema, ColumnInfo, SavedQuery, DatasourceOption } from './types'
