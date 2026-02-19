/**
 * Dagster Dashboard Page
 * Main page for Dagster orchestration management
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dagsterService } from '@/services/dagsterService';
import {
  AssetGraph,
  ScheduleList,
  SensorList,
  RunsList,
  InstanceStatus,
} from '@/components/dagster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ExternalLink,
  GitBranch,
  Calendar,
  Radio,
  Activity,
  Server,
  RefreshCw,
  Loader2,
  XCircle,
} from 'lucide-react';

export function DagsterDashboardPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedAssetKey, setSelectedAssetKey] = useState<string[] | null>(null);

  // Quick stats queries
  const { data: runs } = useQuery({
    queryKey: ['dagster-runs-stats'],
    queryFn: () => dagsterService.getRuns(undefined, 100),
    refetchInterval: 10000,
  });

  const { data: schedules } = useQuery({
    queryKey: ['dagster-schedules'],
    queryFn: () => dagsterService.getSchedules(),
    refetchInterval: 30000,
  });

  const { data: sensors } = useQuery({
    queryKey: ['dagster-sensors'],
    queryFn: () => dagsterService.getSensors(),
    refetchInterval: 30000,
  });

  const { data: assets } = useQuery({
    queryKey: ['dagster-assets'],
    queryFn: () => dagsterService.getAssets(),
    refetchInterval: 30000,
  });

  // Calculate stats
  const runningCount = runs?.filter((r) => r.status === 'running').length || 0;
  const queuedCount = runs?.filter((r) => r.status === 'queued').length || 0;
  const recentFailures = runs?.filter((r) => r.status === 'failed').length || 0;
  const activeSchedules = schedules?.filter((s) => s.scheduleState?.status === 'RUNNING').length || 0;
  const activeSensors = sensors?.filter((s) => s.sensorState?.status === 'RUNNING').length || 0;

  const handleOpenDagsterUI = () => {
    window.open('http://localhost:3000', '_blank');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dagster Orchestration</h1>
          <p className="text-muted-foreground">
            Manage data pipelines, assets, schedules, and sensors
          </p>
        </div>
        <div className="flex items-center gap-4">
          <InstanceStatus compact />
          <Button onClick={handleOpenDagsterUI}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Dagster UI
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Running</p>
                <p className="text-2xl font-bold text-blue-600">{runningCount}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queued</p>
                <p className="text-2xl font-bold text-yellow-600">{queuedCount}</p>
              </div>
              <Activity className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Failures</p>
                <p className="text-2xl font-bold text-red-600">{recentFailures}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-2xl font-bold">{assets?.length || 0}</p>
              </div>
              <GitBranch className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Schedules</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeSchedules}/{schedules?.length || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sensors</p>
                <p className="text-2xl font-bold text-purple-600">
                  {activeSensors}/{sensors?.length || 0}
                </p>
              </div>
              <Radio className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="runs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Runs
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="sensors" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Sensors
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Runs */}
            <div className="lg:col-span-2">
              <RunsList
                limit={10}
                onRunSelect={setSelectedRunId}
              />
            </div>

            {/* Instance Status */}
            <div className="space-y-4">
              <InstanceStatus />
              
              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleOpenDagsterUI}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Dagster UI
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open('http://localhost:3000/asset-groups', '_blank')}
                  >
                    <GitBranch className="mr-2 h-4 w-4" />
                    View Asset Catalog
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open('http://localhost:3000/runs', '_blank')}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    View All Runs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Asset Graph Preview */}
          <AssetGraph
            onAssetSelect={setSelectedAssetKey}
            selectedAssetKey={selectedAssetKey}
          />
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <AssetGraph
            onAssetSelect={setSelectedAssetKey}
            selectedAssetKey={selectedAssetKey}
            className="min-h-[600px]"
          />
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs">
          <RunsList
            limit={50}
            onRunSelect={setSelectedRunId}
          />
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules">
          <ScheduleList />
        </TabsContent>

        {/* Sensors Tab */}
        <TabsContent value="sensors">
          <SensorList />
        </TabsContent>
      </Tabs>

      {/* Run Details Sheet */}
      <RunDetailsSheet
        runId={selectedRunId}
        open={!!selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />

      {/* Asset Details Sheet */}
      <AssetDetailsSheet
        assetKey={selectedAssetKey}
        open={!!selectedAssetKey}
        onClose={() => setSelectedAssetKey(null)}
      />
    </div>
  );
}

// Run Details Sheet Component
function RunDetailsSheet({
  runId,
  open,
  onClose,
}: {
  runId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const {
    data: run,
    isLoading,
  } = useQuery({
    queryKey: ['dagster-run-details', runId],
    queryFn: () => (runId ? dagsterService.getRunDetails(runId) : null),
    enabled: !!runId,
  });

  const {
    data: logs,
  } = useQuery({
    queryKey: ['dagster-run-logs', runId],
    queryFn: () => (runId ? dagsterService.getRunLogs(runId) : null),
    enabled: !!runId,
    refetchInterval: run?.status === 'STARTED' ? 2000 : false,
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Run Details
            {runId && (
              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                {runId.substring(0, 8)}
              </code>
            )}
          </SheetTitle>
          <SheetDescription>
            {run ? `Job: ${run.pipelineName}` : 'Loading...'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : run ? (
          <div className="mt-4 space-y-4">
            {/* Run Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={
                    run.status === 'SUCCESS'
                      ? 'bg-green-100 text-green-800'
                      : run.status === 'FAILURE'
                      ? 'bg-red-100 text-red-800'
                      : run.status === 'STARTED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }
                >
                  {run.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="font-medium">{run.mode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="text-sm">
                  {run.startTime
                    ? new Date(run.startTime * 1000).toLocaleString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ended</p>
                <p className="text-sm">
                  {run.endTime
                    ? new Date(run.endTime * 1000).toLocaleString()
                    : '-'}
                </p>
              </div>
            </div>

            {/* Tags */}
            {run.tags && run.tags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {run.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag.key}: {tag.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Logs */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Logs</p>
              <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-2">
                {logs?.events.length ? (
                  <div className="space-y-1 font-mono text-xs">
                    {logs.events.map((event, idx) => (
                      <div
                        key={idx}
                        className={`py-0.5 ${
                          event.level === 'ERROR'
                            ? 'text-red-600'
                            : event.level === 'WARNING'
                            ? 'text-yellow-600'
                            : 'text-foreground'
                        }`}
                      >
                        <span className="text-muted-foreground">
                          [{new Date(event.timestamp).toLocaleTimeString()}]
                        </span>{' '}
                        {event.stepKey && (
                          <span className="text-blue-600">[{event.stepKey}]</span>
                        )}{' '}
                        {event.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No logs available
                  </p>
                )}
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`http://localhost:3000/runs/${runId}`, '_blank')
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Dagster
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Run not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Asset Details Sheet Component
function AssetDetailsSheet({
  assetKey,
  open,
  onClose,
}: {
  assetKey: string[] | null;
  open: boolean;
  onClose: () => void;
}) {
  const {
    data: asset,
    isLoading,
  } = useQuery({
    queryKey: ['dagster-asset-details', assetKey],
    queryFn: () => (assetKey ? dagsterService.getAssetDetails(assetKey) : null),
    enabled: !!assetKey,
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Asset Details</SheetTitle>
          <SheetDescription>
            {assetKey?.join(' → ') || 'Loading...'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : asset ? (
          <div className="mt-4 space-y-4">
            {/* Asset Info */}
            <div className="space-y-3">
              {asset.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{asset.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Group</p>
                  <Badge variant="secondary">{asset.groupName || 'default'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compute Kind</p>
                  <Badge variant="outline">{asset.computeKind || 'N/A'}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="text-sm">
                    {asset.isSource ? 'Source Asset' : 'Computed Asset'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Partitioned</p>
                  <p className="text-sm">{asset.isPartitioned ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Last Materialization */}
              {asset.latestMaterialization && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Materialized</p>
                  <p className="text-sm">
                    {new Date(asset.latestMaterialization.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Dependencies */}
            {asset.dependencyKeys && asset.dependencyKeys.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Dependencies ({asset.dependencyKeys.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {asset.dependencyKeys.map((key, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {key.path.join(' → ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dependents */}
            {asset.dependedByKeys && asset.dependedByKeys.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Dependents ({asset.dependedByKeys.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {asset.dependedByKeys.map((key, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {key.path.join(' → ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  const keyPath = assetKey?.join('/') || '';
                  window.open(
                    `http://localhost:3000/assets/${encodeURIComponent(keyPath)}`,
                    '_blank'
                  );
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Dagster
              </Button>
              {asset.hasMaterializePermission && !asset.isSource && (
                <Button>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Materialize
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Asset not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default DagsterDashboardPage;
