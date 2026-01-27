import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataSourceService } from '@/services/dataSourceService'
import type {
  DataSource,
  DataSourceCreate,
  DataSourceUpdate,
  ConnectionTestRequest,
} from '@/types/datasource'
import { useToast } from '@/components/ui/use-toast'

// Query keys
export const dataSourceKeys = {
  all: ['datasources'] as const,
  lists: () => [...dataSourceKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...dataSourceKeys.lists(), filters] as const,
  details: () => [...dataSourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...dataSourceKeys.details(), id] as const,
  schema: (id: string) => [...dataSourceKeys.detail(id), 'schema'] as const,
  syncStatus: (id: string, jobId: string) => [...dataSourceKeys.detail(id), 'sync', jobId] as const,
}

/**
 * Hook to fetch all data sources with pagination and filtering
 */
export function useDataSources(params?: {
  page?: number
  per_page?: number
  db_type?: string
  status?: string
}) {
  return useQuery({
    queryKey: dataSourceKeys.list(params || {}),
    queryFn: () => dataSourceService.getAll(params),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to fetch a single data source
 */
export function useDataSource(id: string) {
  return useQuery({
    queryKey: dataSourceKeys.detail(id),
    queryFn: () => dataSourceService.getById(id),
    enabled: !!id,
    staleTime: 30000,
  })
}

/**
 * Hook to create a new data source
 */
export function useCreateDataSource() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: DataSourceCreate) => dataSourceService.create(data),
    onSuccess: (newDataSource) => {
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.lists() })
      toast({
        title: 'Success',
        description: `Data source "${newDataSource.name}" created successfully`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create data source',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update an existing data source
 */
export function useUpdateDataSource() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DataSourceUpdate }) =>
      dataSourceService.update(id, data),
    onSuccess: (updatedDataSource) => {
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(updatedDataSource.id) })
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.lists() })
      toast({
        title: 'Success',
        description: `Data source "${updatedDataSource.name}" updated successfully`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update data source',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete a data source
 */
export function useDeleteDataSource() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => dataSourceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.lists() })
      toast({
        title: 'Success',
        description: 'Data source deleted successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete data source',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to test an existing connection
 */
export function useTestConnection() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => dataSourceService.testConnection(id),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Connection successful',
          description: result.message,
        })
      } else {
        toast({
          title: 'Connection failed',
          description: result.message,
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to test connection',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to test new connection parameters
 */
export function useTestNewConnection() {
  return useMutation({
    mutationFn: (data: ConnectionTestRequest) => dataSourceService.testNewConnection(data),
  })
}

/**
 * Hook to trigger a data sync job
 */
export function useTriggerSync() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, config }: { id: string; config?: any }) =>
      dataSourceService.triggerSync(id, config),
    onSuccess: (result) => {
      toast({
        title: 'Sync triggered',
        description: `Sync job ${result.job_id} started`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to trigger sync',
        variant: 'destructive',
      })
    },
  })
}
