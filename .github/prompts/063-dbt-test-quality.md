# 063 - dbt Test & Quality Management

## Metadata

```yaml
prompt_id: "063"
phase: "O3"
agent: "@frontend" 
model: "sonnet 4.5"
priority: P1
estimated_effort: "3 days"
dependencies: ["062"]
```

## Objective

Implement test configuration UI, test coverage visualization, quick-run actions, and test failure drill-down.

## Task Description

Create a comprehensive test management experience within dbt Studio for schema tests, data tests, and freshness checks.

## Requirements

### 1. Test Type Registry

```typescript
// frontend/src/features/dbt-studio/constants/testTypes.ts
/**
 * Pre-defined dbt test types for picker.
 */

export interface TestTypeDefinition {
  name: string
  description: string
  category: 'schema' | 'data' | 'freshness'
  args: TestArgument[]
  template: string
}

export interface TestArgument {
  name: string
  type: 'column' | 'value' | 'values' | 'model'
  required: boolean
  description: string
}

export const BUILT_IN_TESTS: TestTypeDefinition[] = [
  {
    name: 'unique',
    description: 'Ensures all values in a column are unique',
    category: 'schema',
    args: [{ name: 'column', type: 'column', required: true, description: 'Column to test' }],
    template: 'unique',
  },
  {
    name: 'not_null',
    description: 'Ensures no NULL values in a column',
    category: 'schema',
    args: [{ name: 'column', type: 'column', required: true, description: 'Column to test' }],
    template: 'not_null',
  },
  {
    name: 'accepted_values',
    description: 'Ensures values are within an allowed list',
    category: 'schema',
    args: [
      { name: 'column', type: 'column', required: true, description: 'Column to test' },
      { name: 'values', type: 'values', required: true, description: 'List of allowed values' },
    ],
    template: 'accepted_values',
  },
  {
    name: 'relationships',
    description: 'Ensures referential integrity to another model',
    category: 'schema',
    args: [
      { name: 'column', type: 'column', required: true, description: 'Foreign key column' },
      { name: 'to', type: 'model', required: true, description: 'Referenced model' },
      { name: 'field', type: 'value', required: true, description: 'Referenced column' },
    ],
    template: 'relationships',
  },
  {
    name: 'source_freshness',
    description: 'Checks source data recency',
    category: 'freshness',
    args: [
      { name: 'warn_after', type: 'value', required: true, description: 'e.g. {count: 12, period: hour}' },
      { name: 'error_after', type: 'value', required: false, description: 'e.g. {count: 24, period: hour}' },
    ],
    template: 'freshness',
  },
]
```

### 2. Generic Test Picker

```tsx
// frontend/src/features/dbt-studio/components/tests/TestTypePicker.tsx
/**
 * TestTypePicker — searchable picker for built-in and custom tests.
 */

import { useState } from 'react'
import { Search, FlaskConical, Check, AlertTriangle, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { BUILT_IN_TESTS, TestTypeDefinition } from '../../constants/testTypes'

interface TestTypePickerProps {
  onSelect: (testType: TestTypeDefinition) => void
  trigger?: React.ReactNode
}

const CATEGORY_ICONS = {
  schema: Check,
  data: AlertTriangle,
  freshness: Clock,
}

const CATEGORY_COLORS = {
  schema: 'bg-blue-100 text-blue-800',
  data: 'bg-amber-100 text-amber-800',
  freshness: 'bg-green-100 text-green-800',
}

export function TestTypePicker({ onSelect, trigger }: TestTypePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredTests = BUILT_IN_TESTS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (test: TestTypeDefinition) => {
    onSelect(test)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FlaskConical className="h-4 w-4 mr-1" />
            Add Test
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          {filteredTests.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tests found
            </div>
          ) : (
            <div className="p-1">
              {filteredTests.map((test) => {
                const Icon = CATEGORY_ICONS[test.category]
                return (
                  <button
                    key={test.name}
                    onClick={() => handleSelect(test)}
                    className="w-full flex items-start gap-2 p-2 rounded hover:bg-muted text-left"
                  >
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{test.name}</span>
                        <Badge className={`text-[10px] ${CATEGORY_COLORS[test.category]}`}>
                          {test.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {test.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
```

### 3. Test Coverage Badge

```tsx
// frontend/src/features/dbt-studio/components/tests/TestCoverageBadge.tsx
/**
 * TestCoverageBadge — shows test count and pass/fail ratio for a model.
 */

import { FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TestCoverageBadgeProps {
  testCount: number
  passedCount: number
  failedCount: number
  lastRunAt?: string
}

export function TestCoverageBadge({
  testCount,
  passedCount,
  failedCount,
  lastRunAt,
}: TestCoverageBadgeProps) {
  const hasFailures = failedCount > 0
  const coveragePercent = testCount > 0 ? Math.round((passedCount / testCount) * 100) : 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 ${
              hasFailures
                ? 'border-red-400 text-red-600'
                : testCount > 0
                ? 'border-green-400 text-green-600'
                : 'border-muted-foreground text-muted-foreground'
            }`}
          >
            {hasFailures ? (
              <AlertCircle className="h-3 w-3" />
            ) : testCount > 0 ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <FlaskConical className="h-3 w-3" />
            )}
            {testCount > 0 ? `${passedCount}/${testCount}` : 'No tests'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Test Coverage: {coveragePercent}%</p>
            <p>• {passedCount} passed</p>
            {failedCount > 0 && <p className="text-red-400">• {failedCount} failed</p>}
            {lastRunAt && (
              <p className="text-muted-foreground">Last run: {new Date(lastRunAt).toLocaleString()}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

### 4. Test Failure Drill-Down

```tsx
// frontend/src/features/dbt-studio/components/tests/TestFailureDetails.tsx
/**
 * TestFailureDetails — expandable card showing failure info and sample rows.
 */

import { AlertTriangle, ChevronDown, ChevronRight, RotateCw, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useState } from 'react'

export interface TestFailure {
  test_name: string
  model_name: string
  column_name?: string
  status: 'fail' | 'warn' | 'error'
  failure_count: number
  sample_failures: Record<string, unknown>[]
  compiled_sql?: string
  execution_time_ms: number
  run_at: string
}

interface TestFailureDetailsProps {
  failure: TestFailure
  onRerun?: () => void
}

export function TestFailureDetails({ failure, onRerun }: TestFailureDetailsProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSql, setShowSql] = useState(false)

  return (
    <Card className="border-red-200 dark:border-red-900">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 px-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm flex-1">
                <span className="font-mono">{failure.test_name}</span>
                {failure.column_name && (
                  <span className="text-muted-foreground"> on {failure.column_name}</span>
                )}
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  failure.status === 'fail'
                    ? 'border-red-400 text-red-600'
                    : failure.status === 'warn'
                    ? 'border-amber-400 text-amber-600'
                    : 'border-gray-400'
                }
              >
                {failure.failure_count} failure{failure.failure_count !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-3 space-y-3">
            {/* Sample Failures Table */}
            {failure.sample_failures.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Sample Failing Rows</p>
                <ScrollArea className="w-full">
                  <div className="rounded border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          {Object.keys(failure.sample_failures[0]).map((col) => (
                            <th key={col} className="px-2 py-1 text-left font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {failure.sample_failures.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-2 py-1 font-mono">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Compiled SQL */}
            {failure.compiled_sql && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs mb-1"
                  onClick={() => setShowSql(!showSql)}
                >
                  <Code className="h-3 w-3 mr-1" />
                  {showSql ? 'Hide' : 'Show'} Compiled SQL
                </Button>
                {showSql && (
                  <pre className="text-[11px] bg-muted p-2 rounded overflow-x-auto font-mono">
                    {failure.compiled_sql}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                Executed in {failure.execution_time_ms}ms at{' '}
                {new Date(failure.run_at).toLocaleString()}
              </p>
              {onRerun && (
                <Button variant="outline" size="sm" className="h-7" onClick={onRerun}>
                  <RotateCw className="h-3 w-3 mr-1" />
                  Re-run
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
```

### 5. Quick Test Actions

```tsx
// frontend/src/features/dbt-studio/components/tests/QuickTestActions.tsx
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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface QuickTestActionsProps {
  modelName: string
  columnName?: string
}

export function QuickTestActions({ modelName, columnName }: QuickTestActionsProps) {
  const queryClient = useQueryClient()

  const runTests = useMutation({
    mutationFn: async (scope: 'model' | 'column') => {
      const params = new URLSearchParams()
      params.set('model', modelName)
      if (scope === 'column' && columnName) {
        params.set('column', columnName)
      }
      return apiClient.post(`/api/v1/dbt/test?${params.toString()}`)
    },
    onSuccess: () => {
      toast.success('Tests started')
      queryClient.invalidateQueries({ queryKey: ['dbt-test-results', modelName] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to run tests')
    },
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">
          <FlaskConical className="h-3 w-3 mr-1" />
          Test
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => runTests.mutate('model')}>
          <Play className="h-4 w-4 mr-2" />
          Run all tests for model
        </DropdownMenuItem>
        {columnName && (
          <DropdownMenuItem onClick={() => runTests.mutate('column')}>
            <Play className="h-4 w-4 mr-2" />
            Run tests for "{columnName}"
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
```

### 6. Freshness Indicator

```tsx
// frontend/src/features/dbt-studio/components/tests/FreshnessIndicator.tsx
/**
 * FreshnessIndicator — shows source freshness status.
 */

import { Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'

interface FreshnessIndicatorProps {
  sourceName: string
  lastLoadedAt?: string
  freshnessStatus: 'pass' | 'warn' | 'error' | 'unknown'
  threshold?: { warn: string; error: string }
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  unknown: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
}

export function FreshnessIndicator({
  sourceName,
  lastLoadedAt,
  freshnessStatus,
  threshold,
}: FreshnessIndicatorProps) {
  const config = STATUS_CONFIG[freshnessStatus]
  const Icon = config.icon

  const age = lastLoadedAt
    ? formatDistanceToNow(new Date(lastLoadedAt), { addSuffix: true })
    : 'Unknown'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${config.color}`}>
            <Icon className="h-3 w-3" />
            {age}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Source: {sourceName}</p>
            <p>Last loaded: {lastLoadedAt ? new Date(lastLoadedAt).toLocaleString() : 'Never'}</p>
            {threshold && (
              <>
                <p>Warn after: {threshold.warn}</p>
                <p>Error after: {threshold.error}</p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

### 7. Exports

```typescript
// frontend/src/features/dbt-studio/components/tests/index.ts
export { TestTypePicker } from './TestTypePicker'
export { TestCoverageBadge } from './TestCoverageBadge'
export { TestFailureDetails } from './TestFailureDetails'
export { QuickTestActions } from './QuickTestActions'
export { FreshnessIndicator } from './FreshnessIndicator'
export type { TestFailure } from './TestFailureDetails'
```

## Acceptance Criteria

- [ ] TestTypePicker shows built-in tests searchable by name/description
- [ ] TestCoverageBadge shows pass/fail ratio with color coding
- [ ] TestFailureDetails expands to show sample rows + compiled SQL
- [ ] QuickTestActions dropdown runs model/column tests
- [ ] FreshnessIndicator shows age + threshold status
- [ ] All components type-safe with no TS errors

## Testing

1. Open model properties → Add Test → verify picker shows 5 built-in types
2. Model with tests → coverage badge shows ratio
3. Model with failures → expand failure → see sample rows
4. Click Test dropdown → Run all for model → toast confirms start
5. Source model → freshness badge shows age
