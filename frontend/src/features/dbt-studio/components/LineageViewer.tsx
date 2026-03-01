/**
 * Lineage Viewer Component
 * 
 * Displays dbt model lineage DAG using ReactFlow.
 * Shows upstream/downstream dependencies with color-coded nodes.
 */

import { useMemo, useEffect, useState, memo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  MarkerType,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Database,
  Table2,
  Layers,
  BarChart2,
  RefreshCw,
  Search,
  Filter,
  TestTube,
} from 'lucide-react'
import type {
  LineageNode as LineageNodeData,
  LineageEdge as LineageEdgeData,
  LineageGraph,
  ResourceType,
} from '../types'
import { useFullDag, useLineage, useModelSql } from '../hooks/useDbtStudio'
import { NODE_TYPE_COLORS } from '@/lib/colors'

// ============================================================================
// Node Colors and Icons
// ============================================================================

const resourceConfig: Record<string, { color: string; icon: typeof Database; label: string }> = {
  source: { color: NODE_TYPE_COLORS.source, icon: Database, label: 'Source' },
  model: { color: NODE_TYPE_COLORS.model, icon: Table2, label: 'Model' },
  seed: { color: NODE_TYPE_COLORS.seed, icon: Table2, label: 'Seed' },
  snapshot: { color: NODE_TYPE_COLORS.snapshot, icon: Layers, label: 'Snapshot' },
  metric: { color: NODE_TYPE_COLORS.metric, icon: BarChart2, label: 'Metric' },
  test: { color: NODE_TYPE_COLORS.test, icon: TestTube, label: 'Test' },
}

// Layer colors for models
const layerColors: Record<string, string> = {
  staging: NODE_TYPE_COLORS.staging,
  intermediate: NODE_TYPE_COLORS.intermediate,
  marts: NODE_TYPE_COLORS.marts,
  raw: NODE_TYPE_COLORS.raw,
}

// ============================================================================
// Custom Node Component
// ============================================================================

interface LineageNodeComponentData {
  node: LineageNodeData
  isHighlighted?: boolean
  isSelected?: boolean
  onSelect?: (nodeId: string) => void
}

const LineageNodeComponent = memo(({ data, selected, id }: NodeProps<LineageNodeComponentData>) => {
  const { node, isHighlighted, onSelect } = data
  const config = resourceConfig[node.resource_type] || resourceConfig.model
  const Icon = config.icon

  // Determine color based on layer if it's a model
  let nodeColor = config.color
  if (node.resource_type === 'model' && node.fqn) {
    const layer = node.fqn[1] // Usually fqn is [project, folder, ..., model_name]
    if (layer && layerColors[layer]) {
      nodeColor = layerColors[layer]
    }
  }

  return (
    <div
      className={`
        relative min-w-[140px] rounded-lg border-2 shadow-md transition-all cursor-pointer
        ${selected ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : ''}
        ${isHighlighted ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}
      `}
      style={{
        borderColor: nodeColor,
        backgroundColor: `${nodeColor}15`,
        opacity: isHighlighted === false ? 0.4 : 1,
      }}
      onClick={() => onSelect?.(id)}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-gray-400"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-gray-400"
      />

      {/* Node content */}
      <div className="p-2">
        <div className="flex items-center gap-2">
          <div
            className="p-1 rounded"
            style={{ backgroundColor: nodeColor }}
          >
            <Icon className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
              {node.name}
            </div>
            {node.description && (
              <div className="text-[10px] text-gray-500 truncate">
                {node.description}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {node.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[9px] px-1 py-0"
              >
                {tag}
              </Badge>
            ))}
            {node.tags.length > 2 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                +{node.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
LineageNodeComponent.displayName = 'LineageNodeComponent'

const nodeTypes = {
  lineage: LineageNodeComponent,
}

// ============================================================================
// Node Details Panel
// ============================================================================

interface NodeDetailsPanelProps {
  node: LineageNodeData | null
  onClose: () => void
  onViewUpstream?: (name: string) => void
  onViewDownstream?: (name: string) => void
}

function NodeDetailsPanel({ node, onClose, onViewUpstream, onViewDownstream }: NodeDetailsPanelProps) {
  const { data: sqlData, isLoading: sqlLoading } = useModelSql(
    node?.name || '',
    !!node && node.resource_type === 'model'
  )

  if (!node) return null

  const config = resourceConfig[node.resource_type] || resourceConfig.model
  const Icon = config.icon

  return (
    <Sheet open={!!node} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div
              className="p-1.5 rounded"
              style={{ backgroundColor: config.color }}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            {node.name}
          </SheetTitle>
          <SheetDescription>{config.label}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-500">Details</h4>
            
            {node.description && (
              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <p className="text-sm">{node.description}</p>
              </div>
            )}

            {node.path && (
              <div>
                <Label className="text-xs text-gray-500">File Path</Label>
                <p className="text-sm font-mono">{node.path}</p>
              </div>
            )}

            {node.fqn && (
              <div>
                <Label className="text-xs text-gray-500">FQN</Label>
                <p className="text-sm font-mono">{node.fqn.join('.')}</p>
              </div>
            )}

            {node.tags && node.tags.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500">Tags</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {node.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-500">Dependencies</h4>
            
            {node.depends_on && node.depends_on.length > 0 ? (
              <div>
                <Label className="text-xs text-gray-500">Depends On</Label>
                <ul className="mt-1 space-y-1">
                  {node.depends_on.map((dep) => (
                    <li key={dep} className="flex items-center gap-2">
                      <Database className="h-3 w-3 text-gray-400" />
                      <span className="text-sm font-mono">{dep}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upstream dependencies</p>
            )}
          </div>

          {/* SQL Preview */}
          {node.resource_type === 'model' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-500">Compiled SQL</h4>
              </div>
              
              {sqlLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : sqlData?.sql ? (
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto max-h-48">
                  {sqlData.sql}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">Unable to load SQL</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onViewUpstream?.(node.name)}
            >
              View Upstream
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onViewDownstream?.(node.name)}
            >
              View Downstream
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================================
// Layout Algorithm
// ============================================================================

function calculateLayout(lineageNodes: LineageNodeData[], lineageEdges: LineageEdgeData[]) {
  // Build adjacency list
  const inDegree = new Map<string, number>()
  const outEdges = new Map<string, string[]>()
  
  lineageNodes.forEach((node) => {
    inDegree.set(node.unique_id, 0)
    outEdges.set(node.unique_id, [])
  })
  
  lineageEdges.forEach((edge) => {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    const edges = outEdges.get(edge.source) || []
    edges.push(edge.target)
    outEdges.set(edge.source, edges)
  })

  // Topological sort to determine layers
  const layers: string[][] = []
  const remaining = new Set(lineageNodes.map((n) => n.unique_id))
  
  while (remaining.size > 0) {
    const layer: string[] = []
    remaining.forEach((nodeId) => {
      if (inDegree.get(nodeId) === 0) {
        layer.push(nodeId)
      }
    })
    
    if (layer.length === 0) {
      // Cycle detected, just take any remaining
      layer.push([...remaining][0])
    }
    
    layer.forEach((nodeId) => {
      remaining.delete(nodeId)
      const edges = outEdges.get(nodeId) || []
      edges.forEach((target) => {
        inDegree.set(target, (inDegree.get(target) || 0) - 1)
      })
    })
    
    layers.push(layer)
  }

  // Create positioned nodes
  const nodePositions = new Map<string, { x: number; y: number }>()
  const xSpacing = 250
  const ySpacing = 100
  
  layers.forEach((layer, layerIndex) => {
    const layerHeight = layer.length * ySpacing
    const startY = -layerHeight / 2 + ySpacing / 2
    
    layer.forEach((nodeId, nodeIndex) => {
      nodePositions.set(nodeId, {
        x: layerIndex * xSpacing,
        y: startY + nodeIndex * ySpacing,
      })
    })
  })

  return nodePositions
}

// ============================================================================
// Main LineageViewer Component
// ============================================================================

export interface LineageViewerProps {
  modelName?: string
  showFullDag?: boolean
  depth?: number
  upstream?: boolean
  downstream?: boolean
  onNodeSelect?: (node: LineageNodeData) => void
}

export function LineageViewer({
  modelName,
  showFullDag = false,
  depth = 3,
  upstream = true,
  downstream = true,
  onNodeSelect,
}: LineageViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ResourceType | 'all'>('all')
  const [lineageData, setLineageData] = useState<LineageGraph | null>(null)

  // Fetch lineage data
  const {
    data: singleLineage,
    isLoading: singleLoading,
    refetch: refetchSingle,
  } = useLineage(modelName || '', { upstream, downstream, depth }, !!modelName && !showFullDag)

  const {
    data: fullDag,
    isLoading: fullDagLoading,
    refetch: refetchFullDag,
  } = useFullDag(showFullDag)

  const isLoading = showFullDag ? fullDagLoading : singleLoading
  const refetch = showFullDag ? refetchFullDag : refetchSingle

  // Process lineage data when it changes
  useEffect(() => {
    const data = showFullDag ? fullDag : singleLineage
    if (!data) return

    setLineageData(data)

    // Calculate layout
    const nodePositions = calculateLayout(data.nodes, data.edges)

    // Filter nodes
    let filteredNodes = data.nodes
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filteredNodes = filteredNodes.filter(
        (n) =>
          n.name.toLowerCase().includes(term) ||
          n.description?.toLowerCase().includes(term)
      )
    }
    if (filterType !== 'all') {
      filteredNodes = filteredNodes.filter((n) => n.resource_type === filterType)
    }

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.unique_id))

    // Create ReactFlow nodes
    const flowNodes: Node<LineageNodeComponentData>[] = data.nodes.map((node) => ({
      id: node.unique_id,
      type: 'lineage',
      position: nodePositions.get(node.unique_id) || { x: 0, y: 0 },
      data: {
        node,
        isHighlighted: filteredNodeIds.size === data.nodes.length ? undefined : filteredNodeIds.has(node.unique_id),
        onSelect: setSelectedNodeId,
      },
    }))

    // Create ReactFlow edges
    const flowEdges: Edge[] = data.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: edge.source === selectedNodeId || edge.target === selectedNodeId,
      style: {
        stroke: NODE_TYPE_COLORS.edgeMuted,
        strokeWidth: 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: NODE_TYPE_COLORS.edgeMuted,
        width: 15,
        height: 15,
      },
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [singleLineage, fullDag, showFullDag, searchTerm, filterType, selectedNodeId, setNodes, setEdges])

  // Get selected node data
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !lineageData) return null
    return lineageData.nodes.find((n) => n.unique_id === selectedNodeId) || null
  }, [selectedNodeId, lineageData])

  // Notify parent when selection changes
  useEffect(() => {
    if (selectedNode) {
      onNodeSelect?.(selectedNode)
    }
  }, [selectedNode, onNodeSelect])

  return (
    <div className="flex h-full">
      {/* Main Canvas */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="py-2 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {showFullDag ? 'Full Project Lineage' : `Lineage: ${modelName}`}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 w-48"
                />
              </div>
              
              {/* Filter */}
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as ResourceType | 'all')}
              >
                <SelectTrigger className="h-8 w-32">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="source">Sources</SelectItem>
                  <SelectItem value="model">Models</SelectItem>
                  <SelectItem value="seed">Seeds</SelectItem>
                  <SelectItem value="snapshot">Snapshots</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-53px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Layers className="h-12 w-12 mb-4" />
              <p>No lineage data available</p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const nodeData = node.data?.node
                  if (!nodeData) return '#gray'
                  const config = resourceConfig[nodeData.resource_type]
                  return config?.color || '#gray'
                }}
                maskColor="rgba(0,0,0,0.1)"
              />
              
              {/* Legend */}
              <Panel position="bottom-left" className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md">
                <div className="flex flex-wrap gap-3 text-xs">
                  {Object.entries(resourceConfig).map(([type, config]) => (
                    <div key={type} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: config.color }}
                      />
                      <span>{config.label}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </ReactFlow>
          )}
        </CardContent>
      </Card>

      {/* Details Panel */}
      <NodeDetailsPanel
        node={selectedNode}
        onClose={() => setSelectedNodeId(null)}
        onViewUpstream={(name) => {
          // Could navigate to filtered view
          console.log('View upstream of', name)
        }}
        onViewDownstream={(name) => {
          // Could navigate to filtered view
          console.log('View downstream of', name)
        }}
      />
    </div>
  )
}

export default LineageViewer
