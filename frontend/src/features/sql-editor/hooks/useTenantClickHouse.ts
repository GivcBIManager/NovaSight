/**
 * Tenant ClickHouse Hook
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SqlQueryResult } from '../types'

interface ClickHouseInfo {
  database: string
  tenant_id: string
  type: 'clickhouse'
  name: string
}

interface ExecuteClickHouseQueryParams {
  sql: string
  limit?: number
}

export function useTenantClickHouseInfo() {
  return useQuery({
    queryKey: ['tenant-clickhouse-info'],
    queryFn: async () => {
      const response = await api.get<ClickHouseInfo>('/api/v1/clickhouse/info')
      return response.data
    },
  })
}

export function useClickHouseQuery() {
  return useMutation({
    mutationFn: async ({ sql, limit = 1000 }: ExecuteClickHouseQueryParams) => {
      const response = await api.post<SqlQueryResult>('/api/v1/clickhouse/query', {
        sql,
        limit,
      })
      return response.data
    },
  })
}
