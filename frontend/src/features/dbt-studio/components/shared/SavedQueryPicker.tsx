/**
 * SavedQueryPicker — compact dropdown that lists tenant saved queries
 * and emits the selected query's SQL + metadata to the caller.
 *
 * Used in dbt Studio authoring surfaces (Visual Query Builder, Test
 * Config Form) to let analysts reuse SQL authored in the SQL Editor
 * without re-typing it. Respects `query_type` filter (defaults to
 * 'dbt' + 'adhoc' via `useDbtSavedQueries`).
 */

import { useMemo, useState } from 'react'
import { Bookmark, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  useDbtSavedQueries,
  type DbtQueryType,
  type SavedQuery,
} from '../../hooks/useDbtSavedQueries'
import { getQueryTypeConfig } from '@/lib/colors'
import { cn } from '@/lib/utils'

export interface SavedQueryPickerProps {
  /** Called with the selected saved query. */
  onSelect: (query: SavedQuery) => void
  /** Which query types to include. Defaults to ['dbt','adhoc']. */
  includeTypes?: DbtQueryType[]
  /** Button label when no selection is made. */
  label?: string
  /** Optional compact variant (xs button). */
  size?: 'sm' | 'xs'
  /** Disable the picker. */
  disabled?: boolean
}

export function SavedQueryPicker({
  onSelect,
  includeTypes,
  label = 'Load Saved Query',
  size = 'sm',
  disabled = false,
}: SavedQueryPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { items, isLoading } = useDbtSavedQueries({ includeTypes })

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const needle = search.toLowerCase()
    return items.filter(
      (q) =>
        q.name.toLowerCase().includes(needle) ||
        (q.description ?? '').toLowerCase().includes(needle) ||
        q.tags.some((t) => t.toLowerCase().includes(needle))
    )
  }, [items, search])

  const handleSelect = (q: SavedQuery) => {
    onSelect(q)
    setOpen(false)
    setSearch('')
  }

  const btnHeight = size === 'xs' ? 'h-7 text-[11px]' : 'h-8 text-xs'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('gap-1.5', btnHeight)}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved queries…"
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[320px]">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No saved queries found.
            </p>
          ) : (
            <ul className="py-1">
              {filtered.map((q) => {
                const cfg = getQueryTypeConfig(q.query_type)
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(q)}
                      className="w-full text-left px-3 py-2 hover:bg-accent focus:bg-accent focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate flex-1">
                          {q.name}
                        </span>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', cfg.classes)}>
                          {cfg.label}
                        </Badge>
                      </div>
                      {q.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {q.description}
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default SavedQueryPicker
