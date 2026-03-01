/**
 * RefEdge — Custom React Flow edge showing ref() relationships.
 *
 * Animated edge with a label showing the type of reference
 * (ref or source). Uses a bezier path with an arrow marker.
 */

import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'

function RefEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#94a3b8',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-mono"
        >
          ref()
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const RefEdge = memo(RefEdgeComponent)
