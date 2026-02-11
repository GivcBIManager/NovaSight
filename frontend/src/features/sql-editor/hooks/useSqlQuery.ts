/**
 * SQL Query Execution Hook
 */

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SqlQueryResult } from '../types'

interface ExecuteQueryParams {
  sql: string
  datasourceId?: string
  isClickhouse?: boolean
  limit?: number
}

interface ExecuteQueryResponse {
  columns: Array<{ name: string; type: string }>
  rows: Record<string, unknown>[]
  row_count: number
  execution_time_ms: number
  truncated: boolean
}

export function useSqlQuery() {
  const [result, setResult] = useState<SqlQueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ sql, datasourceId, isClickhouse, limit = 1000 }: ExecuteQueryParams) => {
      // Use ClickHouse endpoint for tenant ClickHouse
      if (isClickhouse) {
        const response = await api.post<ExecuteQueryResponse>('/api/v1/clickhouse/query', {
          sql,
          limit,
        })
        return response.data
      }
      
      // Use connection endpoint for configured datasources
      if (!datasourceId) {
        throw new Error('No datasource selected')
      }
      
      const response = await api.post<ExecuteQueryResponse>('/api/v1/query/execute', {
        sql,
        connection_id: datasourceId,
        limit,
      })
      return response.data
    },
    onSuccess: (data) => {
      setResult({
        columns: data.columns,
        rows: data.rows,
        rowCount: data.row_count,
        executionTimeMs: data.execution_time_ms,
        truncated: data.truncated,
      })
      setError(null)
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed'
      // Try to extract error from API response
      const apiError = err as { response?: { data?: { error?: { message?: string } } } }
      const message = apiError.response?.data?.error?.message || errorMessage
      setError(message)
      setResult(null)
    },
  })

  const execute = useCallback(
    (params: ExecuteQueryParams) => {
      setError(null)
      mutation.mutate(params)
    },
    [mutation]
  )

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    execute,
    result,
    error,
    isLoading: mutation.isPending,
    clear,
  }
}
