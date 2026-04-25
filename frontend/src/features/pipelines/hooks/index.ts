/**
 * Pipeline Hooks
 * 
 * React Query hooks for pipeline management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelineService } from '@/services/pipelineService'
import type {
  Pipeline,
  PipelineListResponse,
  PipelineFormData,
  PipelinePreviewRequest,
} from '@/types/pipeline'

const PIPELINES_KEY = ['pipelines']

/**
 * Hook to list pipelines
 */
export function usePipelines(params?: {
  status?: string
  connection_id?: string
  search?: string
  page?: number
  per_page?: number
}) {
  return useQuery<PipelineListResponse>({
    queryKey: [...PIPELINES_KEY, 'list', params],
    queryFn: () => pipelineService.list(params),
    staleTime: 30000,
  })
}

/**
 * Hook to get a single pipeline
 */
export function usePipeline(id: string | undefined) {
  return useQuery<Pipeline>({
    queryKey: [...PIPELINES_KEY, id],
    queryFn: () => pipelineService.get(id!),
    enabled: !!id,
    staleTime: 30000,
  })
}

/**
 * Hook to create a pipeline
 */
export function useCreatePipeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: PipelineFormData) => pipelineService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINES_KEY })
    },
  })
}

/**
 * Hook to update a pipeline
 */
export function useUpdatePipeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PipelineFormData> }) =>
      pipelineService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, variables.id] })
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, 'list'] })
    },
  })
}

/**
 * Hook to delete a pipeline
 */
export function useDeletePipeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => pipelineService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINES_KEY })
    },
  })
}

/**
 * Hook to preview pipeline code
 */
export function usePreviewPipelineCode() {
  return useMutation({
    mutationFn: (data: PipelinePreviewRequest) => pipelineService.previewCode(data),
  })
}

/**
 * Hook to generate pipeline code
 */
export function useGeneratePipelineCode() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => pipelineService.generateCode(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, id] })
    },
  })
}

/**
 * Hook to activate a pipeline
 */
export function useActivatePipeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => pipelineService.activate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, 'list'] })
    },
  })
}

/**
 * Hook to deactivate a pipeline
 */
export function useDeactivatePipeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => pipelineService.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, 'list'] })
    },
  })
}

/**
 * Hook to run a pipeline
 */
export function useRunPipeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => pipelineService.run(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [...PIPELINES_KEY, id] })
    },
  })
}
