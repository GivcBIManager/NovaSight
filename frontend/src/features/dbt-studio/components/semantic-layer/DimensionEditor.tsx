/**
 * DimensionEditor — form for adding/editing dbt semantic layer dimensions.
 *
 * Each dimension has name, type (categorical/time), expr, and description.
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Layers } from 'lucide-react'

export interface Dimension {
  name: string
  type: 'categorical' | 'time'
  expr?: string
  description?: string
  type_params?: {
    time_granularity?: string
  }
}

export interface DimensionEditorProps {
  dimensions: Dimension[]
  onChange: (dimensions: Dimension[]) => void
  availableColumns?: string[]
}

const TIME_GRANULARITIES = ['day', 'week', 'month', 'quarter', 'year']

function emptyDimension(): Dimension {
  return { name: '', type: 'categorical', expr: '', description: '' }
}

export function DimensionEditor({
  dimensions,
  onChange,
  availableColumns = [],
}: DimensionEditorProps) {
  const add = () => onChange([...dimensions, emptyDimension()])

  const update = (idx: number, partial: Partial<Dimension>) => {
    const next = [...dimensions]
    next[idx] = { ...next[idx], ...partial }
    onChange(next)
  }

  const remove = (idx: number) => onChange(dimensions.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          Dimensions ({dimensions.length})
        </Label>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={add}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {dimensions.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4 border border-dashed rounded">
          No dimensions defined. Add one to describe how data can be sliced.
        </p>
      ) : (
        dimensions.map((dim, idx) => (
          <Card key={idx} className="border-l-4 border-l-indigo-400">
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Dimension #{idx + 1}</span>
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
                  {availableColumns.length > 0 ? (
                    <Select value={dim.name} onValueChange={(v) => update(idx, { name: v, expr: v })}>
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={dim.name}
                      onChange={(e) => update(idx, { name: e.target.value })}
                      placeholder="customer_region"
                      className="h-8 text-xs font-mono"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={dim.type} onValueChange={(v) => update(idx, { type: v as Dimension['type'] })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="categorical" className="text-xs">Categorical</SelectItem>
                      <SelectItem value="time" className="text-xs">Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {dim.type === 'time' && (
                <div className="space-y-1">
                  <Label className="text-xs">Time Granularity</Label>
                  <Select
                    value={dim.type_params?.time_granularity || 'day'}
                    onValueChange={(v) =>
                      update(idx, { type_params: { ...dim.type_params, time_granularity: v } })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_GRANULARITIES.map((g) => (
                        <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Expression</Label>
                <Input
                  value={dim.expr || ''}
                  onChange={(e) => update(idx, { expr: e.target.value })}
                  placeholder="column_name or SQL expression"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={dim.description || ''}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  placeholder="The region where the customer is located"
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
