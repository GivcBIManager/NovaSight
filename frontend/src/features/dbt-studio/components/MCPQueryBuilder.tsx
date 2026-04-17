/**
 * MCP Query Builder Component
 * 
 * Visual interface for building and executing semantic layer queries.
 * Supports metric/dimension selection, filtering, and result visualization.
 */

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Play,
  Code2,
  BarChart2,
  Columns,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type {
  MCPQueryRequest,
  MCPQueryResponse,
  MCPQueryFilter,
  MCPMetric,
  MCPDimension,
  FilterOperator,
} from '../types'
import { useMetrics, useDimensions, useSemanticQuery, useCompileQuery } from '../hooks/useDbtStudio'
import { SaveAsQueryButton } from './shared/SaveAsQueryButton'

// ============================================================================
// Filter Builder Component
// ============================================================================

interface FilterBuilderProps {
  filters: MCPQueryFilter[]
  dimensions: MCPDimension[]
  onChange: (filters: MCPQueryFilter[]) => void
}

const operatorLabels: Record<FilterOperator, string> = {
  equals: '=',
  not_equals: '≠',
  greater_than: '>',
  less_than: '<',
  greater_than_or_equal: '≥',
  less_than_or_equal: '≤',
  contains: 'contains',
  not_contains: 'not contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_null: 'is null',
  is_not_null: 'is not null',
  in: 'in',
  not_in: 'not in',
  between: 'between',
}

function FilterBuilder({ filters, dimensions, onChange }: FilterBuilderProps) {
  const addFilter = () => {
    const newFilter: MCPQueryFilter = {
      dimension: dimensions[0]?.name || '',
      operator: 'equals',
      value: '',
    }
    onChange([...filters, newFilter])
  }

  const updateFilter = (index: number, updates: Partial<MCPQueryFilter>) => {
    const updated = [...filters]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeFilter = (index: number) => {
    const updated = [...filters]
    updated.splice(index, 1)
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Filters</Label>
        <Button variant="outline" size="sm" onClick={addFilter}>
          <Plus className="h-4 w-4 mr-1" />
          Add Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No filters applied</p>
      ) : (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={filter.dimension}
                onValueChange={(value) => updateFilter(index, { dimension: value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Dimension" />
                </SelectTrigger>
                <SelectContent>
                  {dimensions.map((dim) => (
                    <SelectItem key={dim.name} value={dim.name}>
                      {dim.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.operator}
                onValueChange={(value) => updateFilter(index, { operator: value as FilterOperator })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(operatorLabels).map(([op, label]) => (
                    <SelectItem key={op} value={op}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!['is_null', 'is_not_null'].includes(filter.operator) && (
                <Input
                  placeholder="Value"
                  value={typeof filter.value === 'string' ? filter.value : ''}
                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                  className="flex-1"
                />
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFilter(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Metric Selector Component
// ============================================================================

interface MetricSelectorProps {
  metrics: MCPMetric[]
  selected: string[]
  onChange: (selected: string[]) => void
  isLoading?: boolean
}

function MetricSelector({ metrics, selected, onChange, isLoading }: MetricSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMetrics = useMemo(() => {
    if (!searchTerm) return metrics
    const term = searchTerm.toLowerCase()
    return metrics.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term)
    )
  }, [metrics, searchTerm])

  const toggleMetric = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((m) => m !== name))
    } else {
      onChange([...selected, name])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Metrics</Label>
        <Badge variant="secondary">{selected.length} selected</Badge>
      </div>

      <Input
        placeholder="Search metrics..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <ScrollArea className="h-48 border rounded-md p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filteredMetrics.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No metrics found
          </p>
        ) : (
          <div className="space-y-1">
            {filteredMetrics.map((metric) => (
              <div
                key={metric.name}
                className={`
                  flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800
                  ${selected.includes(metric.name) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
                onClick={() => toggleMetric(metric.name)}
              >
                <Checkbox
                  checked={selected.includes(metric.name)}
                  onCheckedChange={() => toggleMetric(metric.name)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="font-medium text-sm truncate">{metric.name}</span>
                  </div>
                  {metric.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {metric.description}
                    </p>
                  )}
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {metric.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// Dimension Selector Component
// ============================================================================

interface DimensionSelectorProps {
  dimensions: MCPDimension[]
  selected: string[]
  onChange: (selected: string[]) => void
  isLoading?: boolean
}

function DimensionSelector({ dimensions, selected, onChange, isLoading }: DimensionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredDimensions = useMemo(() => {
    if (!searchTerm) return dimensions
    const term = searchTerm.toLowerCase()
    return dimensions.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term)
    )
  }, [dimensions, searchTerm])

  const toggleDimension = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((d) => d !== name))
    } else {
      onChange([...selected, name])
    }
  }

  // Group dimensions by entity
  const groupedDimensions = useMemo(() => {
    const groups: Record<string, MCPDimension[]> = {}
    filteredDimensions.forEach((dim) => {
      const entity = dim.entity || 'Other'
      if (!groups[entity]) groups[entity] = []
      groups[entity].push(dim)
    })
    return groups
  }, [filteredDimensions])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Dimensions</Label>
        <Badge variant="secondary">{selected.length} selected</Badge>
      </div>

      <Input
        placeholder="Search dimensions..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <ScrollArea className="h-48 border rounded-md p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : Object.keys(groupedDimensions).length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No dimensions found
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedDimensions).map(([entity, dims]) => (
              <Collapsible key={entity} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-1 w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                  <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>svg&]:rotate-90" />
                  {entity}
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {dims.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {dims.map((dim) => (
                    <div
                      key={dim.name}
                      className={`
                        flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800
                        ${selected.includes(dim.name) ? 'bg-green-50 dark:bg-green-900/20' : ''}
                      `}
                      onClick={() => toggleDimension(dim.name)}
                    >
                      <Checkbox
                        checked={selected.includes(dim.name)}
                        onCheckedChange={() => toggleDimension(dim.name)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Columns className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-sm truncate">{dim.name}</span>
                        </div>
                        {dim.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {dim.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// Results Table Component
// ============================================================================

interface ResultsTableProps {
  result: MCPQueryResponse | null
  isLoading?: boolean
}

function ResultsTable({ result, isLoading }: ResultsTableProps) {
  const { toast } = useToast()

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        <BarChart2 className="h-12 w-12 mb-4" />
        <p>Run a query to see results</p>
      </div>
    )
  }

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>{result.error || 'Query failed'}</p>
      </div>
    )
  }

  const columns = result.columns || []
  const data = result.data || []

  const copyToClipboard = () => {
    const headers = columns.join('\t')
    const rows = data.map((row) => columns.map((col) => row[col] ?? '').join('\t'))
    navigator.clipboard.writeText([headers, ...rows].join('\n'))
    toast({ title: 'Copied to clipboard' })
  }

  const downloadCSV = () => {
    const headers = columns.join(',')
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col]
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`
          }
          return val ?? ''
        })
        .join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'query_results.csv'
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Result header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {data.length} rows
          </span>
          {result.query_id && (
            <span className="text-gray-500 font-mono text-xs">
              ID: {result.query_id}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* Compiled SQL */}
      {result.compiled_sql && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <Code2 className="h-4 w-4" />
            View Compiled SQL
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
              {result.compiled_sql}
            </pre>
            <div className="flex justify-end">
              <SaveAsQueryButton
                sql={result.compiled_sql}
                defaultName="mcp_query"
                defaultDescription="Compiled from dbt Semantic Layer"
                defaultTags={['dbt', 'semantic-layer', 'mcp']}
                queryType="dbt"
                size="xs"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Data table */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="max-h-80">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col} className="whitespace-nowrap">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col) => (
                    <TableCell key={col} className="font-mono text-sm">
                      {row[col] !== null && row[col] !== undefined
                        ? String(row[col])
                        : <span className="text-gray-400 italic">null</span>
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  )
}

// ============================================================================
// Main MCPQueryBuilder Component
// ============================================================================

export interface MCPQueryBuilderProps {
  onQueryExecuted?: (result: MCPQueryResponse) => void
}

export function MCPQueryBuilder({ onQueryExecuted }: MCPQueryBuilderProps) {
  const { toast } = useToast()
  
  // Query state
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([])
  const [filters, setFilters] = useState<MCPQueryFilter[]>([])
  const [limit, setLimit] = useState<number>(100)
  const [orderBy, setOrderBy] = useState<string>('__none__')
  const [activeTab, setActiveTab] = useState<'build' | 'results'>('build')

  // API hooks
  const { data: metrics, isLoading: metricsLoading } = useMetrics()
  const { data: dimensions, isLoading: dimensionsLoading } = useDimensions()
  const queryMutation = useSemanticQuery()
  const compileMutation = useCompileQuery()

  // Build query request
  const buildQueryRequest = useCallback((): MCPQueryRequest => {
    return {
      metrics: selectedMetrics,
      group_by: selectedDimensions,
      where: filters.length > 0 ? filters : undefined,
      order_by: orderBy && orderBy !== '__none__' ? [orderBy] : undefined,
      limit: limit > 0 ? limit : undefined,
    }
  }, [selectedMetrics, selectedDimensions, filters, orderBy, limit])

  // Execute query
  const handleRunQuery = async () => {
    if (selectedMetrics.length === 0) {
      toast({
        title: 'Select at least one metric',
        variant: 'destructive',
      })
      return
    }

    try {
      const request = buildQueryRequest()
      const result = await queryMutation.mutateAsync(request)
      setActiveTab('results')
      onQueryExecuted?.(result)
      
      if (result.success) {
        toast({
          title: 'Query executed',
          description: `${result.data?.length || 0} rows returned`,
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Query failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Compile query to SQL
  const handleCompileQuery = async () => {
    if (selectedMetrics.length === 0) {
      toast({
        title: 'Select at least one metric',
        variant: 'destructive',
      })
      return
    }

    try {
      const request = buildQueryRequest()
      const result = await compileMutation.mutateAsync(request)
      
      if (result.success && result.compiled_sql) {
        toast({
          title: 'Query compiled',
          description: 'SQL copied to clipboard',
        })
        navigator.clipboard.writeText(result.compiled_sql)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Compile failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Clear query
  const handleClear = () => {
    setSelectedMetrics([])
    setSelectedDimensions([])
    setFilters([])
    setOrderBy('__none__')
    setLimit(100)
  }

  const isQueryValid = selectedMetrics.length > 0

  return (
    <div className="flex h-full gap-4">
      {/* Query Builder Panel */}
      <Card className="w-80 shrink-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Query Builder</CardTitle>
          <CardDescription className="text-xs">
            Select metrics and dimensions to query
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metric Selector */}
          <MetricSelector
            metrics={metrics?.metrics || []}
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            isLoading={metricsLoading}
          />

          {/* Dimension Selector */}
          <DimensionSelector
            dimensions={dimensions?.dimensions || []}
            selected={selectedDimensions}
            onChange={setSelectedDimensions}
            isLoading={dimensionsLoading}
          />

          {/* Filter Builder */}
          <FilterBuilder
            filters={filters}
            dimensions={dimensions?.dimensions || []}
            onChange={setFilters}
          />

          {/* Options */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Limit</Label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                  min={0}
                  max={10000}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Order By</Label>
                <Select value={orderBy} onValueChange={setOrderBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {selectedMetrics.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                    {selectedDimensions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleRunQuery}
              disabled={!isQueryValid || queryMutation.isPending}
            >
              {queryMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Run
            </Button>
            <Button
              variant="outline"
              onClick={handleCompileQuery}
              disabled={!isQueryValid || compileMutation.isPending}
            >
              <Code2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card className="flex-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'build' | 'results')}>
          <CardHeader className="py-2 px-4 border-b">
            <TabsList>
              <TabsTrigger value="build">Query Preview</TabsTrigger>
              <TabsTrigger value="results">
                Results
                {queryMutation.data?.data && (
                  <Badge variant="secondary" className="ml-2">
                    {queryMutation.data.data.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-4">
            <TabsContent value="build" className="mt-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Query Request</Label>
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(buildQueryRequest(), null, 2)}
                  </pre>
                </div>
                
                {compileMutation.data?.compiled_sql && (
                  <div>
                    <Label className="text-sm font-medium">Compiled SQL</Label>
                    <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
                      {compileMutation.data.compiled_sql}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="results" className="mt-0">
              <ResultsTable
                result={queryMutation.data || null}
                isLoading={queryMutation.isPending}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}

export default MCPQueryBuilder
