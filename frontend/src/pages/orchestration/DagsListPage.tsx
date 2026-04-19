import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dagService } from '@/services/dagService'
import type { DagConfig } from '@/services/dagService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader, EmptyState } from '@/components/common'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Play,
  Pause,
  Eye,
  Settings,
  Loader2,
  GitBranch,
  Trash2,
  MoreVertical,
  Power,
  PowerOff,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import { getStatusClasses } from '@/lib/colors'

/**
 * DagsListPage -- canonical "list + create" module page.
 *
 * UX hierarchy applied:
 * 1. PageHeader places the single primary CTA ("Create DAG") top-right --
 *    the user''s reading path lands on it after absorbing page context.
 * 2. Per-card action density is reduced: only the TWO most common actions
 *    (Edit, Monitor) render as inline outline buttons; enable/disable +
 *    delete move under the overflow menu. Hick''s Law: fewer visible choices
 *    means faster decisions.
 * 3. Status is communicated via ONE channel (the badge) -- card borders and
 *    backgrounds stay neutral so nothing competes with the badge''s signal.
 * 4. The empty state uses the canonical EmptyState with a single primary
 *    CTA ("Create Your First DAG") -- the only thing the user can/should do.
 */
export function DagsListPage() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<DagConfig | null>(null)

  const { data: dags, isLoading, error } = useQuery({
    queryKey: ['dags'],
    queryFn: () => dagService.list(),
  })

  const pauseMutation = useMutation({
    mutationFn: (dagId: string) => dagService.pause(dagId),
    onSuccess: (_data, dagId) => {
      queryClient.invalidateQueries({ queryKey: ['dags'] })
      toast({ title: 'DAG Disabled', description: `DAG "${dagId}" has been disabled.` })
    },
    onError: (_err, dagId) => {
      toast({ title: 'Error', description: `Failed to disable DAG "${dagId}"`, variant: 'destructive' })
    },
  })

  const unpauseMutation = useMutation({
    mutationFn: (dagId: string) => dagService.unpause(dagId),
    onSuccess: (_data, dagId) => {
      queryClient.invalidateQueries({ queryKey: ['dags'] })
      toast({ title: 'DAG Enabled', description: `DAG "${dagId}" has been enabled.` })
    },
    onError: (_err, dagId) => {
      toast({ title: 'Error', description: `Failed to enable DAG "${dagId}"`, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (dagId: string) => dagService.delete(dagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dags'] })
      toast({ title: 'DAG Deleted', description: `DAG "${deleteTarget?.dag_id}" has been deleted.` })
      setDeleteTarget(null)
    },
    onError: () => {
      toast({ title: 'Error', description: `Failed to delete DAG "${deleteTarget?.dag_id}"`, variant: 'destructive' })
      setDeleteTarget(null)
    },
  })

  const handleTogglePause = (dag: DagConfig) => {
    if (dag.status === 'active') {
      pauseMutation.mutate(dag.dag_id)
    } else if (dag.status === 'paused') {
      unpauseMutation.mutate(dag.dag_id)
    }
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.dag_id)
    }
  }

  const getStatusBadge = (status: string) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(status)}`}
    >
      {status}
    </span>
  )

  return (
    <div>
      <PageHeader
        icon={<GitBranch className="h-5 w-5" />}
        title="DAG Workflows"
        description="Manage your data pipeline orchestration"
        actions={
          <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
            <Link to="/app/dags/new">Create DAG</Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load DAGs</p>
        </div>
      ) : dags && dags.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dags.map((dag: DagConfig) => (
            <Card key={dag.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate text-lg">{dag.dag_id}</CardTitle>
                  {getStatusBadge(dag.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {dag.description || 'No description'}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule:</span>
                    <span className="font-medium">
                      {dag.schedule_type === 'cron'
                        ? dag.schedule_cron
                        : dag.schedule_type === 'preset'
                          ? dag.schedule_preset
                          : 'Manual'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-medium">v{dag.current_version}</span>
                  </div>
                  {dag.deployed_at ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last deployed:</span>
                      <span className="font-medium">{formatDate(dag.deployed_at)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/app/dags/${dag.id}/edit`}>
                      <Settings className="mr-1 h-3 w-3" />
                      Edit
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/app/dags/${dag.id}/monitor`}>
                      <Eye className="mr-1 h-3 w-3" />
                      Monitor
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-8 w-8 p-0"
                        aria-label={`More actions for ${dag.dag_id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {dag.status === 'active' ? (
                        <DropdownMenuItem
                          onClick={() => handleTogglePause(dag)}
                          disabled={pauseMutation.isPending}
                        >
                          {pauseMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <PowerOff className="mr-2 h-4 w-4" />
                          )}
                          Disable DAG
                        </DropdownMenuItem>
                      ) : null}
                      {dag.status === 'paused' ? (
                        <DropdownMenuItem
                          onClick={() => handleTogglePause(dag)}
                          disabled={unpauseMutation.isPending}
                        >
                          {unpauseMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="mr-2 h-4 w-4" />
                          )}
                          Enable DAG
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(dag)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete DAG
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {dag.status === 'active' || dag.status === 'paused' ? (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePause(dag)}
                      disabled={pauseMutation.isPending || unpauseMutation.isPending}
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {dag.status === 'active' ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" /> Disable
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" /> Enable
                        </>
                      )}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GitBranch className="h-12 w-12" />}
          title="No DAGs yet"
          description="Create your first workflow to start orchestrating data pipelines."
          action={
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link to="/app/dags/new">Create Your First DAG</Link>
            </Button>
          }
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DAG</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteTarget?.dag_id}</span>?
              This will remove the pipeline from Dagster and archive it. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}