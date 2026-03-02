/**
 * SelectBuilder — column checkbox picker with rename & type annotations.
 *
 * Lets users pick which warehouse columns to include in the SELECT clause,
 * add aliases, toggle tests, and mark descriptions.
 */

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, ArrowUpDown, Plus, Trash2, MousePointerClick } from 'lucide-react'
import type { VisualColumnConfig, WarehouseColumn } from '../../types/visualModel'
import { ExpressionBuilder } from './ExpressionBuilder'

export interface SelectBuilderProps {
  availableColumns: WarehouseColumn[]
  selectedColumns: VisualColumnConfig[]
  onChange: (columns: VisualColumnConfig[]) => void
}

export function SelectBuilder({
  availableColumns,
  selectedColumns,
  onChange,
}: SelectBuilderProps) {
  const [search, setSearch] = useState('')
  const [showExpressionBuilder, setShowExpressionBuilder] = useState(false)

  const selectedNames = new Set(selectedColumns.map((c) => c.name))

  const filtered = availableColumns.filter(
    (col) =>
      col.name.toLowerCase().includes(search.toLowerCase()) ||
      col.type.toLowerCase().includes(search.toLowerCase())
  )

  const toggleColumn = (wCol: WarehouseColumn) => {
    if (selectedNames.has(wCol.name)) {
      onChange(selectedColumns.filter((c) => c.name !== wCol.name))
    } else {
      onChange([
        ...selectedColumns,
        {
          name: wCol.name,
          data_type: wCol.type,
          description: '',
          tests: [],
        },
      ])
    }
  }

  const updateColumn = (index: number, partial: Partial<VisualColumnConfig>) => {
    const next = [...selectedColumns]
    next[index] = { ...next[index], ...partial }
    onChange(next)
  }

  const removeColumn = (index: number) => {
    onChange(selectedColumns.filter((_, i) => i !== index))
  }

  const selectAll = () => {
    const newCols = availableColumns
      .filter((wc) => !selectedNames.has(wc.name))
      .map((wc) => ({
        name: wc.name,
        data_type: wc.type,
        description: '',
        tests: [],
      }))
    onChange([...selectedColumns, ...newCols])
  }

  const addExpression = (expr: VisualColumnConfig) => {
    onChange([...selectedColumns, expr])
    setShowExpressionBuilder(false)
  }

  return (
    <div className="space-y-3">
      {/* Search + Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowExpressionBuilder(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Expression
        </Button>
      </div>

      {/* Available columns picker */}
      <div className="border rounded-md max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm p-6 space-y-2">
            {availableColumns.length === 0 ? (
              <>
                <MousePointerClick className="h-8 w-8 mx-auto opacity-40" />
                <p className="font-medium">No source table selected</p>
                <p className="text-xs">
                  Click a table in the <strong>Schema Explorer</strong> panel on
                  the right to load its columns here.
                </p>
              </>
            ) : (
              <p>No matching columns</p>
            )}
          </div>
        ) : (
          filtered.map((col) => (
            <label
              key={col.name}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer text-sm group"
            >
              <Checkbox
                checked={selectedNames.has(col.name)}
                onCheckedChange={() => toggleColumn(col)}
              />
              <span className="font-mono flex-1 truncate">{col.name}</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {col.type}
              </Badge>
            </label>
          ))
        )}
      </div>

      {/* Selected columns with rename */}
      {selectedColumns.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ArrowUpDown className="h-3 w-3" />
            Selected Columns ({selectedColumns.length})
          </div>
          <div className="border rounded-md divide-y">
            {selectedColumns.map((col, idx) => (
              <div key={`${col.name}-${idx}`} className="flex items-center gap-2 px-3 py-1.5">
                <span className="font-mono text-sm truncate w-32">{col.name}</span>
                <Input
                  value={col.alias || ''}
                  onChange={(e) => updateColumn(idx, { alias: e.target.value || undefined })}
                  placeholder="alias"
                  className="h-7 text-xs font-mono flex-1"
                />
                <Input
                  value={col.description || ''}
                  onChange={(e) => updateColumn(idx, { description: e.target.value })}
                  placeholder="description"
                  className="h-7 text-xs flex-1"
                />
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {col.data_type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-destructive"
                  onClick={() => removeColumn(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expression Builder Dialog */}
      {showExpressionBuilder && (
        <ExpressionBuilder
          columns={selectedColumns}
          onSave={addExpression}
          onCancel={() => setShowExpressionBuilder(false)}
        />
      )}
    </div>
  )
}
