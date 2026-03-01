/**
 * MartsNode — React Flow custom node for dim_/fct_/rpt_ models.
 *
 * Displays marts model with schema/materialization info.
 * Color: purple-500. Has input handles only (terminal layer).
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BaseNodeData } from '../../types/canvas'

export interface MartsNodeDataExt extends BaseNodeData {
  schema?: string
  sourceModels?: string[]
}

function MartsNodeComponent({ data, selected }: NodeProps<MartsNodeDataExt>) {
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[180px]
        ${selected ? 'border-purple-600 ring-2 ring-purple-200' : 'border-purple-400'}
      `}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-purple-100 rounded">
          <BarChart3 className="h-4 w-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">Marts</div>
          <div className="text-sm font-semibold truncate">{data.label}</div>
        </div>
      </div>

      {/* Materialization + schema */}
      <div className="flex items-center gap-1 mb-1">
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {data.materialization || 'table'}
        </Badge>
        {data.schema && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-300">
            {data.schema}
          </Badge>
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

      {/* Output handle (bottom) — marts can still be referenced */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
}

export const MartsNode = memo(MartsNodeComponent)
