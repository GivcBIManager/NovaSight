import { useQuery } from '@tanstack/react-query'
import { dataSourceService } from '@/services/dataSourceService'
import { dataSourceKeys } from './useDataSources'

/**
 * Hook to fetch schema information for a data source
 */
export function useDataSourceSchema(
  id: string,
  options?: {
    schema?: string
    include_columns?: boolean
  }
) {
  return useQuery({
    queryKey: [...dataSourceKeys.schema(id), options],
    queryFn: () => dataSourceService.getSchema(id, options),
    enabled: !!id,
    staleTime: 60000, // 1 minute - schemas don't change often
  })
}

/**
 * Hook to fetch sync job status
 */
export function useSyncJobStatus(id: string, jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dataSourceKeys.syncStatus(id, jobId),
    queryFn: () => dataSourceService.getSyncStatus(id, jobId),
    enabled: !!id && !!jobId && (options?.enabled ?? true),
    refetchInterval: (data) => {
      // Stop polling if job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 2000 // Poll every 2 seconds while running
    },
  })
}
