/**
 * Enhanced Dag Service for Dagster Integration
 * Combines NovaSight backend API with Dagster GraphQL for full orchestration control
 */

import { apiClient } from './apiClient';
import { dagsterClient, DagsterGraphQLClient } from './dagsterGraphQLClient';
import type {
  DagsterRun,
  DagsterRunStatus,
  DagsterAssetNode,
  DagsterSchedule,
  DagsterSensor,
  DagsterAssetGraph,
  DagsterRepository,
  DagsterRunsFilter,
} from '@/types/dagster';

// ============= NovaSight DAG Config Types =============

export interface DagConfig {
  id: string;
  dag_id: string;
  description: string;
  current_version: number;
  schedule_type: 'cron' | 'preset' | 'manual';
  schedule_cron?: string;
  schedule_preset?: string;
  timezone: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  deployed_at?: string;
  deployed_version?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TaskConfig {
  task_id: string;
  task_type: string;
  config: Record<string, unknown>;
  timeout_minutes: number;
  retries: number;
  retry_delay_minutes: number;
  trigger_rule: string;
  depends_on: string[];
  position_x: number;
  position_y: number;
}

export interface CreateDagRequest {
  dag_id: string;
  description?: string;
  schedule_type: 'cron' | 'preset' | 'manual';
  schedule_cron?: string;
  schedule_preset?: string;
  timezone?: string;
  start_date?: string;
  catchup?: boolean;
  max_active_runs?: number;
  default_retries?: number;
  default_retry_delay_minutes?: number;
  notification_emails?: string[];
  email_on_failure?: boolean;
  email_on_success?: boolean;
  tags?: string[];
  tasks: TaskConfig[];
}

// ============= Unified Run Type =============

export interface UnifiedRun {
  id: string;
  runId: string;
  jobName: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled' | 'pending';
  startTime: Date | null;
  endTime: Date | null;
  duration: number | null; // in seconds
  stepsSucceeded: number;
  stepsFailed: number;
  tags: Record<string, string>;
  canTerminate: boolean;
}

// ============= Service Class =============

class DagsterService {
  private baseUrl = '/api/v1/dags';
  private graphqlClient: DagsterGraphQLClient;

  constructor() {
    this.graphqlClient = dagsterClient;
  }

  /**
   * Configure the Dagster GraphQL endpoint
   */
  setDagsterUrl(url: string): void {
    this.graphqlClient.setBaseUrl(url);
  }

  // ============= NovaSight Backend API Methods =============

  async list(params?: { status?: string; search?: string }): Promise<DagConfig[]> {
    const response = await apiClient.get<{ dags: DagConfig[] }>(this.baseUrl, { params });
    return response.data.dags;
  }

  async get(dagId: string): Promise<DagConfig & { tasks: TaskConfig[] }> {
    const response = await apiClient.get(`${this.baseUrl}/${dagId}`);
    return response.data.dag;
  }

  async create(data: CreateDagRequest): Promise<DagConfig> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data.dag;
  }

  async update(dagId: string, data: Partial<CreateDagRequest>): Promise<DagConfig> {
    const response = await apiClient.put(`${this.baseUrl}/${dagId}`, data);
    return response.data.dag;
  }

  async delete(dagId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${dagId}`);
  }

  async validate(dagId: string): Promise<{ valid: boolean; errors: string[] }> {
    const response = await apiClient.post(`${this.baseUrl}/${dagId}/validate`);
    return response.data;
  }

  async deploy(dagId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/${dagId}/deploy`);
    return response.data;
  }

  async pause(dagId: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${dagId}/pause`);
  }

  async unpause(dagId: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${dagId}/unpause`);
  }

  // ============= Dagster GraphQL Methods =============

  /**
   * Get all repositories from Dagster
   */
  async getRepositories(): Promise<DagsterRepository[]> {
    return this.graphqlClient.getRepositories();
  }

  /**
   * Get runs from Dagster (with optional filtering)
   */
  async getRuns(filter?: DagsterRunsFilter, limit = 50): Promise<UnifiedRun[]> {
    const runs = await this.graphqlClient.getRuns(filter, limit);
    return runs.map(this.mapDagsterRunToUnified);
  }

  /**
   * Get runs for a specific job/pipeline
   */
  async getJobRuns(jobName: string, limit = 25): Promise<UnifiedRun[]> {
    const runs = await this.graphqlClient.getRuns({ pipelineName: jobName }, limit);
    return runs.map(this.mapDagsterRunToUnified);
  }

  /**
   * Get detailed information about a specific run
   */
  async getRunDetails(runId: string): Promise<DagsterRun | null> {
    return this.graphqlClient.getRunDetails(runId);
  }

  /**
   * Get logs for a specific run
   */
  async getRunLogs(runId: string, afterCursor?: string): Promise<{
    events: Array<{ timestamp: string; level: string; stepKey: string | null; message: string }>;
    cursor: string;
    hasMore: boolean;
  }> {
    return this.graphqlClient.getRunLogs(runId, afterCursor);
  }

  /**
   * Trigger a job/pipeline run via Dagster
   */
  async trigger(
    jobName: string,
    repositoryLocationName: string,
    repositoryName: string,
    config?: Record<string, unknown>,
    tags?: Array<{ key: string; value: string }>
  ): Promise<UnifiedRun> {
    const run = await this.graphqlClient.launchRun(
      jobName,
      repositoryLocationName,
      repositoryName,
      'default',
      config,
      tags
    );
    return this.mapDagsterRunToUnified(run);
  }

  /**
   * Terminate a running job
   */
  async terminateRun(runId: string): Promise<void> {
    await this.graphqlClient.terminateRun(runId);
  }

  // ============= Asset Methods =============

  /**
   * Get all assets from Dagster
   */
  async getAssets(): Promise<DagsterAssetNode[]> {
    return this.graphqlClient.getAssets();
  }

  /**
   * Get asset graph for visualization
   */
  async getAssetGraph(): Promise<DagsterAssetGraph> {
    return this.graphqlClient.getAssetGraph();
  }

  /**
   * Get detailed information about a specific asset
   */
  async getAssetDetails(assetKeyPath: string[]): Promise<DagsterAssetNode | null> {
    return this.graphqlClient.getAssetDetails({ path: assetKeyPath });
  }

  // ============= Schedule Methods =============

  /**
   * Get all schedules from Dagster
   */
  async getSchedules(): Promise<DagsterSchedule[]> {
    return this.graphqlClient.getAllSchedules();
  }

  /**
   * Start a schedule
   */
  async startSchedule(
    scheduleName: string,
    repositoryLocationName: string,
    repositoryName: string
  ): Promise<void> {
    await this.graphqlClient.startSchedule(scheduleName, repositoryLocationName, repositoryName);
  }

  /**
   * Stop a schedule
   */
  async stopSchedule(scheduleOriginId: string, scheduleSelectorId: string): Promise<void> {
    await this.graphqlClient.stopSchedule(scheduleOriginId, scheduleSelectorId);
  }

  // ============= Sensor Methods =============

  /**
   * Get all sensors from Dagster
   */
  async getSensors(): Promise<DagsterSensor[]> {
    return this.graphqlClient.getAllSensors();
  }

  /**
   * Start a sensor
   */
  async startSensor(
    sensorName: string,
    repositoryLocationName: string,
    repositoryName: string
  ): Promise<void> {
    await this.graphqlClient.startSensor(sensorName, repositoryLocationName, repositoryName);
  }

  /**
   * Stop a sensor
   */
  async stopSensor(jobOriginId: string, jobSelectorId: string): Promise<void> {
    await this.graphqlClient.stopSensor(jobOriginId, jobSelectorId);
  }

  // ============= Instance Status =============

  /**
   * Get Dagster instance health status
   */
  async getInstanceStatus(): Promise<{
    healthy: boolean;
    daemons: Array<{
      daemonType: string;
      required: boolean;
      healthy: boolean;
      lastHeartbeatTime: number | null;
    }>;
    runLauncher: string | null;
    runQueuingSupported: boolean;
  }> {
    return this.graphqlClient.getInstanceStatus();
  }

  // ============= Utility Methods =============

  private mapDagsterRunToUnified(run: DagsterRun): UnifiedRun {
    const statusMap: Record<DagsterRunStatus, UnifiedRun['status']> = {
      'QUEUED': 'queued',
      'NOT_STARTED': 'pending',
      'STARTING': 'running',
      'STARTED': 'running',
      'SUCCESS': 'success',
      'FAILURE': 'failed',
      'CANCELING': 'running',
      'CANCELED': 'canceled',
    };

    const startTime = run.startTime ? new Date(run.startTime * 1000) : null;
    const endTime = run.endTime ? new Date(run.endTime * 1000) : null;
    const duration = startTime && endTime 
      ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) 
      : null;

    const stats = run.stats && 'stepsSucceeded' in run.stats 
      ? run.stats as { stepsSucceeded: number; stepsFailed: number }
      : { stepsSucceeded: 0, stepsFailed: 0 };

    const tags: Record<string, string> = {};
    for (const tag of run.tags || []) {
      tags[tag.key] = tag.value;
    }

    return {
      id: run.id,
      runId: run.runId,
      jobName: run.pipelineName,
      status: statusMap[run.status] || 'pending',
      startTime,
      endTime,
      duration,
      stepsSucceeded: stats.stepsSucceeded,
      stepsFailed: stats.stepsFailed,
      tags,
      canTerminate: run.canTerminate,
    };
  }

  /**
   * Format run status for display
   */
  formatRunStatus(status: UnifiedRun['status']): {
    label: string;
    color: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
    isRunning: boolean;
  } {
    const statusMap: Record<UnifiedRun['status'], { label: string; color: 'green' | 'red' | 'yellow' | 'blue' | 'gray'; isRunning: boolean }> = {
      'queued': { label: 'Queued', color: 'yellow', isRunning: false },
      'pending': { label: 'Pending', color: 'gray', isRunning: false },
      'running': { label: 'Running', color: 'blue', isRunning: true },
      'success': { label: 'Success', color: 'green', isRunning: false },
      'failed': { label: 'Failed', color: 'red', isRunning: false },
      'canceled': { label: 'Canceled', color: 'gray', isRunning: false },
    };

    return statusMap[status];
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(seconds: number | null): string {
    if (seconds === null) return '-';
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  }
}

// Export singleton instance
export const dagsterService = new DagsterService();

// Keep backward compatibility with old dagService name
export const dagService = dagsterService;

// Export class for testing
export { DagsterService };
