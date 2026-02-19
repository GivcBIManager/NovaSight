/**
 * Dagster Sensor List Component
 * Displays and manages Dagster sensors
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
  Radio,
  AlertTriangle,
  Info,
  Zap,
  Activity,
  Database,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { DagsterSensor } from '@/types/dagster';

interface SensorListProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
}

export function SensorList({ className = '', maxItems, showHeader = true }: SensorListProps) {
  const queryClient = useQueryClient();

  const {
    data: sensors,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dagster-sensors'],
    queryFn: () => dagsterService.getSensors(),
    refetchInterval: 30000,
  });

  const toggleSensorMutation = useMutation({
    mutationFn: async ({ sensor, enable }: { sensor: DagsterSensor; enable: boolean }) => {
      const [locationName, repoName] = sensor.id.split(':');
      
      if (enable) {
        await dagsterService.startSensor(sensor.name, locationName, repoName);
      } else {
        await dagsterService.stopSensor(
          sensor.sensorState?.id || sensor.id,
          sensor.id
        );
      }
    },
    onSuccess: (_, { sensor, enable }) => {
      queryClient.invalidateQueries({ queryKey: ['dagster-sensors'] });
      toast({
        title: enable ? 'Sensor Started' : 'Sensor Stopped',
        description: `"${sensor.name}" has been ${enable ? 'started' : 'stopped'}.`,
      });
    },
    onError: (error, { sensor }) => {
      console.error('Failed to toggle sensor:', error);
      toast({
        title: 'Error',
        description: `Failed to toggle sensor "${sensor.name}"`,
        variant: 'destructive',
      });
    },
  });

  const getSensorTypeIcon = (sensorType: DagsterSensor['sensorType']) => {
    switch (sensorType) {
      case 'ASSET':
      case 'MULTI_ASSET':
        return <Database className="h-4 w-4" />;
      case 'RUN_STATUS':
        return <Activity className="h-4 w-4" />;
      case 'FRESHNESS_POLICY':
        return <Zap className="h-4 w-4" />;
      default:
        return <Radio className="h-4 w-4" />;
    }
  };

  const getSensorTypeBadge = (sensorType: DagsterSensor['sensorType']) => {
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      'STANDARD': { label: 'Standard', variant: 'default' },
      'ASSET': { label: 'Asset', variant: 'secondary' },
      'MULTI_ASSET': { label: 'Multi-Asset', variant: 'secondary' },
      'RUN_STATUS': { label: 'Run Status', variant: 'outline' },
      'FRESHNESS_POLICY': { label: 'Freshness', variant: 'outline' },
      'AUTO_MATERIALIZE': { label: 'Auto-Materialize', variant: 'secondary' },
    };

    const config = typeMap[sensorType] || { label: sensorType, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatInterval = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
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
          <p className="text-sm text-muted-foreground">Failed to load sensors</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const displaySensors = maxItems ? sensors?.slice(0, maxItems) : sensors;

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Sensors
            {sensors && (
              <Badge variant="secondary">{sensors.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      )}
      <CardContent>
        {!displaySensors || displaySensors.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <Radio className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No sensors configured</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sensor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Next Tick</TableHead>
                <TableHead className="text-center">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySensors.map((sensor) => {
                const isRunning = sensor.sensorState?.status === 'RUNNING';

                return (
                  <TableRow key={sensor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSensorTypeIcon(sensor.sensorType)}
                        <span className="font-medium">{sensor.name}</span>
                        {sensor.description && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{sensor.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSensorTypeBadge(sensor.sensorType)}
                    </TableCell>
                    <TableCell>
                      {sensor.targets.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {sensor.targets.slice(0, 2).map((target, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {target.pipelineName}
                            </Badge>
                          ))}
                          {sensor.targets.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{sensor.targets.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatInterval(sensor.minIntervalSeconds)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatNextTick(sensor.nextTick?.timestamp)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={isRunning}
                        onCheckedChange={(checked) =>
                          toggleSensorMutation.mutate({ sensor, enable: checked })
                        }
                        disabled={toggleSensorMutation.isPending}
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
