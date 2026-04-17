/**
 * QuickTestActions — run tests for a single model/column with one click.
 */

import { FlaskConical, Play, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDbtTest } from '../../hooks/useDbtStudio'
import { toast } from 'sonner'

interface QuickTestActionsProps {
  modelName: string
  columnName?: string
}

export function QuickTestActions({ modelName, columnName }: QuickTestActionsProps) {
  const { mutate: runTest, isPending } = useDbtTest()

  const handleRunModelTests = () => {
    runTest(
      { select: modelName },
      {
        onSuccess: () => toast.success(`Tests started for ${modelName}`),
        onError: (err: Error) => toast.error(err.message || 'Failed to run tests'),
      }
    )
  }

  const handleRunColumnTests = () => {
    if (!columnName) return
    runTest(
      { select: `${modelName}:${columnName}` },
      {
        onSuccess: () => toast.success(`Tests started for ${modelName}.${columnName}`),
        onError: (err: Error) => toast.error(err.message || 'Failed to run tests'),
      }
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7" disabled={isPending}>
          <FlaskConical className="h-3 w-3 mr-1" />
          Test
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleRunModelTests}>
          <Play className="h-4 w-4 mr-2" />
          Run all tests for model
        </DropdownMenuItem>
        {columnName && (
          <DropdownMenuItem onClick={handleRunColumnTests}>
            <Play className="h-4 w-4 mr-2" />
            Run tests for &quot;{columnName}&quot;
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <RotateCw className="h-4 w-4 mr-2" />
          Re-run failed tests
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
