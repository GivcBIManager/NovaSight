/**
 * TanStack Query hooks for ClickHouse warehouse introspection.
 *
 * Provides hooks for listing schemas, tables, and columns
 * from the tenant's ClickHouse database.
 */

import { useQuery } from '@tanstack/react-query'
import { warehouseApi } from '../services/visualModelApi'

const KEYS = {
  schemas: () => ['warehouse', 'schemas'] as const,
  tables: (schema: string) => ['warehouse', 'tables', schema] as const,
  columns: (schema: string, table: string) => ['warehouse', 'columns', schema, table] as const,
}

/** List ClickHouse schemas/databases. */
export function useWarehouseSchemas() {
  return useQuery({
    queryKey: KEYS.schemas(),
    queryFn: warehouseApi.listSchemas,
  })
}

/** List tables in a schema. */
export function useWarehouseTables(schema: string | undefined) {
  return useQuery({
    queryKey: KEYS.tables(schema!),
    queryFn: () => warehouseApi.listTables(schema!),
    enabled: !!schema,
  })
}

/** List columns for a specific table. */
export function useWarehouseColumns(schema: string | undefined, table: string | undefined) {
  return useQuery({
    queryKey: KEYS.columns(schema!, table!),
    queryFn: () => warehouseApi.listColumns(schema!, table!),
    enabled: !!schema && !!table,
  })
}
