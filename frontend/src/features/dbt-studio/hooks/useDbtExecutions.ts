/**
 * useDbtExecutions — TanStack Query wrapper for dbt execution history.
 *
 * Backed by GET /api/v1/dbt/executions (tenant-scoped). Supports optional
 * filters (command, status) and auto-refresh while any execution is
 * pending/running so the unified Scheduling page stays live without
 * requiring a full page refresh.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { executionApi } from '../services/visualModelApi'
import type { DbtExecutionRecord } from '../types/visualModel'

export interface UseDbtExecutionsParams {
  limit?: number
  offset?: number
  command?: string
  status?: string
  /** Polling interval in ms. Set to 0 to disable. Defaults to 5000. */
  refetchIntervalMs?: number
  /** Whether the query is enabled. Defaults to true. */
  enabled?: boolean
}

const ACTIVE_STATUSES = new Set(['pending', 'running'])

export function useDbtExecutions({
  limit = 50,
  offset = 0,
  command,
  status,
  refetchIntervalMs = 5000,
  enabled = true,
}: UseDbtExecutionsParams = {}) {
  return useQuery<DbtExecutionRecord[]>({
    queryKey: ['dbt-executions', { limit, offset, command, status }],
    queryFn: () => executionApi.listExecutions({ limit, offset, command, status }),
    enabled,
    // Keep the feed fresh while anything is in-flight; otherwise back off.
    refetchInterval: (query) => {
      if (refetchIntervalMs <= 0) return false
      const rows = query.state.data
      if (!rows || rows.length === 0) return refetchIntervalMs * 4
      return rows.some((r) => ACTIVE_STATUSES.has(r.status))
        ? refetchIntervalMs
        : refetchIntervalMs * 4
    },
  })
}

export function useCancelDbtExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (execId: string) => executionApi.cancelExecution(execId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dbt-executions'] })
    },
  })
}
