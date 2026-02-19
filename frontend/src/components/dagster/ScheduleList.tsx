/**
 * Dagster Schedule List Component
 * Displays and manages Dagster schedules
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dagsterService } from '@/services/dagsterService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  RefreshCw,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { DagsterSchedule } from '@/types/dagster';

interface ScheduleListProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
}

export function ScheduleList({ className = '', maxItems, showHeader = true }: ScheduleListProps) {
  const queryClient = useQueryClient();

  const {
    data: schedules,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dagster-schedules'],
    queryFn: () => dagsterService.getSchedules(),
    refetchInterval: 30000,
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ schedule, enable }: { schedule: DagsterSchedule; enable: boolean }) => {
      // For now, we'll need the repository info - this would come from the schedule state
      // In a real implementation, you'd extract this from the schedule's ID or state
      const [locationName, repoName] = schedule.id.split(':');
      
      if (enable) {
        await dagsterService.startSchedule(schedule.name, locationName, repoName);
      } else {
        // Stop requires origin and selector IDs which come from the schedule state
        await dagsterService.stopSchedule(
          schedule.scheduleState?.id || schedule.id,
          schedule.id
        );
      }
    },
    onSuccess: (_, { schedule, enable }) => {
      queryClient.invalidateQueries({ queryKey: ['dagster-schedules'] });
      toast({
        title: enable ? 'Schedule Started' : 'Schedule Stopped',
        description: `"${schedule.name}" has been ${enable ? 'started' : 'stopped'}.`,
      });
    },
    onError: (error, { schedule }) => {
      console.error('Failed to toggle schedule:', error);
      toast({
        title: 'Error',
        description: `Failed to toggle schedule "${schedule.name}"`,
        variant: 'destructive',
      });
    },
  });

  const formatCron = (cron: string): string => {
    // Simple cron to human-readable conversion
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every hour';
    }
    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Daily at midnight';
    }
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1') {
      return `Weekly on Monday at ${hour}:${minute.padStart(2, '0')}`;
    }

    return cron;
  };

  const formatNextTick = (timestamp: number | undefined): string => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
  };

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
          <p className="text-sm text-muted-foreground">Failed to load schedules</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const displaySchedules = maxItems ? schedules?.slice(0, maxItems) : schedules;

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedules
            {schedules && (
              <Badge variant="secondary">{schedules.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      )}
      <CardContent>
        {!displaySchedules || displaySchedules.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No schedules configured</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Cron</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead className="text-center">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySchedules.map((schedule) => {
                const isRunning = schedule.scheduleState?.status === 'RUNNING';
                const futureTick = schedule.futureTicks?.[0];

                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{schedule.name}</span>
                        {schedule.description && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{schedule.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{schedule.pipelineName}</Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">{formatCron(schedule.cronSchedule)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <code className="text-xs">{schedule.cronSchedule}</code>
                            {schedule.executionTimezone && (
                              <p className="text-xs mt-1">Timezone: {schedule.executionTimezone}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatNextTick(futureTick?.timestamp)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={isRunning}
                        onCheckedChange={(checked) =>
                          toggleScheduleMutation.mutate({ schedule, enable: checked })
                        }
                        disabled={toggleScheduleMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
