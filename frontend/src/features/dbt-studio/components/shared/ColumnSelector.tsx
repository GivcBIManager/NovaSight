/**
 * ColumnSelector — reusable column multi-select with search.
 *
 * Used in various builders to pick one or more warehouse columns.
 */

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import type { WarehouseColumn } from '../../types/visualModel'

export interface ColumnSelectorProps {
  columns: WarehouseColumn[]
  selected: string[]
  onChange: (selected: string[]) => void
  /** Allow single select only. */
  single?: boolean
  maxHeight?: string
  placeholder?: string
}

export function ColumnSelector({
  columns,
  selected,
  onChange,
  single = false,
  maxHeight = '200px',
  placeholder = 'Search columns...',
}: ColumnSelectorProps) {
  const [search, setSearch] = useState('')
  const selectedSet = new Set(selected)

  const filtered = columns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (name: string) => {
    if (single) {
      onChange(selectedSet.has(name) ? [] : [name])
    } else {
      if (selectedSet.has(name)) {
        onChange(selected.filter((s) => s !== name))
      } else {
        onChange([...selected, name])
      }
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-7 h-7 text-xs"
        />
      </div>

      <ScrollArea style={{ maxHeight }}>
        <div className="border rounded-md">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-3">
              {columns.length === 0 ? 'No columns available' : 'No match'}
            </p>
          ) : (
            filtered.map((col) => (
              <label
                key={col.name}
                className="flex items-center gap-2 px-2 py-1 hover:bg-accent cursor-pointer text-xs"
              >
                <Checkbox
                  checked={selectedSet.has(col.name)}
                  onCheckedChange={() => toggle(col.name)}
                />
                <span className="font-mono truncate flex-1">{col.name}</span>
                <Badge variant="outline" className="text-[9px] font-mono">
                  {col.type}
                </Badge>
              </label>
            ))
          )}
        </div>
      </ScrollArea>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((name) => (
            <Badge
              key={name}
              variant="default"
              className="text-[10px] font-mono cursor-pointer"
              onClick={() => toggle(name)}
            >
              {name} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
