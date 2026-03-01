/**
 * GroupByBuilder — drag-to-select GROUP BY columns.
 *
 * Shows available columns from the SELECT list and lets users
 * toggle which ones to group by. Automatically suggests grouping
 * non-aggregate columns.
 */

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LayoutGrid, Wand2 } from 'lucide-react'
import type { VisualColumnConfig } from '../../types/visualModel'

export interface GroupByBuilderProps {
  columns: VisualColumnConfig[]
  selectedColumns: string[]
  onChange: (groupBy: string[]) => void
}

const AGGREGATE_PATTERN = /\b(sum|count|avg|min|max|any|argmin|argmax|uniq|median)\s*\(/i

export function GroupByBuilder({
  columns,
  selectedColumns,
  onChange,
}: GroupByBuilderProps) {
  const selected = new Set(selectedColumns)

  const toggle = (colName: string) => {
    if (selected.has(colName)) {
      onChange(selectedColumns.filter((c) => c !== colName))
    } else {
      onChange([...selectedColumns, colName])
    }
  }

  const isAggregate = (col: VisualColumnConfig) => {
    if (col.expression && AGGREGATE_PATTERN.test(col.expression)) return true
    return false
  }

  const autoDetect = () => {
    // Group by all non-aggregate columns
    const groupCols = columns
      .filter((c) => !isAggregate(c))
      .map((c) => c.alias || c.name)
    onChange(groupCols)
  }

  const displayName = (col: VisualColumnConfig) => col.alias || col.name

  if (columns.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-md">
        <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>Add columns in the SELECT tab first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <LayoutGrid className="h-3.5 w-3.5" />
          Select columns to group by
        </span>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={autoDetect}>
          <Wand2 className="h-3 w-3 mr-1" />
          Auto-detect
        </Button>
      </div>

      <div className="border rounded-md divide-y">
        {columns.map((col) => {
          const name = displayName(col)
          const agg = isAggregate(col)
          return (
            <label
              key={name}
              className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.has(name)}
                onCheckedChange={() => toggle(name)}
              />
              <span className="font-mono flex-1 truncate">{name}</span>
              {agg && (
                <Badge variant="secondary" className="text-[10px]">
                  aggregate
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] font-mono">
                {col.data_type}
              </Badge>
            </label>
          )
        })}
      </div>

      {selectedColumns.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1 self-center">GROUP BY:</span>
          {selectedColumns.map((colName) => (
            <Badge
              key={colName}
              variant="default"
              className="font-mono text-xs cursor-pointer"
              onClick={() => toggle(colName)}
            >
              {colName} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
