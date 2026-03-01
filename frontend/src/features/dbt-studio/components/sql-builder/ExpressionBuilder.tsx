/**
 * ExpressionBuilder — calculated column / expression editor.
 *
 * Allows users to define custom SQL expressions (e.g. CASE WHEN,
 * aggregates, casts) with an alias and optional description.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calculator, X } from 'lucide-react'
import type { VisualColumnConfig } from '../../types/visualModel'

export interface ExpressionBuilderProps {
  /** Already-selected columns — for reference / autocomplete hints. */
  columns: VisualColumnConfig[]
  onSave: (column: VisualColumnConfig) => void
  onCancel: () => void
}

const SNIPPETS = [
  { label: 'CASE WHEN', sql: "CASE WHEN condition THEN 'a' ELSE 'b' END" },
  { label: 'COALESCE', sql: 'COALESCE(col, default_val)' },
  { label: 'CAST', sql: 'CAST(col AS String)' },
  { label: 'COUNT', sql: 'COUNT(*)' },
  { label: 'SUM', sql: 'SUM(col)' },
  { label: 'AVG', sql: 'AVG(col)' },
  { label: 'DATE_TRUNC', sql: "DATE_TRUNC('month', date_col)" },
  { label: 'CONCAT', sql: "CONCAT(col1, ' ', col2)" },
  { label: 'IF', sql: "IF(condition, 'yes', 'no')" },
]

export function ExpressionBuilder({
  columns,
  onSave,
  onCancel,
}: ExpressionBuilderProps) {
  const [alias, setAlias] = useState('')
  const [expression, setExpression] = useState('')
  const [dataType, setDataType] = useState('String')
  const [description, setDescription] = useState('')

  const insertSnippet = (sql: string) => {
    setExpression((prev) => (prev ? `${prev}\n${sql}` : sql))
  }

  const handleSave = () => {
    if (!alias || !expression) return
    onSave({
      name: alias,
      alias,
      expression,
      data_type: dataType,
      description,
      tests: [],
    })
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Calculator className="h-4 w-4" />
            Expression Builder
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Column Alias *</Label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="total_amount"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Type</Label>
            <Input
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              placeholder="Float64"
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">SQL Expression *</Label>
          <Textarea
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="SUM(amount * quantity)"
            rows={3}
            className="font-mono text-xs"
          />
        </div>

        {/* Quick snippets */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quick Insert</Label>
          <div className="flex flex-wrap gap-1">
            {SNIPPETS.map((s) => (
              <Badge
                key={s.label}
                variant="outline"
                className="text-[10px] cursor-pointer hover:bg-accent"
                onClick={() => insertSnippet(s.sql)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Available columns reference */}
        {columns.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Available Columns</Label>
            <div className="flex flex-wrap gap-1">
              {columns.map((c) => (
                <Badge
                  key={c.name}
                  variant="secondary"
                  className="text-[10px] font-mono cursor-pointer"
                  onClick={() =>
                    setExpression((prev) =>
                      prev ? `${prev}${c.alias || c.name}` : c.alias || c.name
                    )
                  }
                >
                  {c.alias || c.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Total order amount including tax"
            className="h-8 text-xs"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!alias || !expression}
            className="flex-1"
          >
            Add Column
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
