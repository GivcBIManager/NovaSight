/**
 * SaveAsQueryButton — one-click "Save as Query" action for dbt Studio
 * authoring surfaces. Persists the given SQL into the tenant Saved
 * Queries library with `query_type='dbt'` so it can be reused inside
 * dbt Studio, the SQL Editor, or PySpark App Builder.
 *
 * Rendering pattern:
 *   <SaveAsQueryButton sql={sql} defaultName={testName} tags={['dbt','test']} />
 *
 * Notes:
 *  - Respects ADR-002 Template Engine Rule by design: this action
 *    saves a *reference* of SQL into the tenant library only; it does
 *    NOT alter dbt model generation.
 *  - The button is disabled until both `sql` and a non-empty name
 *    are available.
 */

import { useState } from 'react'
import { Bookmark, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/components/ui/use-toast'
import { useCreateSavedQuery } from '../../hooks/useDbtSavedQueries'
import type { DbtQueryType } from '../../hooks/useDbtSavedQueries'

export interface SaveAsQueryButtonProps {
  /** SQL to persist. */
  sql: string
  /** Default query name (editable in the popover). */
  defaultName?: string
  /** Default description (editable in the popover). */
  defaultDescription?: string
  /** Default tags to attach. */
  defaultTags?: string[]
  /** Query type classification. Defaults to 'dbt'. */
  queryType?: DbtQueryType
  /** Optional compact variant. */
  size?: 'sm' | 'xs'
  /** Disable the action. */
  disabled?: boolean
  /** Button label override. */
  label?: string
}

export function SaveAsQueryButton({
  sql,
  defaultName = '',
  defaultDescription = '',
  defaultTags = ['dbt'],
  queryType = 'dbt',
  size = 'sm',
  disabled = false,
  label = 'Save as Query',
}: SaveAsQueryButtonProps) {
  const { toast } = useToast()
  const createMutation = useCreateSavedQuery()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState(defaultDescription)

  const canSubmit = sql.trim().length > 0 && name.trim().length > 0
  const isDisabled = disabled || sql.trim().length === 0

  const handleSave = async () => {
    if (!canSubmit) return
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        sql,
        query_type: queryType,
        tags: defaultTags,
      })
      toast({
        title: 'Saved as Query',
        description: `"${name.trim()}" is now available in Saved Queries.`,
      })
      setOpen(false)
    } catch (err) {
      toast({
        title: 'Failed to save query',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      })
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setName(defaultName)
          setDescription(defaultDescription)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size === 'xs' ? 'sm' : size}
          disabled={isDisabled}
          className={size === 'xs' ? 'h-7 text-xs' : undefined}
        >
          <Bookmark className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. stg_orders_reference"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Bookmark className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
