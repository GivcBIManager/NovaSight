import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dagService } from '@/services/dagService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common'
import {
  Loader2,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  GitBranch,
} from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { getStatusClasses } from '@/lib/colors'

export function DagMonitorPage() {
  const { dagId } = useParams<{ dagId: string }>()
  const { toast } = useToast()
  const [isTriggering, setIsTriggering] = useState(false)

  const {
    data: runs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dag-runs', dagId],
    queryFn: () => dagService.getRuns(dagId!),
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: !!dagId,
  })

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (state: string) => {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(state)}`}
      >
        {state}
      </span>
    )
  }

  const handleTrigger = async () => {
    if (isTriggering) return
    setIsTriggering(true)
    try {
      const result = await dagService.trigger(dagId!)
      toast({
        title: 'DAG Triggered',
        description: `Run started successfully. Run ID: ${result.run_id}`,
      })
      refetch()
    } catch (error: unknown) {
      console.error('Failed to trigger DAG:', error)
      let message = 'Failed to trigger DAG. Make sure the DAG is deployed to Dagster.'
      if (error instanceof Error) {
        message = error.message
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string } } }
        message = axiosError.response?.data?.error || axiosError.response?.data?.message || message
      }
      toast({
        title: 'Trigger Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsTriggering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<GitBranch className="h-5 w-5" />}
        title={dagId ?? 'DAG Monitor'}
        description="DAG run monitoring and logs"
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleTrigger} disabled={isTriggering}>
              {isTriggering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {isTriggering ? 'Triggering...' : 'Trigger Run'}
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runs?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {runs && runs.length > 0
                ? Math.round(
                    (runs.filter((r) => r.state === 'success').length /
                      runs.length) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {runs?.filter((r) => r.state === 'running').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {runs?.filter((r) => r.state === 'failed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Run ID
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Execution Date
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Start Time
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Duration
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const duration =
                      run.start_date && run.end_date
                        ? Math.round(
                            (new Date(run.end_date).getTime() -
                              new Date(run.start_date).getTime()) /
                              1000
                          )
                        : null
                    return (
                      <tr key={run.run_id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.state)}
                            {getStatusBadge(run.state)}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-sm">{run.run_id}</td>
                        <td className="py-3 text-sm">
                          {formatDate(run.execution_date)}
                        </td>
                        <td className="py-3 text-sm">
                          {run.start_date
                            ? formatDate(run.start_date)
                            : 'Not started'}
                        </td>
                        <td className="py-3 text-sm">
                          {duration !== null ? formatDuration(duration) : '-'}
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm">
                            View Logs
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No runs found for this DAG
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
