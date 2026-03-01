/**
 * SourceNode — React Flow custom node for raw source tables.
 *
 * Displays database/table info with column count badge.
 * Color: blue-500. Only has output handles (data flows downstream).
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BaseNodeData } from '../../types/canvas'

export interface SourceNodeData extends BaseNodeData {
  tableName?: string
  columnCount?: number
}

function SourceNodeComponent({ data, selected }: NodeProps<SourceNodeData>) {
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[180px]
        ${selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-blue-400'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-blue-100 rounded">
          <Database className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Source</div>
          <div className="text-sm font-semibold truncate">{data.label}</div>
        </div>
      </div>

      {/* Table name */}
      {data.tableName && (
        <div className="text-xs text-muted-foreground truncate mb-1">
          {data.tableName}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {data.tags?.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
            {tag}
          </Badge>
        ))}
        {data.columnCount !== undefined && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {data.columnCount} cols
          </Badge>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
}

export const SourceNode = memo(SourceNodeComponent)
