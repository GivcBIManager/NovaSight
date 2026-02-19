"""
NovaSight Orchestration Domain — Dagster Client
=================================================

GraphQL client for Dagster API.
Replaces AirflowClient with equivalent Dagster functionality.

Canonical location: ``app.domains.orchestration.infrastructure.dagster_client``
"""

import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from flask import current_app
import logging

logger = logging.getLogger(__name__)


@dataclass
class JobRun:
    """Represents a Dagster job run (equivalent to Airflow DagRun)."""
    job_name: str
    run_id: str
    status: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    
    @property
    def state(self) -> str:
        """Map to Airflow-compatible states for frontend compatibility."""
        state_map = {
            "SUCCESS": "success",
            "FAILURE": "failed",
            "STARTED": "running",
            "QUEUED": "queued",
            "CANCELED": "cancelled",
            "CANCELING": "cancelling",
            "NOT_STARTED": "queued",
        }
        return state_map.get(self.status, self.status.lower())


@dataclass
class AssetMaterialization:
    """Represents a Dagster asset materialization (equivalent to TaskInstance)."""
    asset_key: str
    status: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    run_id: str
    
    @property
    def task_id(self) -> str:
        """Return asset key as task_id for frontend compatibility."""
        return self.asset_key
    
    @property
    def state(self) -> str:
        state_map = {
            "MATERIALIZED": "success",
            "FAILED": "failed",
            "IN_PROGRESS": "running",
            "PENDING": "queued",
        }
        return state_map.get(self.status, self.status.lower())


class DagsterClient:
    """
    Client for Dagster GraphQL API.
    
    Provides same interface as AirflowClient for seamless migration.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        tenant_id: Optional[str] = None,
        use_infrastructure_config: bool = True,
    ):
        self._host = host
        self._port = port
        self._tenant_id = tenant_id
        self._use_infrastructure_config = use_infrastructure_config
        self._client = None
        self._config_loaded = False
        self._loaded_settings: Dict[str, Any] = {}

    def _load_infrastructure_config(self):
        """Load settings from infrastructure config service."""
        if self._config_loaded or not self._use_infrastructure_config:
            return
        try:
            from app.services.infrastructure_config_service import InfrastructureConfigService
            config_service = InfrastructureConfigService()
            self._loaded_settings = config_service.get_effective_settings("dagster", self._tenant_id)
            self._config_loaded = True
        except Exception as e:
            logger.debug(f"Could not load infrastructure config: {e}")
            self._config_loaded = True

    @property
    def graphql_url(self) -> str:
        self._load_infrastructure_config()
        host = (
            self._host
            or self._loaded_settings.get("host")
            or current_app.config.get("DAGSTER_HOST", "localhost")
        )
        port = (
            self._port
            or self._loaded_settings.get("port")
            or current_app.config.get("DAGSTER_PORT", 3000)
        )
        return f"http://{host}:{port}/graphql"

    @property
    def client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(timeout=30.0)
        return self._client

    def _execute_query(self, query: str, variables: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute GraphQL query."""
        response = self.client.post(
            self.graphql_url,
            json={"query": query, "variables": variables or {}},
        )
        response.raise_for_status()
        result = response.json()
        
        if "errors" in result:
            raise Exception(f"GraphQL errors: {result['errors']}")
        
        return result.get("data", {})

    # -------------------------------------------------------------------------
    # Job/Pipeline Management (replaces DAG management)
    # -------------------------------------------------------------------------

    def list_jobs(self, repository_name: str = "novasight") -> List[Dict[str, Any]]:
        """List all jobs (equivalent to list_dags)."""
        query = """
        query ListJobs($repositorySelector: RepositorySelector!) {
            repositoryOrError(repositorySelector: $repositorySelector) {
                ... on Repository {
                    jobs {
                        name
                        description
                        isJob
                    }
                }
            }
        }
        """
        variables = {
            "repositorySelector": {
                "repositoryName": repository_name,
                "repositoryLocationName": repository_name,
            }
        }
        data = self._execute_query(query, variables)
        repo = data.get("repositoryOrError", {})
        return repo.get("jobs", [])

    def get_job(self, job_name: str, repository_name: str = "novasight") -> Optional[Dict[str, Any]]:
        """Get job details (equivalent to get_dag)."""
        query = """
        query GetJob($selector: PipelineSelector!) {
            pipelineOrError(params: $selector) {
                ... on Pipeline {
                    name
                    description
                    solidHandles {
                        handleID
                        solid {
                            name
                            definition {
                                description
                            }
                        }
                    }
                }
            }
        }
        """
        variables = {
            "selector": {
                "pipelineName": job_name,
                "repositoryName": repository_name,
                "repositoryLocationName": repository_name,
            }
        }
        data = self._execute_query(query, variables)
        return data.get("pipelineOrError")

    def trigger_job(
        self,
        job_name: str,
        run_config: Dict[str, Any] = None,
        repository_name: str = "novasight",
    ) -> Dict[str, Any]:
        """Trigger a job run (equivalent to trigger_dag_run)."""
        query = """
        mutation LaunchRun($executionParams: ExecutionParams!) {
            launchRun(executionParams: $executionParams) {
                ... on LaunchRunSuccess {
                    run {
                        runId
                        status
                    }
                }
                ... on PythonError {
                    message
                    stack
                }
                ... on InvalidSubsetError {
                    message
                }
                ... on PipelineNotFoundError {
                    message
                }
            }
        }
        """
        variables = {
            "executionParams": {
                "selector": {
                    "pipelineName": job_name,
                    "repositoryName": repository_name,
                    "repositoryLocationName": repository_name,
                },
                "runConfigData": run_config or {},
            }
        }
        data = self._execute_query(query, variables)
        result = data.get("launchRun", {})
        
        if "run" in result:
            return {
                "success": True,
                "run_id": result["run"]["runId"],
                "status": result["run"]["status"],
            }
        else:
            error = result.get("message") or str(result.get("errors", []))
            return {"success": False, "error": error}

    def get_run_status(self, run_id: str) -> Optional[str]:
        """Get run status."""
        query = """
        query GetRunStatus($runId: ID!) {
            runOrError(runId: $runId) {
                ... on Run {
                    status
                }
            }
        }
        """
        data = self._execute_query(query, {"runId": run_id})
        run = data.get("runOrError", {})
        return run.get("status")

    def get_job_runs(
        self,
        job_name: str,
        limit: int = 25,
        repository_name: str = "novasight",
    ) -> List[JobRun]:
        """Get recent runs for a job (equivalent to get_dag_runs)."""
        query = """
        query GetJobRuns($selector: PipelineSelector!, $limit: Int!) {
            pipelineOrError(params: $selector) {
                ... on Pipeline {
                    runs(limit: $limit) {
                        runId
                        status
                        startTime
                        endTime
                    }
                }
            }
        }
        """
        variables = {
            "selector": {
                "pipelineName": job_name,
                "repositoryName": repository_name,
                "repositoryLocationName": repository_name,
            },
            "limit": limit,
        }
        data = self._execute_query(query, variables)
        pipeline = data.get("pipelineOrError", {})
        runs = pipeline.get("runs", [])
        
        return [
            JobRun(
                job_name=job_name,
                run_id=r.get("runId"),
                status=r.get("status"),
                start_time=datetime.fromtimestamp(float(r["startTime"])) if r.get("startTime") else None,
                end_time=datetime.fromtimestamp(float(r["endTime"])) if r.get("endTime") else None,
            )
            for r in runs
        ]

    def get_run_details(self, run_id: str) -> Dict[str, Any]:
        """Get detailed run information including asset materializations."""
        query = """
        query GetRunDetails($runId: ID!) {
            runOrError(runId: $runId) {
                ... on Run {
                    runId
                    status
                    startTime
                    endTime
                    pipelineName
                    stepStats {
                        stepKey
                        status
                        startTime
                        endTime
                    }
                    assetMaterializations {
                        assetKey {
                            path
                        }
                        timestamp
                    }
                }
            }
        }
        """
        data = self._execute_query(query, {"runId": run_id})
        return data.get("runOrError", {})

    def get_run_logs(self, run_id: str, step_key: str = None) -> str:
        """Get logs for a run (equivalent to get_task_logs)."""
        query = """
        query GetRunLogs($runId: ID!) {
            logsForRun(runId: $runId) {
                ... on EventConnection {
                    events {
                        ... on MessageEvent {
                            message
                            timestamp
                            stepKey
                        }
                    }
                }
            }
        }
        """
        data = self._execute_query(query, {"runId": run_id})
        events = data.get("logsForRun", {}).get("events", [])
        
        # Filter by step if provided
        if step_key:
            events = [e for e in events if e.get("stepKey") == step_key]
        
        # Format logs
        log_lines = []
        for event in events:
            if "message" in event:
                timestamp = event.get("timestamp", "")
                step = event.get("stepKey", "")
                message = event.get("message", "")
                log_lines.append(f"[{timestamp}] [{step}] {message}")
        
        return "\n".join(log_lines)

    # -------------------------------------------------------------------------
    # Schedule Management (replaces pause/unpause)
    # -------------------------------------------------------------------------

    def get_schedule_state(self, schedule_name: str, repository_name: str = "novasight") -> str:
        """Get schedule state (RUNNING, STOPPED)."""
        query = """
        query GetScheduleState($selector: ScheduleSelector!) {
            scheduleOrError(scheduleSelector: $selector) {
                ... on Schedule {
                    scheduleState {
                        status
                    }
                }
            }
        }
        """
        variables = {
            "selector": {
                "scheduleName": schedule_name,
                "repositoryName": repository_name,
                "repositoryLocationName": repository_name,
            }
        }
        data = self._execute_query(query, variables)
        schedule = data.get("scheduleOrError", {})
        return schedule.get("scheduleState", {}).get("status", "STOPPED")

    def start_schedule(self, schedule_name: str, repository_name: str = "novasight") -> Dict[str, Any]:
        """Start a schedule (equivalent to unpause_dag)."""
        query = """
        mutation StartSchedule($selector: ScheduleSelector!) {
            startSchedule(scheduleSelector: $selector) {
                ... on ScheduleStateResult {
                    scheduleState {
                        status
                    }
                }
                ... on PythonError {
                    message
                }
            }
        }
        """
        variables = {
            "selector": {
                "scheduleName": schedule_name,
                "repositoryName": repository_name,
                "repositoryLocationName": repository_name,
            }
        }
        data = self._execute_query(query, variables)
        result = data.get("startSchedule", {})
        
        if "scheduleState" in result:
            return {"success": True, "status": result["scheduleState"]["status"]}
        else:
            return {"success": False, "error": result.get("message", "Unknown error")}

    def stop_schedule(self, schedule_name: str, repository_name: str = "novasight") -> Dict[str, Any]:
        """Stop a schedule (equivalent to pause_dag)."""
        query = """
        mutation StopSchedule($selector: ScheduleSelector!) {
            stopRunningSchedule(scheduleSelector: $selector) {
                ... on ScheduleStateResult {
                    scheduleState {
                        status
                    }
                }
                ... on PythonError {
                    message
                }
            }
        }
        """
        variables = {
            "selector": {
                "scheduleName": schedule_name,
                "repositoryName": repository_name,
                "repositoryLocationName": repository_name,
            }
        }
        data = self._execute_query(query, variables)
        result = data.get("stopRunningSchedule", {})
        
        if "scheduleState" in result:
            return {"success": True, "status": result["scheduleState"]["status"]}
        else:
            return {"success": False, "error": result.get("message", "Unknown error")}

    def reload_code_location(self, location_name: str = "novasight") -> Dict[str, Any]:
        """Reload code location to pick up new definitions."""
        query = """
        mutation ReloadCodeLocation($repositoryLocationName: String!) {
            reloadRepositoryLocation(repositoryLocationName: $repositoryLocationName) {
                ... on WorkspaceLocationEntry {
                    loadStatus
                }
                ... on ReloadNotSupported {
                    message
                }
                ... on RepositoryLocationNotFound {
                    message
                }
                ... on PythonError {
                    message
                }
            }
        }
        """
        data = self._execute_query(query, {"repositoryLocationName": location_name})
        result = data.get("reloadRepositoryLocation", {})
        
        if result.get("loadStatus") == "LOADED":
            return {"success": True}
        else:
            return {"success": False, "error": result.get("message", "Reload failed")}

    def close(self):
        """Close the HTTP client."""
        if self._client:
            self._client.close()
            self._client = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
