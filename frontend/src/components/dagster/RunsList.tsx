/**
 * Dagster Runs List Component
 * Displays recent pipeline/job runs with real-time updates
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dagsterService, UnifiedRun } from '@/services/dagsterService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  RefreshCw,
  StopCircle,
  MoreVertical,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { DagsterRunsFilter } from '@/types/dagster';

interface RunsListProps {
  filter?: DagsterRunsFilter;
  limit?: number;
  className?: string;
  showHeader?: boolean;
  onRunSelect?: (runId: string) => void;
}

export function RunsList({
  filter,
  limit = 25,
  className = '',
  showHeader = true,
  onRunSelect,
}: RunsListProps) {
  const queryClient = useQueryClient();
  const [terminateTarget, setTerminateTarget] = useState<UnifiedRun | null>(null);

  const {
    data: runs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dagster-runs', filter, limit],
    queryFn: () => dagsterService.getRuns(filter, limit),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const terminateMutation = useMutation({
    mutationFn: (runId: string) => dagsterService.terminateRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dagster-runs'] });
      toast({
        title: 'Run Terminated',
        description: `Run "${terminateTarget?.runId}" has been terminated.`,
      });
      setTerminateTarget(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: `Failed to terminate run "${terminateTarget?.runId}"`,
        variant: 'destructive',
      });
      setTerminateTarget(null);
    },
  });

  const getStatusIcon = (status: UnifiedRun['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'queued':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'canceled':
        return <StopCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: UnifiedRun['status']) => {
    const statusInfo = dagsterService.formatRunStatus(status);
    const colorClasses: Record<string, string> = {
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <Badge variant="outline" className={colorClasses[statusInfo.color]}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '-';
    return date.toLocaleString();
  };

  // Count runs by status for summary
  const statusCounts = runs?.reduce(
    (acc, run) => {
      acc[run.status] = (acc[run.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex h-32 flex-col items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load runs</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {showHeader && (
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Runs
              </CardTitle>
              {statusCounts && (
                <div className="flex items-center gap-2 text-sm">
                  {statusCounts.running && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {statusCounts.running} running
                    </Badge>
                  )}
                  {statusCounts.queued && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      {statusCounts.queued} queued
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
        )}
        <CardContent>
          {!runs || runs.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <Activity className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No runs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow
                    key={run.id}
                    className={onRunSelect ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => onRunSelect?.(run.runId)}
                  >
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {run.runId.substring(0, 8)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{run.jobName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        {getStatusBadge(run.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(run.startTime)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dagsterService.formatDuration(run.duration)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-green-600">{run.stepsSucceeded}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-600">{run.stepsFailed}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onRunSelect?.(run.runId);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`http://localhost:3000/runs/${run.runId}`, '_blank');
                            }}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in Dagster
                          </DropdownMenuItem>
                          {run.canTerminate && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTerminateTarget(run);
                              }}
                            >
                              <StopCircle className="mr-2 h-4 w-4" />
                              Terminate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Terminate Confirmation Dialog */}
      <AlertDialog open={!!terminateTarget} onOpenChange={() => setTerminateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Run?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate run "{terminateTarget?.runId.substring(0, 8)}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => terminateTarget && terminateMutation.mutate(terminateTarget.runId)}
            >
              {terminateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <StopCircle className="mr-2 h-4 w-4" />
              )}
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
