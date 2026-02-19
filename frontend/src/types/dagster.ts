/**
 * Dagster GraphQL API Types
 * Types for interacting with Dagster's GraphQL endpoint
 */

// ============= Common Types =============

export type DagsterRunStatus =
  | 'QUEUED'
  | 'NOT_STARTED'
  | 'STARTING'
  | 'STARTED'
  | 'SUCCESS'
  | 'FAILURE'
  | 'CANCELING'
  | 'CANCELED';

export type DagsterInstigatorStatus = 'RUNNING' | 'STOPPED';

export type DagsterAssetCheckEvaluationTargetType = 'UNVERSIONED' | 'LATEST_MATERIALIZATION';

export interface DagsterRepositoryLocation {
  name: string;
  isReloadable: boolean;
  repositories: DagsterRepository[];
  loadStatus: 'LOADED' | 'LOADING' | 'NOT_LOADED';
}

export interface DagsterRepository {
  id: string;
  name: string;
  location: {
    name: string;
  };
  pipelines: DagsterPipeline[];
  schedules: DagsterSchedule[];
  sensors: DagsterSensor[];
  assetGroups: DagsterAssetGroup[];
}

// ============= Pipeline/Job Types =============

export interface DagsterPipeline {
  id: string;
  name: string;
  description: string | null;
  isJob: boolean;
  runs: DagsterRun[];
  schedules: DagsterSchedule[];
  modes: DagsterMode[];
  tags: DagsterTag[];
}

export interface DagsterMode {
  id: string;
  name: string;
  description: string | null;
  resources: DagsterResource[];
}

export interface DagsterResource {
  name: string;
  description: string | null;
  configField: DagsterConfigField | null;
}

export interface DagsterConfigField {
  name: string;
  isRequired: boolean;
  configTypeKey: string;
}

export interface DagsterTag {
  key: string;
  value: string;
}

// ============= Run Types =============

export interface DagsterRun {
  id: string;
  runId: string;
  status: DagsterRunStatus;
  mode: string;
  pipelineName: string;
  pipelineSnapshotId: string | null;
  startTime: number | null;
  endTime: number | null;
  updateTime: number | null;
  stats: DagsterRunStats | DagsterRunStatsSnapshot;
  tags: DagsterTag[];
  stepKeysToExecute: string[] | null;
  rootRunId: string | null;
  parentRunId: string | null;
  canTerminate: boolean;
  hasReExecutePermission: boolean;
  hasTerminatePermission: boolean;
  hasDeletePermission: boolean;
}

export interface DagsterRunStats {
  __typename: 'RunStatsSnapshot';
  stepsSucceeded: number;
  stepsFailed: number;
  materializations: number;
  expectations: number;
  startTime: number | null;
  endTime: number | null;
}

export interface DagsterRunStatsSnapshot {
  __typename: 'PythonError';
  message: string;
  stack: string[];
}

export interface DagsterRunEvent {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  stepKey: string | null;
  message: string;
  eventType: string;
}

// ============= Asset Types =============

export interface DagsterAssetGroup {
  groupName: string;
  assets: DagsterAssetNode[];
}

export interface DagsterAssetNode {
  id: string;
  assetKey: DagsterAssetKey;
  description: string | null;
  groupName: string;
  opNames: string[];
  graphName: string | null;
  isSource: boolean;
  isObservable: boolean;
  isPartitioned: boolean;
  computeKind: string | null;
  hasMaterializePermission: boolean;
  dependencyKeys: DagsterAssetKey[];
  dependedByKeys: DagsterAssetKey[];
  latestMaterialization: DagsterMaterializationEvent | null;
  latestRun: DagsterRun | null;
  freshnessPolicy: DagsterFreshnessPolicy | null;
  freshnessInfo: DagsterAssetFreshnessInfo | null;
  assetMaterializationUsedData: DagsterMaterializationUpstreamData[];
}

export interface DagsterAssetKey {
  path: string[];
}

export interface DagsterMaterializationEvent {
  timestamp: string;
  runId: string;
  assetKey: DagsterAssetKey;
  assetLineage: DagsterAssetLineageInfo[];
  metadataEntries: DagsterMetadataEntry[];
}

export interface DagsterAssetLineageInfo {
  assetKey: DagsterAssetKey;
  partitions: string[];
}

export interface DagsterMetadataEntry {
  __typename: string;
  label: string;
  description: string | null;
  // Different metadata types have different fields
  text?: string;
  url?: string;
  path?: string;
  intValue?: number;
  floatValue?: number;
  jsonString?: string;
  mdStr?: string;
  timestamp?: number;
}

export interface DagsterFreshnessPolicy {
  cronSchedule: string | null;
  cronScheduleTimezone: string | null;
  maximumLagMinutes: number;
  lastEvaluationTimestamp: string | null;
}

export interface DagsterAssetFreshnessInfo {
  currentLagMinutes: number | null;
  currentMinutesLate: number | null;
  latestMaterializationMinutesLate: number | null;
}

export interface DagsterMaterializationUpstreamData {
  assetKey: DagsterAssetKey;
  downstreamAssetKey: DagsterAssetKey;
  timestamp: string;
}

// ============= Schedule Types =============

export interface DagsterSchedule {
  id: string;
  name: string;
  cronSchedule: string;
  pipelineName: string;
  solidSelection: string[] | null;
  mode: string;
  description: string | null;
  defaultStatus: DagsterInstigatorStatus;
  scheduleState: DagsterInstigatorState | null;
  futureTicks: DagsterDryRunInstigatorTick[];
  partitionSet: DagsterPartitionSet | null;
  executionTimezone: string | null;
}

export interface DagsterInstigatorState {
  id: string;
  name: string;
  instigationType: 'SCHEDULE' | 'SENSOR';
  status: DagsterInstigatorStatus;
  runs: DagsterRun[];
  ticks: DagsterInstigatorTick[];
  runningCount: number;
}

export interface DagsterInstigatorTick {
  id: string;
  status: 'STARTED' | 'SKIPPED' | 'SUCCESS' | 'FAILURE';
  timestamp: number;
  runIds: string[];
  error: DagsterPythonError | null;
  skipReason: string | null;
  runKeys: string[];
  logKey: string[] | null;
}

export interface DagsterDryRunInstigatorTick {
  timestamp: number;
}

export interface DagsterPythonError {
  message: string;
  stack: string[];
  causes: DagsterPythonError[];
}

// ============= Sensor Types =============

export interface DagsterSensor {
  id: string;
  name: string;
  description: string | null;
  pipelineName: string | null;
  targets: DagsterTarget[];
  defaultStatus: DagsterInstigatorStatus;
  sensorState: DagsterInstigatorState | null;
  sensorType: 'STANDARD' | 'RUN_STATUS' | 'FRESHNESS_POLICY' | 'ASSET' | 'MULTI_ASSET' | 'AUTO_MATERIALIZE';
  minIntervalSeconds: number;
  nextTick: DagsterDryRunInstigatorTick | null;
}

export interface DagsterTarget {
  pipelineName: string;
  mode: string;
  solidSelection: string[] | null;
}

// ============= Partition Types =============

export interface DagsterPartitionSet {
  id: string;
  name: string;
  pipelineName: string;
  mode: string;
  solidSelection: string[] | null;
  partitionStatusesOrError: DagsterPartitionStatuses | DagsterPythonError;
}

export interface DagsterPartitionStatuses {
  results: DagsterPartitionStatus[];
}

export interface DagsterPartitionStatus {
  id: string;
  partitionName: string;
  runStatus: DagsterRunStatus | null;
}

// ============= Backfill Types =============

export interface DagsterPartitionBackfill {
  id: string;
  status: 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  partitionNames: string[];
  numPartitions: number;
  timestamp: number;
  partitionSetName: string | null;
  assetBackfillData: DagsterAssetBackfillData | null;
  numRequested: number;
  numInProgress: number;
  numCompleted: number;
  numFailed: number;
  isValidSerialization: boolean;
  error: DagsterPythonError | null;
}

export interface DagsterAssetBackfillData {
  rootAssetTargetedRanges: DagsterPartitionKeyRange[];
  rootAssetTargetedPartitions: string[] | null;
}

export interface DagsterPartitionKeyRange {
  start: string;
  end: string;
}

// ============= GraphQL Response Types =============

export interface DagsterGraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: Record<string, unknown>;
}

export interface DagsterGraphQLResponse<T> {
  data?: T;
  errors?: DagsterGraphQLError[];
}

// Query result types
export interface RepositoriesQueryResult {
  repositoriesOrError: {
    __typename: 'RepositoryConnection' | 'PythonError';
    nodes?: DagsterRepository[];
    message?: string;
    stack?: string[];
  };
}

export interface RunsQueryResult {
  runsOrError: {
    __typename: 'Runs' | 'InvalidPipelineRunsFilterError' | 'PythonError';
    results?: DagsterRun[];
    message?: string;
  };
}

export interface AssetsQueryResult {
  assetsOrError: {
    __typename: 'AssetConnection' | 'PythonError';
    nodes?: DagsterAssetNode[];
    message?: string;
  };
}

export interface SchedulesQueryResult {
  schedulesOrError: {
    __typename: 'Schedules' | 'RepositoryNotFoundError' | 'PythonError';
    results?: DagsterSchedule[];
    message?: string;
  };
}

export interface SensorsQueryResult {
  sensorsOrError: {
    __typename: 'Sensors' | 'RepositoryNotFoundError' | 'PythonError';
    results?: DagsterSensor[];
    message?: string;
  };
}

// Mutation result types
export interface LaunchRunMutationResult {
  launchRun: {
    __typename: 'LaunchRunSuccess' | 'InvalidStepError' | 'InvalidOutputError' | 'RunConfigValidationInvalid' | 'PipelineNotFoundError' | 'RunConflict' | 'UnauthorizedError' | 'PythonError' | 'ConflictingExecutionParamsError' | 'NoModeProvidedError';
    run?: DagsterRun;
    message?: string;
  };
}

export interface TerminateRunMutationResult {
  terminateRun: {
    __typename: 'TerminateRunSuccess' | 'TerminateRunFailure' | 'RunNotFoundError' | 'UnauthorizedError' | 'PythonError';
    run?: DagsterRun;
    message?: string;
  };
}

export interface StartScheduleMutationResult {
  startSchedule: {
    __typename: 'ScheduleStateResult' | 'UnauthorizedError' | 'PythonError';
    scheduleState?: DagsterInstigatorState;
    message?: string;
  };
}

export interface StopScheduleMutationResult {
  stopRunningSchedule: {
    __typename: 'ScheduleStateResult' | 'UnauthorizedError' | 'PythonError';
    scheduleState?: DagsterInstigatorState;
    message?: string;
  };
}

export interface StartSensorMutationResult {
  startSensor: {
    __typename: 'Sensor' | 'SensorNotFoundError' | 'UnauthorizedError' | 'PythonError';
    sensorState?: DagsterInstigatorState;
    message?: string;
  };
}

export interface StopSensorMutationResult {
  stopSensor: {
    __typename: 'StopSensorMutationResult' | 'UnauthorizedError' | 'PythonError';
    instigationState?: DagsterInstigatorState;
    message?: string;
  };
}

export interface MaterializeAssetsMutationResult {
  launchPipelineExecution: {
    __typename: 'LaunchRunSuccess' | 'InvalidStepError' | 'InvalidOutputError' | 'RunConfigValidationInvalid' | 'PipelineNotFoundError' | 'RunConflict' | 'UnauthorizedError' | 'PythonError';
    run?: DagsterRun;
    message?: string;
  };
}

// ============= UI Helper Types =============

export interface DagsterAssetGraphNode {
  id: string;
  assetKey: DagsterAssetKey;
  label: string;
  description: string | null;
  status: 'fresh' | 'stale' | 'materializing' | 'failed' | 'never_materialized';
  lastMaterialization: string | null;
  computeKind: string | null;
  isSource: boolean;
}

export interface DagsterAssetGraphEdge {
  source: string;
  target: string;
}

export interface DagsterAssetGraph {
  nodes: DagsterAssetGraphNode[];
  edges: DagsterAssetGraphEdge[];
}

// Run filter options
export interface DagsterRunsFilter {
  pipelineName?: string;
  statuses?: DagsterRunStatus[];
  tags?: DagsterTag[];
  snapshotId?: string;
  updatedAfter?: number;
  updatedBefore?: number;
  createdBefore?: number;
  mode?: string;
}

// Asset filter options
export interface DagsterAssetsFilter {
  groups?: string[];
  computeKinds?: string[];
  prefix?: string[];
}
