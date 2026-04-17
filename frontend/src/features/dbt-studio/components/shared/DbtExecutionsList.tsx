/**
 * DbtExecutionsList — compact execution-history table for dbt runs.
 *
 * Rendered inside the unified Scheduling page (`dbt Runs` tab) so that
 * dbt invocations triggered from dbt Studio (run / test / build / seed
 * / snapshot / compile) appear alongside Spark jobs and Dagster runs
 * instead of being siloed inside the dbt feature.
 *
 * Data source: GET /api/v1/dbt/executions via `useDbtExecutions`.
 * Actions: view in dbt Studio, cancel running execution.
 */

import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getStatusClasses } from '@/lib/colors'
import {
  useDbtExecutions,
  useCancelDbtExecution,
} from '../../hooks/useDbtExecutions'
import type {
  DbtExecutionRecord,
  ExecutionStatus,
} from '../../types/visualModel'

export interface DbtExecutionsListProps {
  /** Max rows to fetch. Defaults to 50. */
  limit?: number
  /** Optional filter by command (run|test|build|seed|snapshot|compile). */
  command?: string
  /** Optional filter by status. */
  status?: string
}

const statusIcon: Record<ExecutionStatus, JSX.Element> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  error: <AlertCircle className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function relative(ts: string | null): string {
  if (!ts) return '—'
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true })
  } catch {
    return '—'
  }
}

export function DbtExecutionsList({
  limit = 50,
  command,
  status,
}: DbtExecutionsListProps) {
  const navigate = useNavigate()
  const { data, isLoading, isFetching, error, refetch } = useDbtExecutions({
    limit,
    command,
    status,
  })
  const cancelMutation = useCancelDbtExecution()

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          Failed to load dbt executions.
          <Button variant="link" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const rows: DbtExecutionRecord[] = data ?? []

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Activity className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            No dbt executions yet. Trigger a run from dbt Studio to see history here.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/dbt-studio')}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open dbt Studio
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <p className="text-xs text-muted-foreground">
          {rows.length} execution{rows.length === 1 ? '' : 's'} · auto-refreshing
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-7 w-7"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead>Command</TableHead>
            <TableHead>Selector</TableHead>
            <TableHead className="text-right">Models</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Started</TableHead>
            <TableHead className="w-[140px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((exec) => {
            const isActive = exec.status === 'running' || exec.status === 'pending'
            const modelSummary =
              exec.models_succeeded + exec.models_errored + exec.models_skipped
            return (
              <TableRow key={exec.id} className="text-sm">
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${getStatusClasses(exec.status)}`}
                  >
                    {statusIcon[exec.status]}
                    {exec.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  dbt {exec.command}
                  {exec.full_refresh && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      --full-refresh
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[220px] truncate">
                  {exec.selector || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {modelSummary > 0 ? (
                    <span>
                      <span className="text-emerald-600">{exec.models_succeeded}</span>
                      {exec.models_errored > 0 && (
                        <>
                          {' / '}
                          <span className="text-red-600">{exec.models_errored}</span>
                        </>
                      )}
                      {exec.models_skipped > 0 && (
                        <>
                          {' / '}
                          <span className="text-muted-foreground">{exec.models_skipped}</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums text-xs">
                  {formatDuration(exec.duration_seconds)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {relative(exec.started_at ?? exec.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => cancelMutation.mutate(exec.id)}
                        disabled={cancelMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        navigate(`/app/dbt-studio?tab=executions&execution_id=${exec.id}`)
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
