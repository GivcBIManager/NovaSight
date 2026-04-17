/**
 * LineagePanel — mini ReactFlow graph showing model dependencies.
 * 
 * Rendered in the ModelCanvas sidebar when a model is selected.
 */

import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, GitBranch } from 'lucide-react'
import { useModelLineage, type LineageGraph, type LineageNode as LineageNodeType } from '../../hooks/useModelLineage'
import { NODE_TYPE_COLORS } from '@/lib/colors'

interface LineagePanelProps {
  modelName: string
  onNodeClick?: (nodeName: string) => void
}

const layerColors: Record<string, string> = {
  source: NODE_TYPE_COLORS.source,
  staging: NODE_TYPE_COLORS.staging,
  intermediate: NODE_TYPE_COLORS.intermediate,
  marts: NODE_TYPE_COLORS.marts,
}

function buildFlowNodes(graph: LineageGraph): Node[] {
  const nodes: Node[] = []
  const allNodes = [graph.root, ...graph.upstream, ...graph.downstream]
  
  // Simple horizontal layout: upstream left, root center, downstream right
  const upstreamIds = new Set(graph.upstream.map(n => n.id))
  const downstreamIds = new Set(graph.downstream.map(n => n.id))
  
  let upstreamX = 0
  let downstreamX = 400
  let upstreamY = 0
  let downstreamY = 0
  
  for (const node of allNodes) {
    let x: number, y: number
    
    if (node.id === graph.root.id) {
      x = 200
      y = 150
    } else if (upstreamIds.has(node.id)) {
      x = upstreamX
      y = upstreamY
      upstreamY += 60
      if (upstreamY > 300) {
        upstreamY = 0
        upstreamX -= 150
      }
    } else {
      x = downstreamX
      y = downstreamY
      downstreamY += 60
      if (downstreamY > 300) {
        downstreamY = 0
        downstreamX += 150
      }
    }
    
    const layerColor = layerColors[node.layer || 'source'] || NODE_TYPE_COLORS.source
    
    nodes.push({
      id: node.id,
      position: { x, y },
      data: {
        label: node.name,
        layer: node.layer,
        resourceType: node.resource_type,
        isRoot: node.id === graph.root.id,
      },
      style: {
        background: `${layerColor}20`,
        border: `2px solid ${layerColor}`,
        borderRadius: 8,
        padding: 8,
        fontSize: 11,
        fontWeight: node.id === graph.root.id ? 600 : 400,
        minWidth: 100,
        textAlign: 'center' as const,
      },
    })
  }
  
  return nodes
}

function buildFlowEdges(graph: LineageGraph): Edge[] {
  return graph.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    animated: false,
    style: { stroke: NODE_TYPE_COLORS.edge, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: NODE_TYPE_COLORS.edge },
  }))
}

export function LineagePanel({ modelName, onNodeClick }: LineagePanelProps) {
  const navigate = useNavigate()
  const { data: graph, isLoading, error, refetch } = useModelLineage({
    modelName,
    upstreamDepth: 2,
    downstreamDepth: 2,
  })
  
  const flowNodes = useMemo(() => (graph ? buildFlowNodes(graph) : []), [graph])
  const flowEdges = useMemo(() => (graph ? buildFlowEdges(graph) : []), [graph])
  
  const [nodes, , onNodesChange] = useNodesState(flowNodes)
  const [edges, , onEdgesChange] = useEdgesState(flowEdges)
  
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data.resourceType === 'model') {
        onNodeClick(node.data.label)
      } else if (node.data.resourceType === 'model') {
        navigate(`/app/dbt-studio?model=${encodeURIComponent(node.data.label)}&tab=builder`)
      }
    },
    [onNodeClick, navigate]
  )
  
  if (isLoading) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    )
  }
  
  if (error || !graph) {
    return (
      <Card className="h-[350px]">
        <CardContent className="flex flex-col items-center justify-center h-full gap-2">
          <p className="text-sm text-muted-foreground">Failed to load lineage</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="h-[350px]">
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Lineage
        </CardTitle>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            ↑{graph.upstream.length}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            ↓{graph.downstream.length}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-48px)]">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#e2e8f0" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </CardContent>
    </Card>
  )
}
