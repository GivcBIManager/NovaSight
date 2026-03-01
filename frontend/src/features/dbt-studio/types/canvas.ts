/**
 * Canvas Types for React Flow nodes and edges.
 *
 * Custom node types used by the ModelCanvas to render
 * source, staging, intermediate, and marts model nodes.
 */

import type { Node, Edge } from 'reactflow'

// ============================================================================
// Node Types
// ============================================================================

export type DbtNodeType = 'sourceNode' | 'stagingNode' | 'intermediateNode' | 'martsNode'

export interface BaseNodeData {
  label: string
  materialization: string
  layer: string
  description: string
  tags: string[]
  isSelected?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onPreview?: (id: string) => void
}

export interface SourceNodeData extends BaseNodeData {
  layer: 'source'
  database: string
  schema: string
  tableName: string
  columns: Array<{ name: string; type: string }>
}

export interface StagingNodeData extends BaseNodeData {
  layer: 'staging'
  sourceName: string
  sourceTable: string
  primaryKey?: string
}

export interface IntermediateNodeData extends BaseNodeData {
  layer: 'intermediate'
  sourceModels: string[]
}

export interface MartsNodeData extends BaseNodeData {
  layer: 'marts'
  sourceModels: string[]
  schema?: string
}

export type DbtNodeData = SourceNodeData | StagingNodeData | IntermediateNodeData | MartsNodeData

export type DbtFlowNode = Node<BaseNodeData>
export type DbtFlowEdge = Edge

// ============================================================================
// Edge Types
// ============================================================================

export interface RefEdgeData {
  refType: 'ref' | 'source'
  label?: string
}

// ============================================================================
// Layout & Palette
// ============================================================================

export interface PaletteItem {
  type: DbtNodeType
  label: string
  description: string
  icon: string        // Lucide icon name
  color: string       // tailwind bg color class
  layer: string
}

export const MODEL_PALETTE: PaletteItem[] = [
  {
    type: 'sourceNode',
    label: 'Source Table',
    description: 'Raw data from ClickHouse',
    icon: 'Database',
    color: 'bg-blue-500',
    layer: 'source',
  },
  {
    type: 'stagingNode',
    label: 'Staging Model',
    description: 'stg_ — 1:1 with source, minimal transforms',
    icon: 'FileInput',
    color: 'bg-green-500',
    layer: 'staging',
  },
  {
    type: 'intermediateNode',
    label: 'Intermediate Model',
    description: 'int_ — joins & business logic',
    icon: 'GitMerge',
    color: 'bg-amber-500',
    layer: 'intermediate',
  },
  {
    type: 'martsNode',
    label: 'Marts Model',
    description: 'dim_/fct_/rpt_ — final business entities',
    icon: 'BarChart3',
    color: 'bg-purple-500',
    layer: 'marts',
  },
]
