/**
 * useModelLineage — fetches and caches lineage graph for a model.
 * 
 * Returns upstream/downstream nodes + edges in ReactFlow-compatible format.
 */

import { useQuery } from '@tanstack/react-query'
import { dbtStudioApi } from '../services/dbtStudioApi'

export interface LineageNode {
  id: string
  name: string
  resource_type: 'model' | 'source' | 'seed' | 'snapshot' | 'test' | 'exposure'
  layer: 'source' | 'staging' | 'intermediate' | 'marts' | null
  materialization: string
  description: string | null
  tags: string[]
}

export interface LineageEdge {
  source: string
  target: string
}

export interface LineageGraph {
  root: LineageNode
  upstream: LineageNode[]
  downstream: LineageNode[]
  edges: LineageEdge[]
}

export interface ImpactAnalysis {
  affected_models: number
  affected_tests: number
  affected_exposures: number
  model_names: string[]
}

export interface UseModelLineageOptions {
  modelName: string
  upstreamDepth?: number
  downstreamDepth?: number
  enabled?: boolean
}

/**
 * Hook to fetch model lineage with depth control.
 */
export function useModelLineage({
  modelName,
  upstreamDepth = 3,
  downstreamDepth = 3,
  enabled = true,
}: UseModelLineageOptions) {
  return useQuery<LineageGraph>({
    queryKey: ['dbt-lineage', modelName, upstreamDepth, downstreamDepth],
    queryFn: async () => {
      const data = await dbtStudioApi.getLineage(modelName, {
        upstreamDepth,
        downstreamDepth,
      })
      return data as LineageGraph
    },
    enabled: enabled && !!modelName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch impact analysis (downstream dependency counts).
 */
export function useImpactAnalysis(modelName: string, enabled = true) {
  return useQuery<ImpactAnalysis>({
    queryKey: ['dbt-lineage-impact', modelName],
    queryFn: async () => {
      const data = await dbtStudioApi.getImpactAnalysis(modelName)
      return data as ImpactAnalysis
    },
    enabled: enabled && !!modelName,
    staleTime: 5 * 60 * 1000,
  })
}
