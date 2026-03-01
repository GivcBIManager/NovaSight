/**
 * MeasureEditor — form for adding/editing dbt semantic layer measures.
 *
 * Each measure has name, agg (sum/count/avg/min/max/count_distinct),
 * expr, and optional filter.
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Calculator } from 'lucide-react'

export interface Measure {
  name: string
  agg: string
  expr?: string
  description?: string
  create_metric?: boolean
  filter?: string
}

export interface MeasureEditorProps {
  measures: Measure[]
  onChange: (measures: Measure[]) => void
  availableColumns?: string[]
}

const AGG_OPTIONS = [
  { value: 'sum', label: 'SUM' },
  { value: 'count', label: 'COUNT' },
  { value: 'count_distinct', label: 'COUNT DISTINCT' },
  { value: 'avg', label: 'AVG' },
  { value: 'min', label: 'MIN' },
  { value: 'max', label: 'MAX' },
  { value: 'median', label: 'MEDIAN' },
]

function emptyMeasure(): Measure {
  return { name: '', agg: 'sum', expr: '', description: '' }
}

export function MeasureEditor({
  measures,
  onChange,
  availableColumns = [],
}: MeasureEditorProps) {
  const add = () => onChange([...measures, emptyMeasure()])

  const update = (idx: number, partial: Partial<Measure>) => {
    const next = [...measures]
    next[idx] = { ...next[idx], ...partial }
    onChange(next)
  }

  const remove = (idx: number) => onChange(measures.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <Calculator className="h-3.5 w-3.5" />
          Measures ({measures.length})
        </Label>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={add}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {measures.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4 border border-dashed rounded">
          No measures defined. Add one to describe numeric aggregations.
        </p>
      ) : (
        measures.map((m, idx) => (
          <Card key={idx} className="border-l-4 border-l-emerald-400">
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Measure #{idx + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => remove(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={m.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    placeholder="total_revenue"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Aggregation *</Label>
                  <Select value={m.agg} onValueChange={(v) => update(idx, { agg: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGG_OPTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value} className="text-xs">
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Expression</Label>
                {availableColumns.length > 0 ? (
                  <Select
                    value={m.expr || ''}
                    onValueChange={(v) => update(idx, { expr: v })}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="Select column or type expression" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={m.expr || ''}
                    onChange={(e) => update(idx, { expr: e.target.value })}
                    placeholder="amount * quantity"
                    className="h-8 text-xs font-mono"
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Filter (optional WHERE clause)</Label>
                <Input
                  value={m.filter || ''}
                  onChange={(e) => update(idx, { filter: e.target.value })}
                  placeholder="status = 'completed'"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={m.description || ''}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  placeholder="Total revenue from completed orders"
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
