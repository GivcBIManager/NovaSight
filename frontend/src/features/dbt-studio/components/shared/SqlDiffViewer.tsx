/**
 * SqlDiffViewer — side-by-side diff for model SQL changes.
 * 
 * Shows line-by-line changes with highlighting.
 */

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GitCompare } from 'lucide-react'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

/**
 * Simple line diff algorithm.
 * For production, consider using a proper diff library like 'diff'.
 */
function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []
  
  // Simple LCS-based diff
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)
  
  let oldIdx = 0
  let newIdx = 0
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx]
    const newLine = newLines[newIdx]
    
    if (oldIdx >= oldLines.length) {
      // Remaining new lines are additions
      result.push({ type: 'added', content: newLine })
      newIdx++
    } else if (newIdx >= newLines.length) {
      // Remaining old lines are removals
      result.push({ type: 'removed', content: oldLine })
      oldIdx++
    } else if (oldLine === newLine) {
      // Lines match
      result.push({ type: 'unchanged', content: oldLine })
      oldIdx++
      newIdx++
    } else if (!newSet.has(oldLine)) {
      // Old line was removed
      result.push({ type: 'removed', content: oldLine })
      oldIdx++
    } else if (!oldSet.has(newLine)) {
      // New line was added
      result.push({ type: 'added', content: newLine })
      newIdx++
    } else {
      // Both exist somewhere, treat as replacement
      result.push({ type: 'removed', content: oldLine })
      result.push({ type: 'added', content: newLine })
      oldIdx++
      newIdx++
    }
  }
  
  return result
}

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
  const diffLines = useMemo(() => computeLineDiff(oldSql, newSql), [oldSql, newSql])
  
  const stats = useMemo(() => {
    let added = 0
    let removed = 0
    for (const line of diffLines) {
      if (line.type === 'added') added++
      if (line.type === 'removed') removed++
    }
    return { added, removed }
  }, [diffLines])
  
  // Check if there are any actual changes
  const hasChanges = stats.added > 0 || stats.removed > 0
  
  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          SQL Diff
          {hasChanges ? (
            <>
              <Badge variant="outline" className="text-[10px] text-green-600 border-green-400">
                +{stats.added}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-red-600 border-red-400">
                -{stats.removed}
              </Badge>
            </>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              No changes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <pre className="text-xs font-mono p-3 leading-relaxed">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === 'added'
                    ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300'
                    : line.type === 'removed'
                    ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                    : ''
                }
              >
                <span className="inline-block w-4 text-muted-foreground">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {line.content}
              </div>
            ))}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
