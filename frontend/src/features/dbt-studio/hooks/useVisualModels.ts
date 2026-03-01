/**
 * TanStack Query hooks for Visual Model CRUD API.
 *
 * Provides query/mutation hooks for the visual model builder,
 * including create, update, delete, preview, and DAG.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { visualModelApi } from '../services/visualModelApi'
import type {
  VisualModelCreatePayload,
  VisualModelUpdatePayload,
  CanvasStatePayload,
} from '../types/visualModel'

const KEYS = {
  all: ['visual-models'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  preview: (id: string) => [...KEYS.all, 'preview', id] as const,
  dag: () => [...KEYS.all, 'dag'] as const,
}

/** List all visual models for the current tenant. */
export function useVisualModels() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: visualModelApi.listModels,
  })
}

/** Get a single visual model by ID. */
export function useVisualModel(modelId: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(modelId!),
    queryFn: () => visualModelApi.getModel(modelId!),
    enabled: !!modelId,
  })
}

/** Create a new visual model. */
export function useCreateVisualModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: VisualModelCreatePayload) => visualModelApi.createModel(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.dag() })
    },
  })
}

/** Update an existing visual model. */
export function useUpdateVisualModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, payload }: { modelId: string; payload: VisualModelUpdatePayload }) =>
      visualModelApi.updateModel(modelId, payload),
    onSuccess: (_data, { modelId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(modelId) })
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.dag() })
    },
  })
}

/** Delete a visual model. */
export function useDeleteVisualModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (modelId: string) => visualModelApi.deleteModel(modelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.dag() })
    },
  })
}

/** Preview generated SQL/YAML for a model. */
export function useCodePreview(modelId: string | undefined) {
  return useQuery({
    queryKey: KEYS.preview(modelId!),
    queryFn: () => visualModelApi.previewCode(modelId!),
    enabled: !!modelId,
  })
}

/** Save canvas state (position only). */
export function useSaveCanvasState() {
  return useMutation({
    mutationFn: ({ modelId, payload }: { modelId: string; payload: CanvasStatePayload }) =>
      visualModelApi.saveCanvasState(modelId, payload),
  })
}

/** Get the full DAG for React Flow. */
export function useVisualDag() {
  return useQuery({
    queryKey: KEYS.dag(),
    queryFn: visualModelApi.getDag,
  })
}
