/**
 * RunResultsSummary — summary card for a completed dbt run.
 *
 * Shows success/error/skip model counts, total duration,
 * and a per-model breakdown table.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  CheckCircle,
  XCircle,
  SkipForward,
  Clock,
} from 'lucide-react'

export interface RunResult {
  unique_id: string
  status: 'success' | 'error' | 'skipped'
  execution_time: number
  rows_affected?: number
  message?: string
}

export interface RunResultsSummaryProps {
  results: RunResult[]
  totalDuration?: number
  command?: string
}

export function RunResultsSummary({
  results,
  totalDuration,
  command,
}: RunResultsSummaryProps) {
  const succeeded = results.filter((r) => r.status === 'success')
  const errored = results.filter((r) => r.status === 'error')
  const skipped = results.filter((r) => r.status === 'skipped')
  const total = results.length
  const successRate = total > 0 ? (succeeded.length / total) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Run Results
          {command && (
            <Badge variant="outline" className="ml-auto font-mono text-[10px]">
              dbt {command}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-green-600">{succeeded.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-0.5">
              <CheckCircle className="h-3 w-3" /> Success
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-red-600">{errored.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-0.5">
              <XCircle className="h-3 w-3" /> Error
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-gray-400">{skipped.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-0.5">
              <SkipForward className="h-3 w-3" /> Skipped
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-medium">{successRate.toFixed(0)}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>

        {/* Duration */}
        {totalDuration != null && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Total duration: {totalDuration.toFixed(1)}s
          </div>
        )}

        {/* Per-model breakdown */}
        {results.length > 0 && (
          <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
            {results.map((r) => {
              const modelName = r.unique_id.split('.').pop() || r.unique_id
              return (
                <div
                  key={r.unique_id}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
                    r.status === 'error' ? 'bg-red-50/50' : ''
                  }`}
                >
                  {r.status === 'success' && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
                  {r.status === 'error' && <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                  {r.status === 'skipped' && <SkipForward className="h-3 w-3 text-gray-400 shrink-0" />}

                  <span className="font-mono truncate flex-1">{modelName}</span>

                  {r.rows_affected != null && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {r.rows_affected.toLocaleString()} rows
                    </Badge>
                  )}

                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {r.execution_time.toFixed(2)}s
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Error details */}
        {errored.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-red-600">Error Details</div>
            {errored.map((r) => (
              <div
                key={r.unique_id}
                className="bg-red-50 border border-red-200 rounded p-2 text-xs"
              >
                <div className="font-mono font-medium text-red-700">
                  {r.unique_id.split('.').pop()}
                </div>
                {r.message && (
                  <pre className="text-red-600 whitespace-pre-wrap mt-1 text-[10px]">
                    {r.message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
