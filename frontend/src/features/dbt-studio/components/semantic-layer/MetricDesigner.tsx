/**
 * MetricDesigner — form for defining dbt metrics.
 *
 * Supports simple (single-measure), derived, and ratio metric types
 * with filters, time spine, and description fields.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Save, TrendingUp, Plus, Trash2 } from 'lucide-react'

export interface MetricFilter {
  dimension: string
  operator: string
  value: string
}

export interface MetricDefinition {
  name: string
  label?: string
  type: 'simple' | 'derived' | 'ratio' | 'cumulative'
  description?: string
  measure?: string
  numerator?: string
  denominator?: string
  expr?: string
  filter?: MetricFilter[]
  time_grains?: string[]
}

export interface MetricDesignerProps {
  metric?: MetricDefinition
  availableMeasures?: string[]
  availableDimensions?: string[]
  availableMetrics?: string[]
  onSave: (metric: MetricDefinition) => void
  isSaving?: boolean
}

const METRIC_TYPES = [
  { value: 'simple', label: 'Simple', description: 'Single measure reference' },
  { value: 'derived', label: 'Derived', description: 'Expression over other metrics' },
  { value: 'ratio', label: 'Ratio', description: 'Numerator / Denominator' },
  { value: 'cumulative', label: 'Cumulative', description: 'Running total' },
]

const TIME_GRAINS = ['day', 'week', 'month', 'quarter', 'year']

export function MetricDesigner({
  metric: initialMetric,
  availableMeasures = [],
  availableDimensions = [],
  availableMetrics = [],
  onSave,
  isSaving = false,
}: MetricDesignerProps) {
  const [metric, setMetric] = useState<MetricDefinition>(
    initialMetric || {
      name: '',
      type: 'simple',
      description: '',
      measure: '',
      filter: [],
      time_grains: ['day', 'month'],
    }
  )

  const update = (partial: Partial<MetricDefinition>) =>
    setMetric((prev) => ({ ...prev, ...partial }))

  const addFilter = () =>
    update({
      filter: [...(metric.filter || []), { dimension: '', operator: '=', value: '' }],
    })

  const updateFilter = (idx: number, partial: Partial<MetricFilter>) => {
    const filters = [...(metric.filter || [])]
    filters[idx] = { ...filters[idx], ...partial }
    update({ filter: filters })
  }

  const removeFilter = (idx: number) =>
    update({ filter: (metric.filter || []).filter((_, i) => i !== idx) })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Metric Designer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Metric Name *</Label>
            <Input
              value={metric.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="revenue"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Display Label</Label>
            <Input
              value={metric.label || ''}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="Total Revenue"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Type *</Label>
          <Select value={metric.type} onValueChange={(v) => update({ type: v as MetricDefinition['type'] })}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  <div>
                    <span className="font-medium">{t.label}</span>
                    <span className="text-muted-foreground ml-1">— {t.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type-specific fields */}
        {metric.type === 'simple' && (
          <div className="space-y-1">
            <Label className="text-xs">Measure *</Label>
            {availableMeasures.length > 0 ? (
              <Select value={metric.measure || ''} onValueChange={(v) => update({ measure: v })}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue placeholder="Select measure" />
                </SelectTrigger>
                <SelectContent>
                  {availableMeasures.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs font-mono">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={metric.measure || ''}
                onChange={(e) => update({ measure: e.target.value })}
                placeholder="total_revenue"
                className="h-8 text-xs font-mono"
              />
            )}
          </div>
        )}

        {metric.type === 'ratio' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Numerator Metric</Label>
              <Input
                value={metric.numerator || ''}
                onChange={(e) => update({ numerator: e.target.value })}
                placeholder="completed_orders"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Denominator Metric</Label>
              <Input
                value={metric.denominator || ''}
                onChange={(e) => update({ denominator: e.target.value })}
                placeholder="total_orders"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        )}

        {metric.type === 'derived' && (
          <div className="space-y-1">
            <Label className="text-xs">Expression (reference other metrics)</Label>
            <Input
              value={metric.expr || ''}
              onChange={(e) => update({ expr: e.target.value })}
              placeholder="metric_a / metric_b * 100"
              className="h-8 text-xs font-mono"
            />
            {availableMetrics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {availableMetrics.map((m) => (
                  <Badge
                    key={m}
                    variant="secondary"
                    className="text-[10px] font-mono cursor-pointer"
                    onClick={() => update({ expr: `${metric.expr || ''}${m}` })}
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {metric.type === 'cumulative' && (
          <div className="space-y-1">
            <Label className="text-xs">Measure *</Label>
            <Input
              value={metric.measure || ''}
              onChange={(e) => update({ measure: e.target.value })}
              placeholder="total_revenue"
              className="h-8 text-xs font-mono"
            />
          </div>
        )}

        {/* Time grains */}
        <div className="space-y-1">
          <Label className="text-xs">Time Grains</Label>
          <div className="flex flex-wrap gap-1">
            {TIME_GRAINS.map((g) => {
              const active = (metric.time_grains || []).includes(g)
              return (
                <Badge
                  key={g}
                  variant={active ? 'default' : 'outline'}
                  className="text-[10px] cursor-pointer"
                  onClick={() =>
                    update({
                      time_grains: active
                        ? (metric.time_grains || []).filter((t) => t !== g)
                        : [...(metric.time_grains || []), g],
                    })
                  }
                >
                  {g}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Filters</Label>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addFilter}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {(metric.filter || []).map((f, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_60px_1fr_24px] gap-1 items-end">
              {availableDimensions.length > 0 ? (
                <Select value={f.dimension} onValueChange={(v) => updateFilter(idx, { dimension: v })}>
                  <SelectTrigger className="h-7 text-xs font-mono">
                    <SelectValue placeholder="dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDimensions.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs font-mono">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={f.dimension}
                  onChange={(e) => updateFilter(idx, { dimension: e.target.value })}
                  placeholder="dim"
                  className="h-7 text-xs font-mono"
                />
              )}
              <Input
                value={f.operator}
                onChange={(e) => updateFilter(idx, { operator: e.target.value })}
                placeholder="="
                className="h-7 text-xs"
              />
              <Input
                value={f.value}
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                placeholder="value"
                className="h-7 text-xs font-mono"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFilter(idx)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={metric.description || ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Total revenue from all orders"
            rows={2}
            className="text-xs"
          />
        </div>

        <Button
          onClick={() => onSave(metric)}
          disabled={!metric.name || isSaving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Metric'}
        </Button>
      </CardContent>
    </Card>
  )
}
