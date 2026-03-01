/**
 * EntityEditor — form for defining the primary entity of a semantic model.
 *
 * An entity connects a semantic model to a specific concept (e.g., customer,
 * order) with a join key.
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Key } from 'lucide-react'

export interface Entity {
  name: string
  type: 'primary' | 'foreign' | 'unique' | 'natural'
  expr?: string
  description?: string
}

export interface EntityEditorProps {
  entities: Entity[]
  onChange: (entities: Entity[]) => void
  availableColumns?: string[]
}

const ENTITY_TYPES = [
  { value: 'primary', label: 'Primary', description: 'The main entity key' },
  { value: 'foreign', label: 'Foreign', description: 'References another entity' },
  { value: 'unique', label: 'Unique', description: 'Unique non-primary key' },
  { value: 'natural', label: 'Natural', description: 'Business-meaningful key' },
]

function emptyEntity(): Entity {
  return { name: '', type: 'primary', expr: '' }
}

export function EntityEditor({
  entities,
  onChange,
  availableColumns = [],
}: EntityEditorProps) {
  const add = () => onChange([...entities, emptyEntity()])

  const update = (idx: number, partial: Partial<Entity>) => {
    const next = [...entities]
    next[idx] = { ...next[idx], ...partial }
    onChange(next)
  }

  const remove = (idx: number) => onChange(entities.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <Key className="h-3.5 w-3.5" />
          Entities ({entities.length})
        </Label>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={add}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {entities.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4 border border-dashed rounded">
          No entities defined. Add a primary entity to enable joins.
        </p>
      ) : (
        entities.map((entity, idx) => (
          <Card key={idx} className="border-l-4 border-l-orange-400">
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Entity #{idx + 1}</span>
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
                    value={entity.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    placeholder="customer"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type *</Label>
                  <Select
                    value={entity.type}
                    onValueChange={(v) => update(idx, { type: v as Entity['type'] })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Expression (column/SQL)</Label>
                {availableColumns.length > 0 ? (
                  <Select
                    value={entity.expr || ''}
                    onValueChange={(v) => update(idx, { expr: v })}
                  >
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
                    value={entity.expr || ''}
                    onChange={(e) => update(idx, { expr: e.target.value })}
                    placeholder="customer_id"
                    className="h-8 text-xs font-mono"
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={entity.description || ''}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  placeholder="Unique customer identifier"
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
