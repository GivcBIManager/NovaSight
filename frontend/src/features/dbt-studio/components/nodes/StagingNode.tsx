/**
 * StagingNode — React Flow custom node for stg_ models.
 *
 * Displays staging model info with source reference.
 * Color: green-500. Has both input (from source) and output handles.
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { FileInput } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BaseNodeData } from '../../types/canvas'

export interface StagingNodeDataExt extends BaseNodeData {
  sourceName?: string
  primaryKey?: string
}

function StagingNodeComponent({ data, selected }: NodeProps<StagingNodeDataExt>) {
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[180px]
        ${selected ? 'border-green-600 ring-2 ring-green-200' : 'border-green-400'}
      `}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-green-100 rounded">
          <FileInput className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Staging</div>
          <div className="text-sm font-semibold truncate">{data.label}</div>
        </div>
      </div>

      {/* Materialization + source info */}
      <div className="flex items-center gap-1 mb-1">
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {data.materialization || 'view'}
        </Badge>
        {data.sourceName && (
          <span className="text-[10px] text-muted-foreground truncate">
            ← {data.sourceName}
          </span>
        )}
      </div>

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
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
}

export const StagingNode = memo(StagingNodeComponent)
