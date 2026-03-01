/**
 * IntermediateNode — React Flow custom node for int_ models.
 *
 * Displays intermediate model with join/business logic info.
 * Color: amber-500. Has both input and output handles.
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { GitMerge } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BaseNodeData } from '../../types/canvas'

export interface IntermediateNodeDataExt extends BaseNodeData {
  sourceModels?: string[]
}

function IntermediateNodeComponent({ data, selected }: NodeProps<IntermediateNodeDataExt>) {
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[180px]
        ${selected ? 'border-amber-600 ring-2 ring-amber-200' : 'border-amber-400'}
      `}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-amber-100 rounded">
          <GitMerge className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Intermediate</div>
          <div className="text-sm font-semibold truncate">{data.label}</div>
        </div>
      </div>

      {/* Materialization */}
      <div className="flex items-center gap-1 mb-1">
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {data.materialization || 'view'}
        </Badge>
        {data.sourceModels && data.sourceModels.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {data.sourceModels.length} source{data.sourceModels.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-[11px] text-muted-foreground line-clamp-2 mb-1">
          {data.description}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {data.tags?.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
}

export const IntermediateNode = memo(IntermediateNodeComponent)
