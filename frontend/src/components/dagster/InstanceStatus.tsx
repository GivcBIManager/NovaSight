/**
 * Dagster Instance Status Component
 * Shows Dagster daemon health and instance information
 */

import { useQuery } from '@tanstack/react-query';
import { dagsterService } from '@/services/dagsterService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  RefreshCw,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Heart,
} from 'lucide-react';
import { getStatusClasses } from '@/lib/colors';

interface InstanceStatusProps {
  className?: string;
  compact?: boolean;
}

export function InstanceStatus({ className = '', compact = false }: InstanceStatusProps) {
  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dagster-instance-status'],
    queryFn: () => dagsterService.getInstanceStatus(),
    refetchInterval: 30000,
    retry: 1,
  });

  const formatLastHeartbeat = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking Dagster...</span>
      </div>
    );
  }

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Dagster Offline</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cannot connect to Dagster at localhost:3000</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {status?.healthy ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-green-600">Dagster Healthy</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-yellow-600">Dagster Degraded</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              {status?.daemons.map((daemon) => (
                <div key={daemon.daemonType} className="flex items-center justify-between gap-4 text-xs">
                  <span>{daemon.daemonType}</span>
                  {daemon.healthy ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Instance Status
        </CardTitle>
        <div className="flex items-center gap-2">
          {status?.healthy ? (
            <Badge variant="outline" className={`${getStatusClasses('healthy')} border-green-200`}>
              <CheckCircle className="mr-1 h-3 w-3" />
              Healthy
            </Badge>
          ) : (
            <Badge variant="outline" className={`${getStatusClasses('degraded')} border-yellow-200`}>
              <AlertTriangle className="mr-1 h-3 w-3" />
              Degraded
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Run Launcher Info */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Run Launcher</span>
            <Badge variant="secondary">{status?.runLauncher || 'Unknown'}</Badge>
          </div>

          {/* Run Queuing */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Run Queuing</span>
            <span className="text-sm">
              {status?.runQueuingSupported ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {/* Daemons */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Daemons
            </h4>
            <div className="space-y-2">
              {status?.daemons.map((daemon) => (
                <div
                  key={daemon.daemonType}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {daemon.healthy ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{daemon.daemonType}</span>
                    {daemon.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatLastHeartbeat(daemon.lastHeartbeatTime)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
