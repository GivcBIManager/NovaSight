# 062 - Visual Query Builder Enhancements

## Metadata

```yaml
prompt_id: "062"
phase: "O2"
agent: "@frontend"
model: "sonnet 4.5"
priority: P0
estimated_effort: "4 days"
dependencies: ["061"]
```

## Objective

Enhance the VisualQueryBuilder with JOIN builder, calculated columns, aggregation, and SQL diff preview.

## Task Description

Add sub-builders for JOINs, calculated columns, and GROUP BY, plus a diff viewer for edits.

## Requirements

### 1. JOIN Builder

```tsx
// frontend/src/features/dbt-studio/components/sql-builder/JoinBuilder.tsx
/**
 * JoinBuilder — visual builder for model joins.
 * 
 * Allows selecting ref() models, join type, and ON clause columns.
 */

import { useState } from 'react'
import { Plus, Trash2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { VisualJoinConfig } from '../../types/visualModel'

interface JoinBuilderProps {
  joins: VisualJoinConfig[]
  availableModels: string[]
  baseColumns: string[]
  onChange: (joins: VisualJoinConfig[]) => void
}

const JOIN_TYPES = [
  { value: 'inner', label: 'INNER JOIN' },
  { value: 'left', label: 'LEFT JOIN' },
  { value: 'right', label: 'RIGHT JOIN' },
  { value: 'full', label: 'FULL OUTER JOIN' },
] as const

export function JoinBuilder({
  joins,
  availableModels,
  baseColumns,
  onChange,
}: JoinBuilderProps) {
  const addJoin = () => {
    onChange([
      ...joins,
      {
        model: '',
        alias: `j${joins.length + 1}`,
        join_type: 'left',
        on_left: '',
        on_right: '',
      },
    ])
  }

  const updateJoin = (index: number, updates: Partial<VisualJoinConfig>) => {
    const newJoins = [...joins]
    newJoins[index] = { ...newJoins[index], ...updates }
    onChange(newJoins)
  }

  const removeJoin = (index: number) => {
    onChange(joins.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Joins ({joins.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {joins.map((join, index) => (
          <div
            key={index}
            className="border rounded-lg p-3 space-y-2 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {join.alias || `Join ${index + 1}`}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeJoin(index)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Join Type</Label>
                <Select
                  value={join.join_type}
                  onValueChange={(v) =>
                    updateJoin(index, { join_type: v as VisualJoinConfig['join_type'] })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOIN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Model</Label>
                <Select
                  value={join.model}
                  onValueChange={(v) => updateJoin(index, { model: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs font-mono">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Left Column (base)</Label>
                <Select
                  value={join.on_left}
                  onValueChange={(v) => updateJoin(index, { on_left: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {baseColumns.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs font-mono">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Right Column ({join.model || '...'})</Label>
                <Select
                  value={join.on_right}
                  onValueChange={(v) => updateJoin(index, { on_right: v })}
                  disabled={!join.model}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* TODO: fetch columns for selected model */}
                    <SelectItem value="id" className="text-xs font-mono">
                      id
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addJoin}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Join
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 2. Calculated Column Builder

```tsx
// frontend/src/features/dbt-studio/components/sql-builder/CalculatedColumnBuilder.tsx
/**
 * CalculatedColumnBuilder — define computed columns with expressions.
 */

import { useState } from 'react'
import { Plus, Trash2, Calculator, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export interface CalculatedColumn {
  name: string
  expression: string
  data_type: string
  description?: string
}

interface CalculatedColumnBuilderProps {
  columns: CalculatedColumn[]
  availableColumns: string[]
  onChange: (columns: CalculatedColumn[]) => void
}

const DATA_TYPES = ['String', 'Int64', 'Float64', 'Date', 'DateTime', 'Boolean']

const EXPRESSION_TEMPLATES = [
  { label: 'Concatenate', expr: "concat(col1, ' ', col2)" },
  { label: 'Date Extract', expr: 'toYear(date_column)' },
  { label: 'Conditional', expr: "if(condition, 'yes', 'no')" },
  { label: 'Coalesce', expr: "coalesce(col1, 'default')" },
  { label: 'Math', expr: 'col1 * col2 / 100' },
]

export function CalculatedColumnBuilder({
  columns,
  availableColumns,
  onChange,
}: CalculatedColumnBuilderProps) {
  const addColumn = () => {
    onChange([
      ...columns,
      { name: '', expression: '', data_type: 'String' },
    ])
  }

  const updateColumn = (index: number, updates: Partial<CalculatedColumn>) => {
    const newCols = [...columns]
    newCols[index] = { ...newCols[index], ...updates }
    onChange(newCols)
  }

  const removeColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index))
  }

  const applyTemplate = (index: number, expr: string) => {
    updateColumn(index, { expression: expr })
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Calculated Columns ({columns.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {columns.map((col, index) => (
          <div
            key={index}
            className="border rounded-lg p-3 space-y-2 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <Input
                value={col.name}
                onChange={(e) => updateColumn(index, { name: e.target.value })}
                placeholder="column_name"
                className="h-7 text-xs font-mono w-40"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeColumn(index)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Expression</Label>
                <div className="flex gap-1">
                  {EXPRESSION_TEMPLATES.slice(0, 3).map((t) => (
                    <Badge
                      key={t.label}
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-muted"
                      onClick={() => applyTemplate(index, t.expr)}
                    >
                      {t.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Textarea
                value={col.expression}
                onChange={(e) => updateColumn(index, { expression: e.target.value })}
                placeholder="e.g. concat(first_name, ' ', last_name)"
                rows={2}
                className="text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Data Type</Label>
                <Select
                  value={col.data_type}
                  onValueChange={(v) => updateColumn(index, { data_type: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  value={col.description || ''}
                  onChange={(e) => updateColumn(index, { description: e.target.value })}
                  placeholder="Optional..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addColumn}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Calculated Column
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 3. Aggregation Builder

```tsx
// frontend/src/features/dbt-studio/components/sql-builder/AggregationBuilder.tsx
/**
 * AggregationBuilder — GROUP BY and aggregate functions.
 */

import { useState } from 'react'
import { BarChart3, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export interface AggregateColumn {
  source_column: string
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct'
  alias: string
}

export interface AggregationConfig {
  enabled: boolean
  group_by: string[]
  aggregates: AggregateColumn[]
}

interface AggregationBuilderProps {
  config: AggregationConfig
  availableColumns: string[]
  onChange: (config: AggregationConfig) => void
}

const AGG_FUNCTIONS = [
  { value: 'sum', label: 'SUM' },
  { value: 'avg', label: 'AVG' },
  { value: 'count', label: 'COUNT' },
  { value: 'min', label: 'MIN' },
  { value: 'max', label: 'MAX' },
  { value: 'count_distinct', label: 'COUNT DISTINCT' },
]

export function AggregationBuilder({
  config,
  availableColumns,
  onChange,
}: AggregationBuilderProps) {
  const toggleEnabled = () => {
    onChange({ ...config, enabled: !config.enabled })
  }

  const toggleGroupBy = (col: string) => {
    const newGroupBy = config.group_by.includes(col)
      ? config.group_by.filter((c) => c !== col)
      : [...config.group_by, col]
    onChange({ ...config, group_by: newGroupBy })
  }

  const addAggregate = () => {
    onChange({
      ...config,
      aggregates: [
        ...config.aggregates,
        { source_column: '', function: 'sum', alias: '' },
      ],
    })
  }

  const updateAggregate = (index: number, updates: Partial<AggregateColumn>) => {
    const newAggs = [...config.aggregates]
    newAggs[index] = { ...newAggs[index], ...updates }
    onChange({ ...config, aggregates: newAggs })
  }

  const removeAggregate = (index: number) => {
    onChange({
      ...config,
      aggregates: config.aggregates.filter((_, i) => i !== index),
    })
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Aggregation
          </CardTitle>
          <Switch checked={config.enabled} onCheckedChange={toggleEnabled} />
        </div>
      </CardHeader>
      {config.enabled && (
        <CardContent className="space-y-4">
          {/* Group By */}
          <div>
            <Label className="text-xs mb-2 block">GROUP BY Columns</Label>
            <div className="flex flex-wrap gap-1">
              {availableColumns.map((col) => (
                <Badge
                  key={col}
                  variant={config.group_by.includes(col) ? 'default' : 'outline'}
                  className="text-xs cursor-pointer"
                  onClick={() => toggleGroupBy(col)}
                >
                  {col}
                </Badge>
              ))}
            </div>
          </div>

          {/* Aggregates */}
          <div>
            <Label className="text-xs mb-2 block">Aggregate Functions</Label>
            <div className="space-y-2">
              {config.aggregates.map((agg, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={agg.function}
                    onValueChange={(v) =>
                      updateAggregate(index, { function: v as AggregateColumn['function'] })
                    }
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGG_FUNCTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value} className="text-xs">
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={agg.source_column}
                    onValueChange={(v) => updateAggregate(index, { source_column: v })}
                  >
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue placeholder="Column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs font-mono">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeAggregate(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addAggregate}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
```

### 4. SQL Diff Viewer

```tsx
// frontend/src/features/dbt-studio/components/shared/SqlDiffViewer.tsx
/**
 * SqlDiffViewer — side-by-side diff for model SQL changes.
 */

import { useMemo } from 'react'
import { diffLines, Change } from 'diff'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GitCompare } from 'lucide-react'

interface SqlDiffViewerProps {
  oldSql: string
  newSql: string
  oldLabel?: string
  newLabel?: string
}

export function SqlDiffViewer({
  oldSql,
  newSql,
  oldLabel = 'Current',
  newLabel = 'Preview',
}: SqlDiffViewerProps) {
  const changes = useMemo(() => diffLines(oldSql, newSql), [oldSql, newSql])
  
  const stats = useMemo(() => {
    let added = 0
    let removed = 0
    for (const c of changes) {
      if (c.added) added += c.count || 0
      if (c.removed) removed += c.count || 0
    }
    return { added, removed }
  }, [changes])
  
  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          SQL Diff
          <Badge variant="outline" className="text-[10px] text-green-600">
            +{stats.added}
          </Badge>
          <Badge variant="outline" className="text-[10px] text-red-600">
            -{stats.removed}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <pre className="text-xs font-mono p-3">
            {changes.map((change, i) => (
              <span
                key={i}
                className={
                  change.added
                    ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300'
                    : change.removed
                    ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                    : ''
                }
              >
                {change.value}
              </span>
            ))}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

### 5. Wire into VisualQueryBuilder

Update `VisualQueryBuilder.tsx` to include these sub-builders as additional tabs or collapsible sections.

## Acceptance Criteria

- [ ] JoinBuilder allows adding/removing joins with type + ON clause
- [ ] CalculatedColumnBuilder supports expressions with templates
- [ ] AggregationBuilder has toggle, GROUP BY selection, aggregate functions
- [ ] SqlDiffViewer shows line-by-line diff with +/- highlighting
- [ ] No TypeScript errors

## Testing

1. Open VisualQueryBuilder
2. Add a JOIN → verify ref() model picker + column pickers work
3. Add calculated column → apply template → verify expression
4. Enable aggregation → select GROUP BY cols + aggregates
5. Preview SQL → verify diff viewer shows changes
