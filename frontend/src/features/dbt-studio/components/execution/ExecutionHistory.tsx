/**
 * ExecutionHistory — paginated table of past dbt executions.
 *
 * Shows command, status, duration, model counts, and links to
 * view full logs and run results.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  History,
  Eye,
  StopCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { DbtExecutionRecord } from '../../types/visualModel'

export interface ExecutionHistoryProps {
  executions: DbtExecutionRecord[]
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onViewLogs?: (executionId: string) => void
  onCancel?: (executionId: string) => void
  isLoading?: boolean
}

const STATUS_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'bg-gray-50 text-gray-600 border-gray-300',
  },
  running: {
    icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
    color: 'bg-blue-50 text-blue-600 border-blue-300',
  },
  success: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'bg-green-50 text-green-600 border-green-300',
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'bg-red-50 text-red-600 border-red-300',
  },
  cancelled: {
    icon: <StopCircle className="h-3.5 w-3.5" />,
    color: 'bg-yellow-50 text-yellow-600 border-yellow-300',
  },
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(0)
  return `${mins}m ${secs}s`
}

function formatTime(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ExecutionHistory({
  executions,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  onViewLogs,
  onCancel,
  isLoading = false,
}: ExecutionHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered =
    statusFilter === 'all'
      ? executions
      : executions.filter((e) => e.status === statusFilter)

  const totalPages = total ? Math.ceil(total / pageSize) : 1

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Execution History
            {total != null && (
              <Badge variant="secondary" className="text-[10px]">
                {total} total
              </Badge>
            )}
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="running" className="text-xs">Running</SelectItem>
              <SelectItem value="success" className="text-xs">Success</SelectItem>
              <SelectItem value="error" className="text-xs">Error</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading history...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No executions found.
          </p>
        ) : (
          <>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-xs">#</TableHead>
                    <TableHead className="text-xs">Command</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Started</TableHead>
                    <TableHead className="text-xs text-right">Duration</TableHead>
                    <TableHead className="text-xs text-center">Models</TableHead>
                    <TableHead className="text-xs w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((exec) => {
                    const status = STATUS_MAP[exec.status] || STATUS_MAP.pending
                    return (
                      <TableRow key={exec.id}>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                          {exec.id}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="space-y-0.5">
                            <span className="text-xs font-mono block">
                              dbt {exec.command}
                            </span>
                            {exec.selector && (
                              <span className="text-[10px] text-muted-foreground font-mono block">
                                --select {exec.selector}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] gap-1 ${status.color}`}
                          >
                            {status.icon}
                            {exec.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs">
                          {formatTime(exec.started_at)}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-right tabular-nums">
                          {formatDuration(exec.duration_seconds)}
                        </TableCell>
                        <TableCell className="py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {exec.models_succeeded != null && exec.models_succeeded > 0 && (
                              <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                                {exec.models_succeeded}
                              </Badge>
                            )}
                            {exec.models_errored != null && exec.models_errored > 0 && (
                              <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">
                                {exec.models_errored}
                              </Badge>
                            )}
                            {exec.models_skipped != null && exec.models_skipped > 0 && (
                              <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-300">
                                {exec.models_skipped}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex gap-1">
                            {onViewLogs && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onViewLogs(exec.id)}
                                title="View logs"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            {onCancel && exec.status === 'running' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => onCancel(exec.id)}
                                title="Cancel"
                              >
                                <StopCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && onPageChange && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
