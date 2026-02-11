/**
 * Saved Queries Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SavedQuery } from '../types'

interface SavedQueriesResponse {
  items: SavedQuery[]
  total: number
  page: number
  per_page: number
  pages: number
}

interface CreateSavedQueryParams {
  name: string
  description?: string
  sql: string
  query_type?: 'adhoc' | 'pyspark' | 'dbt' | 'report'
  tags?: string[]
  connection_id?: string
  is_clickhouse?: boolean
  is_public?: boolean
}

interface UpdateSavedQueryParams {
  id: string
  name?: string
  description?: string
  sql?: string
  query_type?: 'adhoc' | 'pyspark' | 'dbt' | 'report'
  tags?: string[]
  is_public?: boolean
}

interface SavedQueryFilters {
  query_type?: 'adhoc' | 'pyspark' | 'dbt' | 'report'
  connection_id?: string
  is_clickhouse?: boolean
}

export function useSavedQueries(filters?: SavedQueryFilters) {
  return useQuery({
    queryKey: ['saved-queries', filters],
    queryFn: async () => {
      const params = filters || {}
      const response = await api.get<SavedQueriesResponse>('/api/v1/saved-queries', { params })
      return response.data
    },
  })
}

export function useSavedQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['saved-query', id],
    queryFn: async () => {
      if (!id) throw new Error('No query ID')
      const response = await api.get<{ saved_query: SavedQuery }>(`/api/v1/saved-queries/${id}`)
      return response.data.saved_query
    },
    enabled: !!id,
  })
}

export function useCreateSavedQuery() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: CreateSavedQueryParams) => {
      const response = await api.post<{ saved_query: SavedQuery }>('/api/v1/saved-queries', params)
      return response.data.saved_query
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] })
    },
  })
}

export function useUpdateSavedQuery() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...params }: UpdateSavedQueryParams) => {
      const response = await api.patch<{ saved_query: SavedQuery }>(`/api/v1/saved-queries/${id}`, params)
      return response.data.saved_query
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] })
    },
  })
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/saved-queries/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] })
    },
  })
}
