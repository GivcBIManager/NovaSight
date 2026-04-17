# 064 - Semantic Layer & Metrics

## Metadata

```yaml
prompt_id: "064"
phase: "O4"
agent: "@frontend"
model: "sonnet 4.5"
priority: P1
estimated_effort: "4 days"
dependencies: ["063"]
```

## Objective

Implement metric definition UI, metric explorer, metric lineage, and MCP endpoint for dbt semantic layer.

## Task Description

Build a full metric authoring and exploration experience within dbt Studio.

## Requirements

### 1. Metric Types

```typescript
// frontend/src/features/dbt-studio/types/metrics.ts
/**
 * dbt Semantic Layer metric types.
 */

export type MetricType = 'simple' | 'derived' | 'cumulative' | 'ratio'

export type TimeGrain = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface MetricFilter {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value: string | number | string[] | number[]
}

export interface MetricDefinition {
  name: string
  label: string
  description?: string
  type: MetricType
  
  // For simple metrics
  measure?: string
  
  // For derived metrics
  expression?: string
  metrics?: string[]
  
  // For cumulative
  window?: { count: number; grain: TimeGrain }
  
  // For ratio
  numerator?: string
  denominator?: string
  
  // Common
  time_grains: TimeGrain[]
  dimensions: string[]
  filters?: MetricFilter[]
  
  // Metadata
  model_name: string
  tags?: string[]
  owner?: string
  created_at?: string
  updated_at?: string
}

export interface MetricQueryRequest {
  metrics: string[]
  group_by?: string[]
  time_grain?: TimeGrain
  filters?: MetricFilter[]
  limit?: number
}

export interface MetricQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  query_time_ms: number
  compiled_sql?: string
}
```

### 2. Metric Definition Form

```tsx
// frontend/src/features/dbt-studio/components/metrics/MetricDefinitionForm.tsx
/**
 * MetricDefinitionForm — create/edit metric definitions.
 */

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Save, X, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { MetricDefinition, MetricType, TimeGrain } from '../../types/metrics'

const metricSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'lowercase_snake_case'),
  label: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['simple', 'derived', 'cumulative', 'ratio']),
  measure: z.string().optional(),
  expression: z.string().optional(),
  numerator: z.string().optional(),
  denominator: z.string().optional(),
  time_grains: z.array(z.string()).min(1),
  dimensions: z.array(z.string()),
})

const METRIC_TYPES: { value: MetricType; label: string; description: string }[] = [
  { value: 'simple', label: 'Simple', description: 'Single aggregation (SUM, COUNT, AVG)' },
  { value: 'derived', label: 'Derived', description: 'Calculation on other metrics' },
  { value: 'cumulative', label: 'Cumulative', description: 'Running total over time' },
  { value: 'ratio', label: 'Ratio', description: 'Numerator / Denominator' },
]

const TIME_GRAINS: TimeGrain[] = ['day', 'week', 'month', 'quarter', 'year']

interface MetricDefinitionFormProps {
  initialData?: Partial<MetricDefinition>
  modelName: string
  availableMeasures: string[]
  availableDimensions: string[]
  availableMetrics: string[]
  onSave: (metric: MetricDefinition) => void
  onCancel: () => void
}

export function MetricDefinitionForm({
  initialData,
  modelName,
  availableMeasures,
  availableDimensions,
  availableMetrics,
  onSave,
  onCancel,
}: MetricDefinitionFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      name: initialData?.name || '',
      label: initialData?.label || '',
      description: initialData?.description || '',
      type: initialData?.type || 'simple',
      measure: initialData?.measure || '',
      expression: initialData?.expression || '',
      numerator: initialData?.numerator || '',
      denominator: initialData?.denominator || '',
      time_grains: initialData?.time_grains || ['day', 'month'],
      dimensions: initialData?.dimensions || [],
    },
  })

  const metricType = watch('type')

  const onSubmit = (data: z.infer<typeof metricSchema>) => {
    onSave({
      ...data,
      model_name: modelName,
      time_grains: data.time_grains as TimeGrain[],
    } as MetricDefinition)
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">
          {initialData?.name ? 'Edit Metric' : 'New Metric'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name & Label */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                {...register('name')}
                placeholder="total_revenue"
                className="h-8 text-sm font-mono"
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                {...register('label')}
                placeholder="Total Revenue"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              {...register('description')}
              placeholder="Business definition..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              Metric Type
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <ul className="text-xs space-y-1">
                      {METRIC_TYPES.map((t) => (
                        <li key={t.value}>
                          <strong>{t.label}:</strong> {t.description}
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Type-specific fields */}
          {metricType === 'simple' && (
            <div>
              <Label className="text-xs">Measure</Label>
              <Controller
                control={control}
                name="measure"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select measure..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMeasures.map((m) => (
                        <SelectItem key={m} value={m} className="font-mono text-sm">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {metricType === 'derived' && (
            <div>
              <Label className="text-xs">Expression</Label>
              <Input
                {...register('expression')}
                placeholder="metric_a / metric_b * 100"
                className="h-8 text-sm font-mono"
              />
            </div>
          )}

          {metricType === 'ratio' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Numerator</Label>
                <Controller
                  control={control}
                  name="numerator"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Metric..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMetrics.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label className="text-xs">Denominator</Label>
                <Controller
                  control={control}
                  name="denominator"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Metric..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMetrics.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          )}

          {/* Time Grains */}
          <div>
            <Label className="text-xs">Time Grains</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {TIME_GRAINS.map((grain) => (
                <Controller
                  key={grain}
                  control={control}
                  name="time_grains"
                  render={({ field }) => (
                    <Badge
                      variant={field.value.includes(grain) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const newValue = field.value.includes(grain)
                          ? field.value.filter((g: string) => g !== grain)
                          : [...field.value, grain]
                        field.onChange(newValue)
                      }}
                    >
                      {grain}
                    </Badge>
                  )}
                />
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <Label className="text-xs">Dimensions</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {availableDimensions.map((dim) => (
                <Controller
                  key={dim}
                  control={control}
                  name="dimensions"
                  render={({ field }) => (
                    <Badge
                      variant={field.value.includes(dim) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const newValue = field.value.includes(dim)
                          ? field.value.filter((d: string) => d !== dim)
                          : [...field.value, dim]
                        field.onChange(newValue)
                      }}
                    >
                      {dim}
                    </Badge>
                  )}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-1" />
              Save Metric
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 3. Metric Explorer

```tsx
// frontend/src/features/dbt-studio/components/metrics/MetricExplorer.tsx
/**
 * MetricExplorer — query and visualize metrics with dimensions/filters.
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Play, Download, BarChart3, Table as TableIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api'
import type { MetricDefinition, MetricQueryRequest, MetricQueryResult, TimeGrain } from '../../types/metrics'

interface MetricExplorerProps {
  availableMetrics: MetricDefinition[]
}

export function MetricExplorer({ availableMetrics }: MetricExplorerProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [timeGrain, setTimeGrain] = useState<TimeGrain>('month')
  const [result, setResult] = useState<MetricQueryResult | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  const queryMutation = useMutation({
    mutationFn: async (request: MetricQueryRequest) => {
      const { data } = await apiClient.post<MetricQueryResult>(
        '/api/v1/dbt/metrics/query',
        request
      )
      return data
    },
    onSuccess: (data) => {
      setResult(data)
    },
  })

  const toggleMetric = (name: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    )
  }

  const toggleGroupBy = (dim: string) => {
    setGroupBy((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    )
  }

  const runQuery = () => {
    queryMutation.mutate({
      metrics: selectedMetrics,
      group_by: groupBy.length > 0 ? groupBy : undefined,
      time_grain: timeGrain,
      limit: 1000,
    })
  }

  // Get all dimensions from selected metrics
  const availableDimensions = Array.from(
    new Set(
      availableMetrics
        .filter((m) => selectedMetrics.includes(m.name))
        .flatMap((m) => m.dimensions)
    )
  )

  return (
    <div className="space-y-4">
      {/* Query Builder */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metric Explorer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Selection */}
          <div>
            <Label className="text-xs mb-2 block">Select Metrics</Label>
            <div className="flex flex-wrap gap-1">
              {availableMetrics.map((metric) => (
                <Badge
                  key={metric.name}
                  variant={selectedMetrics.includes(metric.name) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleMetric(metric.name)}
                >
                  {metric.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Group By */}
          {availableDimensions.length > 0 && (
            <div>
              <Label className="text-xs mb-2 block">Group By</Label>
              <div className="flex flex-wrap gap-1">
                {availableDimensions.map((dim) => (
                  <Badge
                    key={dim}
                    variant={groupBy.includes(dim) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleGroupBy(dim)}
                  >
                    {dim}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Time Grain */}
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-xs mb-1 block">Time Grain</Label>
              <Select value={timeGrain} onValueChange={(v) => setTimeGrain(v as TimeGrain)}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={runQuery}
              disabled={selectedMetrics.length === 0 || queryMutation.isPending}
            >
              {queryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Run Query
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Results ({result.rows.length} rows, {result.query_time_ms}ms)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'chart')}>
                  <TabsList className="h-7">
                    <TabsTrigger value="table" className="text-xs px-2">
                      <TableIcon className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="chart" className="text-xs px-2">
                      <BarChart3 className="h-3 w-3" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline" size="sm" className="h-7">
                  <Download className="h-3 w-3 mr-1" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {viewMode === 'table' ? (
              <ScrollArea className="h-64">
                <div className="rounded border overflow-hidden m-3">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        {result.columns.map((col) => (
                          <th key={col} className="px-2 py-1 text-left font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 100).map((row, i) => (
                        <tr key={i} className="border-t">
                          {result.columns.map((col) => (
                            <td key={col} className="px-2 py-1 font-mono">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Chart visualization coming soon
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### 4. Metric Lineage (mini)

```tsx
// frontend/src/features/dbt-studio/components/metrics/MetricLineagePreview.tsx
/**
 * MetricLineagePreview — shows metric dependencies at a glance.
 */

import { useModelLineage } from '../../hooks/useModelLineage'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Database, BarChart3 } from 'lucide-react'
import type { MetricDefinition } from '../../types/metrics'

interface MetricLineagePreviewProps {
  metric: MetricDefinition
}

export function MetricLineagePreview({ metric }: MetricLineagePreviewProps) {
  const { data: lineage } = useModelLineage({
    modelName: metric.model_name,
    upstreamDepth: 1,
    downstreamDepth: 0,
    enabled: !!metric.model_name,
  })

  const sources = lineage?.upstream.filter((n) => n.resource_type === 'source') || []

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Sources */}
      {sources.length > 0 && (
        <>
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3 text-muted-foreground" />
            {sources.slice(0, 2).map((s) => (
              <Badge key={s.id} variant="outline" className="text-[10px]">
                {s.name}
              </Badge>
            ))}
            {sources.length > 2 && (
              <Badge variant="outline" className="text-[10px]">
                +{sources.length - 2}
              </Badge>
            )}
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        </>
      )}

      {/* Model */}
      <Badge variant="secondary" className="text-[10px]">
        {metric.model_name}
      </Badge>

      <ArrowRight className="h-3 w-3 text-muted-foreground" />

      {/* Metric */}
      <div className="flex items-center gap-1">
        <BarChart3 className="h-3 w-3 text-blue-500" />
        <span className="font-medium">{metric.label}</span>
      </div>
    </div>
  )
}
```

### 5. Hook: useMetrics

```typescript
// frontend/src/features/dbt-studio/hooks/useMetrics.ts
/**
 * useMetrics — CRUD operations for dbt metrics.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import type { MetricDefinition } from '../types/metrics'

export function useMetrics(modelName?: string) {
  return useQuery<MetricDefinition[]>({
    queryKey: ['dbt-metrics', modelName],
    queryFn: async () => {
      const params = modelName ? { model: modelName } : {}
      const { data } = await apiClient.get('/api/v1/dbt/metrics', { params })
      return data
    },
  })
}

export function useCreateMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (metric: Omit<MetricDefinition, 'created_at' | 'updated_at'>) => {
      const { data } = await apiClient.post('/api/v1/dbt/metrics', metric)
      return data
    },
    onSuccess: (_, variables) => {
      toast.success(`Metric "${variables.label}" created`)
      queryClient.invalidateQueries({ queryKey: ['dbt-metrics'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create metric')
    },
  })
}

export function useUpdateMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, ...updates }: Partial<MetricDefinition> & { name: string }) => {
      const { data } = await apiClient.put(`/api/v1/dbt/metrics/${name}`, updates)
      return data
    },
    onSuccess: () => {
      toast.success('Metric updated')
      queryClient.invalidateQueries({ queryKey: ['dbt-metrics'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update metric')
    },
  })
}

export function useDeleteMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      await apiClient.delete(`/api/v1/dbt/metrics/${name}`)
    },
    onSuccess: () => {
      toast.success('Metric deleted')
      queryClient.invalidateQueries({ queryKey: ['dbt-metrics'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete metric')
    },
  })
}
```

### 6. Exports

```typescript
// frontend/src/features/dbt-studio/components/metrics/index.ts
export { MetricDefinitionForm } from './MetricDefinitionForm'
export { MetricExplorer } from './MetricExplorer'
export { MetricLineagePreview } from './MetricLineagePreview'
```

## Acceptance Criteria

- [ ] MetricDefinitionForm supports all 4 metric types
- [ ] Form validation for lowercase_snake_case names
- [ ] MetricExplorer allows multi-metric selection + dimensions
- [ ] Query results display in table view
- [ ] MetricLineagePreview shows source → model → metric flow
- [ ] useMetrics hook provides CRUD operations
- [ ] No TypeScript errors

## Testing

1. Open model → Metrics tab → Create metric (simple type)
2. Verify label, measure, time grains, dimensions saved
3. Open Metric Explorer → select metrics → Run Query → see results
4. Create derived metric referencing two simple metrics
5. View metric lineage preview
