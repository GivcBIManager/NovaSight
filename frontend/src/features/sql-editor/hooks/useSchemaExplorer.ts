/**
 * Schema Explorer Hook
 */

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SchemaInfo } from '../types'

// Backend response: { schema: { schemas: [...], total_tables: N, total_columns: M } }
interface SchemaResponse {
  schema: {
    schemas: Array<{
      name: string
      tables: Array<{
        name: string
        schema: string
        columns?: Array<{
          name: string
          data_type: string
          nullable: boolean
          is_nullable?: boolean
          primary_key?: boolean
          comment?: string
        }>
        row_count?: number
        comment?: string
        table_type?: string
      }>
    }>
    total_tables: number
    total_columns: number
    error?: string
  }
}

export function useSchemaExplorer(datasourceId: string | undefined) {
  const query = useQuery({
    queryKey: ['schema', datasourceId],
    queryFn: async () => {
      if (!datasourceId) throw new Error('No datasource selected')
      
      // First fetch schemas and tables without columns (fast)
      const response = await api.get<SchemaResponse>(
        `/api/v1/connections/${datasourceId}/schema`,
        { params: { include_columns: 'false' } }
      )
      
      // Handle error response
      if (response.data.schema.error) {
        throw new Error(response.data.schema.error)
      }
      
      // Transform response to our types
      const schemas: SchemaInfo[] = response.data.schema.schemas.map((schema) => ({
        name: schema.name,
        tables: schema.tables.map((table) => ({
          name: table.name,
          schema: table.schema,
          columns: (table.columns || []).map((col) => ({
            name: col.name,
            type: col.data_type,
            nullable: col.nullable ?? col.is_nullable ?? true,
            isPrimaryKey: col.primary_key,
            isForeignKey: false,
            comment: col.comment,
          })),
          rowCount: table.row_count,
          comment: table.comment,
        })),
      }))
      
      return schemas
    },
    enabled: !!datasourceId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  return {
    schemas: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  }
}

export function useTablePreview(datasourceId: string | undefined, tableName: string | undefined) {
  return useQuery({
    queryKey: ['table-preview', datasourceId, tableName],
    queryFn: async () => {
      if (!datasourceId || !tableName) throw new Error('Missing parameters')
      
      const response = await api.get<{ rows: Record<string, unknown>[] }>(
        `/api/v1/connections/${datasourceId}/tables/${tableName}/preview`
      )
      
      return response.data.rows
    },
    enabled: !!datasourceId && !!tableName,
  })
}
