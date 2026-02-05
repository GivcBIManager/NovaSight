/**
 * PySpark Apps React Query Hooks
 * 
 * Custom hooks for PySpark app data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pysparkApi } from '@/services/pysparkApi'
import { useAuthStore } from '@/store/authStore'
import type {
  PySparkAppCreate,
  PySparkAppUpdate,
  PySparkCodePreview,
  QueryValidationRequest,
} from '@/types'

// Params type for list
export interface ListPySparkAppsParams {
  page?: number
  per_page?: number
  status?: string
  search?: string
}

// Query keys
export const pysparkKeys = {
  all: ['pyspark-apps'] as const,
  lists: () => [...pysparkKeys.all, 'list'] as const,
  list: (params: ListPySparkAppsParams) => [...pysparkKeys.lists(), params] as const,
  details: () => [...pysparkKeys.all, 'detail'] as const,
  detail: (id: string) => [...pysparkKeys.details(), id] as const,
  code: (id: string) => [...pysparkKeys.all, 'code', id] as const,
}

/**
 * Hook to list PySpark apps
 */
export function usePySparkApps(params: ListPySparkAppsParams = {}) {
  const { isAuthenticated, accessToken } = useAuthStore()
  
  // Check localStorage directly as fallback - this is what apiClient uses
  const localStorageToken = typeof window !== 'undefined' 
    ? localStorage.getItem('novasight_access_token') 
    : null
  
  // Enable query if we have a token (either in store or localStorage)
  const isEnabled = !!localStorageToken || (isAuthenticated && !!accessToken)

  return useQuery({
    queryKey: pysparkKeys.list(params),
    queryFn: () => pysparkApi.list(params),
    enabled: isEnabled,
  })
}

/**
 * Hook to get a single PySpark app
 */
export function usePySparkApp(appId: string, includeCode: boolean = false) {
  return useQuery({
    queryKey: pysparkKeys.detail(appId),
    queryFn: () => pysparkApi.get(appId, includeCode),
    enabled: !!appId,
  })
}

/**
 * Hook to get PySpark app code
 */
export function usePySparkCode(appId: string) {
  return useQuery({
    queryKey: pysparkKeys.code(appId),
    queryFn: () => pysparkApi.getCode(appId),
    enabled: !!appId,
  })
}

/**
 * Hook to create a PySpark app
 */
export function useCreatePySparkApp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: PySparkAppCreate) => pysparkApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pysparkKeys.lists() })
    },
  })
}

/**
 * Hook to update a PySpark app
 */
export function useUpdatePySparkApp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ appId, data }: { appId: string; data: PySparkAppUpdate }) =>
      pysparkApi.update(appId, data),
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: pysparkKeys.detail(appId) })
      queryClient.invalidateQueries({ queryKey: pysparkKeys.lists() })
    },
  })
}

/**
 * Hook to delete a PySpark app
 */
export function useDeletePySparkApp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (appId: string) => pysparkApi.delete(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pysparkKeys.lists() })
    },
  })
}

/**
 * Hook to generate PySpark code
 */
export function useGeneratePySparkCode() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (appId: string) => pysparkApi.generateCode(appId),
    onSuccess: (_, appId) => {
      queryClient.invalidateQueries({ queryKey: pysparkKeys.detail(appId) })
      queryClient.invalidateQueries({ queryKey: pysparkKeys.code(appId) })
    },
  })
}

/**
 * Hook to preview PySpark code
 */
export function usePreviewPySparkCode() {
  return useMutation({
    mutationFn: (data: PySparkCodePreview) => pysparkApi.previewCode(data),
  })
}

/**
 * Hook to validate SQL query
 */
export function useValidateQuery() {
  return useMutation({
    mutationFn: (data: QueryValidationRequest) => pysparkApi.validateQuery(data),
  })
}
