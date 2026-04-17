# 061 - dbt Model Lineage Frontend

## Metadata

```yaml
prompt_id: "061"
phase: "O1"
agent: "@frontend"
model: "sonnet 4.5"
priority: P0
estimated_effort: "3 days"
dependencies: ["060"]
```

## Objective

Implement the frontend hook and visualization for dbt model lineage.

## Task Description

Create `useModelLineage` hook, lineage visualization panel using ReactFlow, and impact analysis badge.

## Requirements

### 1. Lineage Hook

```typescript
// frontend/src/features/dbt-studio/hooks/useModelLineage.ts
/**
 * useModelLineage — fetches and caches lineage graph for a model.
 * 
 * Returns upstream/downstream nodes + edges in ReactFlow-compatible format.
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

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

export function useModelLineage({
  modelName,
  upstreamDepth = 3,
  downstreamDepth = 3,
  enabled = true,
}: UseModelLineageOptions) {
  return useQuery<LineageGraph>({
    queryKey: ['dbt-lineage', modelName, upstreamDepth, downstreamDepth],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/dbt/lineage/${modelName}`, {
        params: { upstream_depth: upstreamDepth, downstream_depth: downstreamDepth },
      })
      return data
    },
    enabled: enabled && !!modelName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useImpactAnalysis(modelName: string, enabled = true) {
  return useQuery<ImpactAnalysis>({
    queryKey: ['dbt-lineage-impact', modelName],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/dbt/lineage/${modelName}/impact`)
      return data
    },
    enabled: enabled && !!modelName,
    staleTime: 5 * 60 * 1000,
  })
}
```

### 2. Lineage Visualization Panel

```tsx
// frontend/src/features/dbt-studio/components/lineage/LineagePanel.tsx
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
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, GitBranch, ExternalLink } from 'lucide-react'
import { useModelLineage, LineageNode, LineageGraph } from '../../hooks/useModelLineage'
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
        background: layerColors[node.layer || 'source'] + '20',
        border: `2px solid ${layerColors[node.layer || 'source']}`,
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
    markerEnd: { type: 'arrowclosed' as const, color: NODE_TYPE_COLORS.edge },
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
      }
    },
    [onNodeClick]
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
```

### 3. Impact Analysis Badge

```tsx
// frontend/src/features/dbt-studio/components/lineage/ImpactBadge.tsx
/**
 * ImpactBadge — shows downstream impact warning when editing a model.
 */

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useImpactAnalysis } from '../../hooks/useModelLineage'

interface ImpactBadgeProps {
  modelName: string
}

export function ImpactBadge({ modelName }: ImpactBadgeProps) {
  const { data: impact } = useImpactAnalysis(modelName)
  
  if (!impact || impact.affected_models === 0) {
    return null
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="border-amber-400 text-amber-600 dark:text-amber-400 gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            {impact.affected_models} downstream
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Impact Analysis</p>
          <ul className="text-xs space-y-0.5">
            <li>• {impact.affected_models} model(s) depend on this</li>
            {impact.affected_tests > 0 && (
              <li>• {impact.affected_tests} test(s) may be affected</li>
            )}
            {impact.affected_exposures > 0 && (
              <li>• {impact.affected_exposures} exposure(s) reference this</li>
            )}
          </ul>
          {impact.model_names.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              e.g. {impact.model_names.slice(0, 3).join(', ')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

### 4. Export from shared

```typescript
// frontend/src/features/dbt-studio/components/lineage/index.ts
export { LineagePanel } from './LineagePanel'
export { ImpactBadge } from './ImpactBadge'
```

### 5. Wire into ModelCanvas Properties Panel

Add LineagePanel to `ModelPropertiesPanel` when a model is selected:

```tsx
// In ModelCanvas.tsx ModelPropertiesPanel section
import { LineagePanel } from './lineage/LineagePanel'
import { ImpactBadge } from './lineage/ImpactBadge'

// Inside ModelPropertiesPanel, add after the layer/materialization fields:
{definition?.name && (
  <>
    <div className="flex items-center justify-between mb-2">
      <Label className="text-xs">Impact</Label>
      <ImpactBadge modelName={definition.name} />
    </div>
    <LineagePanel
      modelName={definition.name}
      onNodeClick={(name) => {
        // Navigate to that model in dbt Studio
        navigate(`/app/dbt-studio?model=${encodeURIComponent(name)}&tab=builder`)
      }}
    />
  </>
)}
```

## Acceptance Criteria

- [ ] `useModelLineage` hook fetches and caches lineage data
- [ ] `useImpactAnalysis` hook fetches downstream impact counts
- [ ] `LineagePanel` renders a ReactFlow mini-graph with upstream/downstream nodes
- [ ] Nodes are color-coded by layer
- [ ] Clicking a node navigates to that model
- [ ] `ImpactBadge` shows warning when downstream models exist
- [ ] Tooltip shows detailed impact breakdown
- [ ] No TypeScript errors

## Testing

1. Open dbt Studio, select a model
2. Verify LineagePanel shows in sidebar
3. Verify nodes are positioned correctly
4. Click a node → navigates to that model
5. Edit a model with downstream deps → ImpactBadge appears
