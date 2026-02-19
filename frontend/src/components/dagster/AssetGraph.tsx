/**
 * Dagster Asset Graph Component
 * Visualizes data assets and their dependencies
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dagsterService } from '@/services/dagsterService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  RefreshCw,
  Database,
  Box,
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import type { DagsterAssetGraph, DagsterAssetGraphNode } from '@/types/dagster';

interface AssetGraphProps {
  onAssetSelect?: (assetKey: string[]) => void;
  selectedAssetKey?: string[] | null;
  className?: string;
}

export function AssetGraph({ onAssetSelect, selectedAssetKey, className = '' }: AssetGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  const {
    data: assetGraph,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dagster-asset-graph'],
    queryFn: () => dagsterService.getAssetGraph(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate node positions using a simple layered layout
  const calculatePositions = useCallback((graph: DagsterAssetGraph) => {
    const positions: Record<string, { x: number; y: number }> = {};
    const layers: string[][] = [];
    const nodeToLayer: Record<string, number> = {};

    // Build dependency map
    const inDegree: Record<string, number> = {};
    const inEdges: Record<string, string[]> = {};

    for (const node of graph.nodes) {
      inDegree[node.id] = 0;
      inEdges[node.id] = [];
    }

    for (const edge of graph.edges) {
      if (inDegree[edge.target] !== undefined) {
        inDegree[edge.target]++;
        inEdges[edge.target].push(edge.source);
      }
    }

    // Topological sort to determine layers
    const queue: string[] = [];
    for (const node of graph.nodes) {
      if (inDegree[node.id] === 0) {
        queue.push(node.id);
        nodeToLayer[node.id] = 0;
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const layer = nodeToLayer[nodeId];

      if (!layers[layer]) {
        layers[layer] = [];
      }
      layers[layer].push(nodeId);

      for (const edge of graph.edges) {
        if (edge.source === nodeId) {
          inDegree[edge.target]--;
          const newLayer = Math.max(nodeToLayer[edge.target] || 0, layer + 1);
          nodeToLayer[edge.target] = newLayer;

          if (inDegree[edge.target] === 0) {
            queue.push(edge.target);
          }
        }
      }
    }

    // Handle orphan nodes (not in any layer yet)
    for (const node of graph.nodes) {
      if (nodeToLayer[node.id] === undefined) {
        if (!layers[0]) layers[0] = [];
        layers[0].push(node.id);
        nodeToLayer[node.id] = 0;
      }
    }

    // Assign positions
    const nodeWidth = 200;
    const nodeHeight = 80;
    const horizontalGap = 100;
    const verticalGap = 50;

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx] || [];
      const layerWidth = layer.length * nodeWidth + (layer.length - 1) * horizontalGap;
      const startX = -layerWidth / 2;

      for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
        const nodeId = layer[nodeIdx];
        positions[nodeId] = {
          x: startX + nodeIdx * (nodeWidth + horizontalGap) + nodeWidth / 2,
          y: layerIdx * (nodeHeight + verticalGap),
        };
      }
    }

    return positions;
  }, []);

  useEffect(() => {
    if (assetGraph) {
      setNodePositions(calculatePositions(assetGraph));
    }
  }, [assetGraph, calculatePositions]);

  const getStatusIcon = (status: DagsterAssetGraphNode['status']) => {
    switch (status) {
      case 'fresh':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'materializing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'stale':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'never_materialized':
        return <Box className="h-4 w-4 text-gray-400" />;
      default:
        return <Box className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: DagsterAssetGraphNode['status']) => {
    switch (status) {
      case 'fresh':
        return 'border-green-500 bg-green-50';
      case 'materializing':
        return 'border-blue-500 bg-blue-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      case 'stale':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getComputeKindIcon = (computeKind: string | null) => {
    switch (computeKind?.toLowerCase()) {
      case 'pyspark':
      case 'spark':
        return '⚡';
      case 'dbt':
        return '🔧';
      case 'python':
        return '🐍';
      case 'sql':
        return '📊';
      default:
        return '📦';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex h-64 flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-muted-foreground mb-4">Failed to load asset graph</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!assetGraph || assetGraph.nodes.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex h-64 flex-col items-center justify-center text-center">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No assets found</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate SVG bounds
  const positions = Object.values(nodePositions);
  const minX = Math.min(...positions.map((p) => p.x)) - 150;
  const maxX = Math.max(...positions.map((p) => p.x)) + 150;
  const minY = Math.min(...positions.map((p) => p.y)) - 50;
  const maxY = Math.max(...positions.map((p) => p.y)) + 100;
  const viewBoxWidth = (maxX - minX) / zoom;
  const viewBoxHeight = (maxY - minY) / zoom;

  const selectedKey = selectedAssetKey?.join('/');

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Asset Graph
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[500px] overflow-hidden border rounded-lg bg-slate-50">
          <svg
            className="w-full h-full"
            viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Render edges */}
            {assetGraph.edges.map((edge) => {
              const sourcePos = nodePositions[edge.source];
              const targetPos = nodePositions[edge.target];
              if (!sourcePos || !targetPos) return null;

              return (
                <line
                  key={`${edge.source}-${edge.target}`}
                  x1={sourcePos.x}
                  y1={sourcePos.y + 30}
                  x2={targetPos.x}
                  y2={targetPos.y - 30}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {/* Render nodes */}
            <TooltipProvider>
              {assetGraph.nodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;

                const isSelected = selectedKey === node.id;

                return (
                  <Tooltip key={node.id}>
                    <TooltipTrigger asChild>
                      <g
                        transform={`translate(${pos.x - 90}, ${pos.y - 30})`}
                        className="cursor-pointer"
                        onClick={() => onAssetSelect?.(node.assetKey.path)}
                      >
                        <rect
                          width="180"
                          height="60"
                          rx="8"
                          className={`${getStatusColor(node.status)} ${
                            isSelected ? 'stroke-2 stroke-primary' : 'stroke-1'
                          }`}
                          fill="white"
                          stroke={isSelected ? '#3b82f6' : '#e2e8f0'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        <foreignObject x="8" y="8" width="164" height="44">
                          <div className="flex flex-col h-full">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{getComputeKindIcon(node.computeKind)}</span>
                              <span className="text-xs font-medium truncate flex-1">{node.label}</span>
                              {getStatusIcon(node.status)}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {node.isSource && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                  source
                                </Badge>
                              )}
                              {node.computeKind && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                  {node.computeKind}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{node.assetKey.path.join(' → ')}</p>
                        {node.description && (
                          <p className="text-sm text-muted-foreground">{node.description}</p>
                        )}
                        {node.lastMaterialization && (
                          <p className="text-xs text-muted-foreground">
                            Last materialized: {new Date(node.lastMaterialization).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Fresh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Materializing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span>Stale</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-500" />
            <span>Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Box className="h-4 w-4 text-gray-400" />
            <span>Never Materialized</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
