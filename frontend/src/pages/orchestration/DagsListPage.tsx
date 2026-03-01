import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dagService, DagConfig } from '@/services/dagService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function DagsListPage() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<DagConfig | null>(null)

  const {
    data: dags,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dags'],
    queryFn: () => dagService.list(),
  })

  // --- Mutations ---

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

  const getStatusBadge = (status: string) => {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(status)}`}
      >
        {status}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-destructive">Failed to load DAGs</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DAG Workflows</h1>
          <p className="text-muted-foreground">
            Manage your data pipeline orchestration
          </p>
        </div>
        <Button asChild>
          <Link to="/app/dags/new">
            <Plus className="mr-2 h-4 w-4" />
            Create DAG
          </Link>
        </Button>
      </div>

      {/* DAGs Grid */}
      {dags && dags.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dags.map((dag: DagConfig) => (
            <Card key={dag.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{dag.dag_id}</CardTitle>
                  {getStatusBadge(dag.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
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
                  {dag.deployed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last deployed:</span>
                      <span className="font-medium">{formatDate(dag.deployed_at)}</span>
                    </div>
                  )}
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

                  {/* Enable / Disable toggle */}
                  {dag.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePause(dag)}
                      disabled={pauseMutation.isPending}
                    >
                      {pauseMutation.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Pause className="mr-1 h-3 w-3" />
                      )}
                      Disable
                    </Button>
                  ) : dag.status === 'paused' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePause(dag)}
                      disabled={unpauseMutation.isPending}
                    >
                      {unpauseMutation.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="mr-1 h-3 w-3" />
                      )}
                      Enable
                    </Button>
                  ) : null}

                  {/* More actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {dag.status === 'active' && (
                        <DropdownMenuItem onClick={() => handleTogglePause(dag)}>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Disable DAG
                        </DropdownMenuItem>
                      )}
                      {dag.status === 'paused' && (
                        <DropdownMenuItem onClick={() => handleTogglePause(dag)}>
                          <Power className="mr-2 h-4 w-4" />
                          Enable DAG
                        </DropdownMenuItem>
                      )}
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No DAGs yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first workflow to start orchestrating data pipelines.
            </p>
            <Button asChild>
              <Link to="/app/dags/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First DAG
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DAG</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteTarget?.dag_id}</span>?
              This will remove the DAG from Airflow and archive it. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
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
