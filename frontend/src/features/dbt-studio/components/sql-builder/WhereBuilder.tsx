/**
 * WhereBuilder — visual SQL WHERE clause builder.
 *
 * Provides a guided UI for constructing filter conditions,
 * with a freeform SQL fallback for power users.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Filter } from 'lucide-react'
import type { VisualColumnConfig } from '../../types/visualModel'

export interface WhereBuilderProps {
  value: string
  onChange: (clause: string) => void
  columns: VisualColumnConfig[]
}

interface FilterCondition {
  column: string
  operator: string
  value: string
  conjunction: 'AND' | 'OR'
}

const OPERATORS = [
  { value: '=', label: '= (equal)' },
  { value: '!=', label: '!= (not equal)' },
  { value: '>', label: '> (greater than)' },
  { value: '>=', label: '>= (greater or equal)' },
  { value: '<', label: '< (less than)' },
  { value: '<=', label: '<= (less or equal)' },
  { value: 'LIKE', label: 'LIKE' },
  { value: 'NOT LIKE', label: 'NOT LIKE' },
  { value: 'IN', label: 'IN (...)' },
  { value: 'NOT IN', label: 'NOT IN (...)' },
  { value: 'IS NULL', label: 'IS NULL' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL' },
  { value: 'BETWEEN', label: 'BETWEEN' },
]

const NULLARY_OPS = new Set(['IS NULL', 'IS NOT NULL'])

function conditionsToSql(conditions: FilterCondition[]): string {
  return conditions
    .map((c, i) => {
      const prefix = i === 0 ? '' : `${c.conjunction} `
      if (NULLARY_OPS.has(c.operator)) {
        return `${prefix}${c.column} ${c.operator}`
      }
      const needsQuotes = !c.value.startsWith('(') && isNaN(Number(c.value))
      const val = needsQuotes ? `'${c.value}'` : c.value
      return `${prefix}${c.column} ${c.operator} ${val}`
    })
    .join('\n  ')
}

function sqlToConditions(sql: string): FilterCondition[] {
  // Basic parser — best-effort; user can always switch to raw mode
  if (!sql.trim()) return []
  const lines = sql.split('\n').map((l) => l.trim()).filter(Boolean)
  return lines.map((line, i) => {
    let conjunction: 'AND' | 'OR' = 'AND'
    let rest = line
    if (i > 0) {
      if (rest.startsWith('OR ')) {
        conjunction = 'OR'
        rest = rest.slice(3).trim()
      } else if (rest.startsWith('AND ')) {
        conjunction = 'AND'
        rest = rest.slice(4).trim()
      }
    }
    // Try to parse column OPERATOR value
    for (const op of OPERATORS) {
      const idx = rest.indexOf(` ${op.value}`)
      if (idx > 0) {
        const column = rest.slice(0, idx).trim()
        const value = rest.slice(idx + op.value.length + 1).trim().replace(/^'|'$/g, '')
        return { column, operator: op.value, value, conjunction }
      }
    }
    return { column: rest, operator: '=', value: '', conjunction }
  })
}

export function WhereBuilder({ value, onChange, columns }: WhereBuilderProps) {
  const [mode, setMode] = useState<'visual' | 'raw'>('visual')
  const [conditions, setConditions] = useState<FilterCondition[]>(() =>
    sqlToConditions(value)
  )

  const syncToParent = (conds: FilterCondition[]) => {
    setConditions(conds)
    onChange(conditionsToSql(conds))
  }

  const addCondition = () => {
    syncToParent([
      ...conditions,
      { column: '', operator: '=', value: '', conjunction: 'AND' },
    ])
  }

  const updateCondition = (idx: number, partial: Partial<FilterCondition>) => {
    const next = [...conditions]
    next[idx] = { ...next[idx], ...partial }
    syncToParent(next)
  }

  const removeCondition = (idx: number) => {
    syncToParent(conditions.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'visual' | 'raw')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filter Conditions
          </div>
          <TabsList className="h-7">
            <TabsTrigger value="visual" className="text-[10px] h-5 px-2">
              Visual
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-[10px] h-5 px-2">
              Raw SQL
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="mt-2 space-y-2">
          {conditions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4 border border-dashed rounded">
              No filter conditions. All rows will be included.
            </p>
          ) : (
            conditions.map((cond, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[60px_1fr_100px_1fr_32px] gap-1.5 items-end"
              >
                {/* Conjunction */}
                <div>
                  {idx === 0 ? (
                    <Badge variant="outline" className="text-[10px]">
                      WHERE
                    </Badge>
                  ) : (
                    <Select
                      value={cond.conjunction}
                      onValueChange={(v) =>
                        updateCondition(idx, { conjunction: v as 'AND' | 'OR' })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND" className="text-xs">AND</SelectItem>
                        <SelectItem value="OR" className="text-xs">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Column */}
                {columns.length > 0 ? (
                  <Select
                    value={cond.column}
                    onValueChange={(v) => updateCondition(idx, { column: v })}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem
                          key={c.name}
                          value={c.alias || c.name}
                          className="text-xs font-mono"
                        >
                          {c.alias || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={cond.column}
                    onChange={(e) => updateCondition(idx, { column: e.target.value })}
                    placeholder="column_name"
                    className="h-8 text-xs font-mono"
                  />
                )}

                {/* Operator */}
                <Select
                  value={cond.operator}
                  onValueChange={(v) => updateCondition(idx, { operator: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value} className="text-xs">
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value */}
                {NULLARY_OPS.has(cond.operator) ? (
                  <div />
                ) : (
                  <Input
                    value={cond.value}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    placeholder="value"
                    className="h-8 text-xs font-mono"
                  />
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeCondition(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}

          <Button variant="outline" size="sm" onClick={addCondition} className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Condition
          </Button>
        </TabsContent>

        <TabsContent value="raw" className="mt-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Raw SQL WHERE clause (without the WHERE keyword)
            </Label>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="status = 'active' AND created_at > '2024-01-01'"
              rows={4}
              className="font-mono text-xs"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
