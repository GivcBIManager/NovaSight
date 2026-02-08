"""
NovaSight Orchestration Domain — Airflow Client
=================================================

Client for Apache Airflow REST API.

Canonical location: ``app.domains.orchestration.infrastructure.airflow_client``
"""

import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from flask import current_app
import logging

logger = logging.getLogger(__name__)


@dataclass
class DagRun:
    """Represents an Airflow DAG run."""
    dag_id: str
    run_id: str
    state: str
    execution_date: datetime
    start_date: Optional[datetime]
    end_date: Optional[datetime]


@dataclass
class TaskInstance:
    """Represents an Airflow task instance."""
    task_id: str
    state: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    try_number: int


class AirflowClient:
    """Client for Airflow REST API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        tenant_id: Optional[str] = None,
        use_infrastructure_config: bool = True,
    ):
        self._base_url = base_url
        self._username = username
        self._password = password
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
            self._loaded_settings = config_service.get_effective_settings("airflow", self._tenant_id)
            self._config_loaded = True
        except Exception as e:
            logger.debug(f"Could not load infrastructure config: {e}")
            self._config_loaded = True

    @property
    def base_url(self) -> str:
        if self._base_url:
            return self._base_url.rstrip("/")
        self._load_infrastructure_config()
        if self._loaded_settings.get("base_url"):
            return self._loaded_settings["base_url"].rstrip("/")
        return current_app.config.get("AIRFLOW_BASE_URL", "http://localhost:8080").rstrip("/")

    @property
    def auth(self) -> tuple:
        self._load_infrastructure_config()
        username = (
            self._username
            or self._loaded_settings.get("username")
            or current_app.config.get("AIRFLOW_USERNAME", "airflow")
        )
        password = (
            self._password
            or self._loaded_settings.get("password")
            or current_app.config.get("AIRFLOW_PASSWORD", "airflow")
        )
        return (username, password)

    @property
    def client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(timeout=30.0)
        return self._client

    def _request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1{path}"
        try:
            response = self.client.request(method, url, auth=self.auth, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Airflow API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Airflow API request failed: {e}")
            raise

    # ------------------------------------------------------------------
    # DAG Management
    # ------------------------------------------------------------------

    def list_dags(self, tags: Optional[List[str]] = None) -> List[Dict]:
        params = {}
        if tags:
            params["tags"] = ",".join(tags)
        result = self._request("GET", "/dags", params=params)
        return result.get("dags", [])

    def get_dag(self, dag_id: str) -> Dict:
        return self._request("GET", f"/dags/{dag_id}")

    def pause_dag(self, dag_id: str) -> Dict:
        return self._request("PATCH", f"/dags/{dag_id}", json={"is_paused": True})

    def unpause_dag(self, dag_id: str) -> Dict:
        return self._request("PATCH", f"/dags/{dag_id}", json={"is_paused": False})

    def refresh_dag(self, dag_id: str) -> None:
        self._request("PATCH", f"/dags/{dag_id}", json={})

    # ------------------------------------------------------------------
    # DAG Runs
    # ------------------------------------------------------------------

    def trigger_dag(self, dag_id: str, conf: Optional[Dict] = None) -> DagRun:
        payload = {"conf": conf or {}}
        result = self._request("POST", f"/dags/{dag_id}/dagRuns", json=payload)
        return DagRun(
            dag_id=result["dag_id"],
            run_id=result["dag_run_id"],
            state=result["state"],
            execution_date=datetime.fromisoformat(result["execution_date"].replace("Z", "+00:00")),
            start_date=None,
            end_date=None,
        )

    def get_dag_runs(self, dag_id: str, limit: int = 25, offset: int = 0) -> List[DagRun]:
        result = self._request(
            "GET",
            f"/dags/{dag_id}/dagRuns",
            params={"limit": limit, "offset": offset, "order_by": "-execution_date"},
        )
        return [
            DagRun(
                dag_id=r["dag_id"],
                run_id=r["dag_run_id"],
                state=r["state"],
                execution_date=datetime.fromisoformat(r["execution_date"].replace("Z", "+00:00")),
                start_date=(
                    datetime.fromisoformat(r["start_date"].replace("Z", "+00:00"))
                    if r.get("start_date") else None
                ),
                end_date=(
                    datetime.fromisoformat(r["end_date"].replace("Z", "+00:00"))
                    if r.get("end_date") else None
                ),
            )
            for r in result.get("dag_runs", [])
        ]

    def get_dag_run(self, dag_id: str, run_id: str) -> DagRun:
        result = self._request("GET", f"/dags/{dag_id}/dagRuns/{run_id}")
        return DagRun(
            dag_id=result["dag_id"],
            run_id=result["dag_run_id"],
            state=result["state"],
            execution_date=datetime.fromisoformat(result["execution_date"].replace("Z", "+00:00")),
            start_date=(
                datetime.fromisoformat(result["start_date"].replace("Z", "+00:00"))
                if result.get("start_date") else None
            ),
            end_date=(
                datetime.fromisoformat(result["end_date"].replace("Z", "+00:00"))
                if result.get("end_date") else None
            ),
        )

    # ------------------------------------------------------------------
    # Task Instances
    # ------------------------------------------------------------------

    def get_task_instances(self, dag_id: str, run_id: str) -> List[TaskInstance]:
        result = self._request("GET", f"/dags/{dag_id}/dagRuns/{run_id}/taskInstances")
        return [
            TaskInstance(
                task_id=t["task_id"],
                state=t["state"] or "pending",
                start_date=(
                    datetime.fromisoformat(t["start_date"].replace("Z", "+00:00"))
                    if t.get("start_date") else None
                ),
                end_date=(
                    datetime.fromisoformat(t["end_date"].replace("Z", "+00:00"))
                    if t.get("end_date") else None
                ),
                try_number=t.get("try_number", 1),
            )
            for t in result.get("task_instances", [])
        ]

    # ------------------------------------------------------------------
    # Logs
    # ------------------------------------------------------------------

    def get_task_logs(
        self, dag_id: str, run_id: str, task_id: str, try_number: int = 1,
    ) -> str:
        result = self._request(
            "GET",
            f"/dags/{dag_id}/dagRuns/{run_id}/taskInstances/{task_id}/logs/{try_number}",
        )
        return result.get("content", "")

    # ------------------------------------------------------------------
    # DAG File Management
    # ------------------------------------------------------------------

    def trigger_dag_parse(self) -> None:
        try:
            self._request("GET", "/dags", params={"limit": 1})
            logger.info("Triggered DAG file refresh")
        except Exception as e:
            logger.warning(f"Failed to trigger DAG parse: {e}")

    def delete_dag(self, dag_id: str) -> None:
        try:
            self._request("DELETE", f"/dags/{dag_id}")
            logger.info(f"Deleted DAG: {dag_id}")
        except Exception as e:
            logger.warning(f"Failed to delete DAG {dag_id}: {e}")

    def close(self) -> None:
        if self._client:
            self._client.close()
            self._client = None
