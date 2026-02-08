"""
NovaSight Orchestration Domain — DAG Generator
================================================

Generates Airflow DAG Python files from configuration.
Uses Jinja2 templates — NO arbitrary code generation (ADR-002).

Canonical location: ``app.domains.orchestration.infrastructure.dag_generator``

This module provides:
- ``DagGenerator`` — legacy DAG generation for data sources
- ``PySparkDAGGenerator`` — DAG generation for PySpark apps (Prompt 016)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import json
import re

from jinja2 import Environment, PackageLoader, select_autoescape

from app.domains.orchestration.domain.models import (
    DagConfig, TaskConfig, ScheduleType,
)
from app.domains.orchestration.infrastructure.airflow_client import AirflowClient
from app.errors import NotFoundError, ValidationError
import logging

logger = logging.getLogger(__name__)


class DagGenerator:
    """Generates Airflow DAG files from configuration."""

    def __init__(
        self,
        tenant_id: str,
        airflow_client: Optional[AirflowClient] = None,
    ):
        self.tenant_id = tenant_id
        self.airflow_client = airflow_client or AirflowClient()
        self.dags_path = Path("/opt/airflow/dags")
        self.spark_apps_path = Path("/opt/airflow/spark_apps")

        self.env = Environment(
            loader=PackageLoader("app", "templates/airflow"),
            autoescape=select_autoescape(["py"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def generate(self, dag_config: DagConfig) -> str:
        """Generate Airflow DAG file content from config."""
        template = self.env.get_template("dag_template.py.j2")
        context = {
            "dag_id": dag_config.full_dag_id,
            "description": dag_config.description or "",
            "schedule": self._get_schedule_string(dag_config),
            "start_date": self._format_start_date(dag_config.start_date),
            "catchup": dag_config.catchup,
            "max_active_runs": dag_config.max_active_runs,
            "default_args": {
                "retries": dag_config.default_retries,
                "retry_delay_minutes": dag_config.default_retry_delay_minutes,
                "email": dag_config.notification_emails,
                "email_on_failure": dag_config.email_on_failure,
                "email_on_success": dag_config.email_on_success,
            },
            "tags": [dag_config.tenant.slug] + dag_config.tags,
            "tasks": [self._prepare_task(t) for t in dag_config.tasks],
            "generated_at": datetime.utcnow().isoformat(),
            "version": dag_config.current_version,
        }
        return template.render(**context)

    # ------------------------------------------------------------------
    # Spark-based Ingestion DAG Generation
    # ------------------------------------------------------------------

    def generate_ingestion_dag(self, datasource, tables, schedule: str = "@hourly") -> str:
        """Generate ingestion DAG that submits PySpark jobs to Spark cluster."""
        table_configs = [
            {
                "source_table": t.source_name,
                "target_table": t.target_name,
                "incremental_column": t.incremental_column or "updated_at",
                "mode": "incremental" if t.incremental_column else "full",
                "primary_keys": t.primary_keys or [],
            }
            for t in tables
        ]

        spark_config = {
            "tenant_id": str(datasource.tenant_id),
            "datasource_id": str(datasource.id),
            "datasource_type": datasource.type.value,
            "connection_config": {
                "host": datasource.host,
                "port": datasource.port,
                "database": datasource.database,
                "username": datasource.username,
                "jdbc_driver": self._get_jdbc_driver(datasource.type.value),
            },
            "clickhouse_config": {
                "host": "clickhouse",
                "port": 9000,
                "database": f"tenant_{datasource.tenant_id}",
            },
            "tables": table_configs,
        }

        template = self.env.get_template("spark_ingestion_dag.py.j2")
        dag_content = template.render(
            tenant_id=str(datasource.tenant_id),
            datasource_id=str(datasource.id),
            datasource_name=datasource.name,
            datasource_type=datasource.type.value,
            dag_id=f"ingest_{datasource.tenant_id}_{datasource.id}",
            schedule=schedule,
            spark_app_path="/opt/airflow/spark_apps/ingestion/ingest_to_clickhouse.py",
            spark_config=spark_config,
            num_tables=len(tables),
            spark_conf={
                "spark.executor.memory": "2g",
                "spark.executor.cores": "2",
                "spark.dynamicAllocation.enabled": "true",
                "spark.dynamicAllocation.minExecutors": "1",
                "spark.dynamicAllocation.maxExecutors": "5",
            },
        )

        dag_id = f"ingest_{datasource.tenant_id}_{datasource.id}"
        dag_file = self.dags_path / f"{dag_id}.py"
        dag_file.parent.mkdir(parents=True, exist_ok=True)
        dag_file.write_text(dag_content)

        config_file = self.spark_apps_path / "configs" / f"{dag_id}_config.json"
        config_file.parent.mkdir(parents=True, exist_ok=True)
        config_file.write_text(json.dumps(spark_config, indent=2))

        logger.info(f"Generated ingestion DAG: {dag_id}")

        try:
            self.airflow_client.trigger_dag_parse()
        except Exception as e:
            logger.warning(f"Failed to trigger DAG parse: {e}")

        return dag_id

    def update_ingestion_dag(self, datasource, tables, schedule: Optional[str] = None) -> str:
        dag_id = f"ingest_{datasource.tenant_id}_{datasource.id}"
        self.delete_dag(dag_id)
        return self.generate_ingestion_dag(
            datasource, tables, schedule or datasource.sync_frequency or "@hourly",
        )

    def delete_dag(self, dag_id: str) -> None:
        dag_file = self.dags_path / f"{dag_id}.py"
        if dag_file.exists():
            dag_file.unlink()
            logger.info(f"Deleted DAG file: {dag_file}")

        config_file = self.spark_apps_path / "configs" / f"{dag_id}_config.json"
        if config_file.exists():
            config_file.unlink()
            logger.info(f"Deleted config file: {config_file}")

        try:
            self.airflow_client.pause_dag(dag_id)
            self.airflow_client.delete_dag(dag_id)
        except Exception as e:
            logger.warning(f"Failed to delete DAG from Airflow: {e}")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_schedule_string(self, dag_config: DagConfig) -> str:
        if dag_config.schedule_type == ScheduleType.MANUAL:
            return "None"
        elif dag_config.schedule_type == ScheduleType.CRON:
            return f'"{dag_config.schedule_cron}"'
        elif dag_config.schedule_type == ScheduleType.PRESET:
            preset_map = {
                "hourly": '"@hourly"',
                "daily": '"@daily"',
                "weekly": '"@weekly"',
                "monthly": '"@monthly"',
            }
            return preset_map.get(dag_config.schedule_preset, "None")
        return "None"

    def _format_start_date(self, start_date: Optional[datetime]) -> str:
        if not start_date:
            return "datetime(2024, 1, 1)"
        return f"datetime({start_date.year}, {start_date.month}, {start_date.day})"

    def _prepare_task(self, task: TaskConfig) -> Dict[str, Any]:
        return {
            "task_id": task.task_id,
            "task_type": task.task_type.value,
            "config": task.config,
            "timeout_minutes": task.timeout_minutes,
            "retries": task.retries,
            "retry_delay_minutes": task.retry_delay_minutes,
            "trigger_rule": task.trigger_rule.value,
            "depends_on": task.depends_on,
        }

    def _get_jdbc_driver(self, db_type: str) -> str:
        drivers = {
            "postgresql": "org.postgresql.Driver",
            "mysql": "com.mysql.cj.jdbc.Driver",
            "oracle": "oracle.jdbc.OracleDriver",
            "sqlserver": "com.microsoft.sqlserver.jdbc.SQLServerDriver",
        }
        return drivers.get(db_type.lower(), "org.postgresql.Driver")


class PySparkDAGGenerator:
    """
    Generates Airflow DAGs to orchestrate pre-defined PySpark jobs.

    Does NOT generate PySpark code — only DAG orchestration wrappers.
    All PySpark code comes from pre-approved templates (ADR-002 compliant).
    """

    DEFAULT_SPARK_CONFIG = {
        "spark.executor.memory": "2g",
        "spark.executor.cores": "2",
        "spark.dynamicAllocation.enabled": "true",
        "spark.dynamicAllocation.minExecutors": "1",
        "spark.dynamicAllocation.maxExecutors": "5",
    }

    def __init__(
        self,
        tenant_id: str,
        template_engine=None,
        airflow_client: Optional[AirflowClient] = None,
        pyspark_service=None,
    ):
        self.tenant_id = tenant_id
        # Lazy imports to avoid circular deps at module level
        if template_engine is None:
            from app.services.template_engine import TemplateEngine
            template_engine = TemplateEngine()
        if pyspark_service is None:
            from app.services.pyspark_app_service import PySparkAppService
            pyspark_service = PySparkAppService(tenant_id)

        self.template_engine = template_engine
        self.airflow_client = airflow_client or AirflowClient()
        self.pyspark_service = pyspark_service
        self.dags_path = Path("/opt/airflow/dags")
        self.spark_apps_path = Path("/opt/airflow/spark_apps")

    def generate_dag_for_pyspark_app(
        self,
        pyspark_app_id: str,
        schedule: str = "@hourly",
        spark_config: Optional[Dict[str, str]] = None,
        notifications: Optional[Dict[str, Any]] = None,
        retries: int = 2,
        retry_delay_minutes: int = 5,
    ) -> str:
        pyspark_app = self.pyspark_service.get_app(pyspark_app_id)
        if not pyspark_app:
            raise NotFoundError(f"PySpark app {pyspark_app_id} not found")
        if not pyspark_app.generated_code:
            raise ValidationError(
                f"PySpark app {pyspark_app_id} has no generated code. "
                "Generate code first using the PySpark App Builder."
            )

        final_spark_config = {**self.DEFAULT_SPARK_CONFIG, **(spark_config or {})}
        dag_id = f"pyspark_{self.tenant_id}_{pyspark_app.id}"
        spark_app_path = f"/opt/airflow/spark_apps/jobs/{dag_id}.py"

        context = {
            "dag_id": dag_id,
            "tenant_id": self.tenant_id,
            "pyspark_app_id": str(pyspark_app.id),
            "pyspark_app_name": pyspark_app.name,
            "pyspark_app_description": pyspark_app.description or "",
            "schedule": schedule,
            "spark_app_path": spark_app_path,
            "spark_conf": final_spark_config,
            "scd_type": pyspark_app.scd_type.value,
            "write_mode": pyspark_app.write_mode.value,
            "source_type": pyspark_app.source_type.value,
            "target_database": pyspark_app.target_database or "",
            "target_table": pyspark_app.target_table or "",
            "notifications": notifications or {},
            "generated_at": datetime.utcnow().isoformat(),
            "template_version": pyspark_app.template_version or "1.0.0",
            "retries": retries,
            "retry_delay_minutes": retry_delay_minutes,
        }

        dag_content = self.template_engine.render("airflow/pyspark_job_dag.py.j2", context)

        self.dags_path.mkdir(parents=True, exist_ok=True)
        (self.spark_apps_path / "jobs").mkdir(parents=True, exist_ok=True)

        dag_file = self.dags_path / f"{dag_id}.py"
        dag_file.write_text(dag_content)
        logger.info(f"Generated DAG file: {dag_file}")

        spark_app_file = self.spark_apps_path / "jobs" / f"{dag_id}.py"
        spark_app_file.write_text(pyspark_app.generated_code)
        logger.info(f"Wrote PySpark job file: {spark_app_file}")

        try:
            self.airflow_client.trigger_dag_parse()
        except Exception as e:
            logger.warning(f"Failed to trigger DAG parse: {e}")

        return dag_id

    def generate_dag_for_multiple_apps(
        self,
        pyspark_app_ids: List[str],
        dag_name: str,
        schedule: str = "@daily",
        parallel: bool = False,
        spark_config: Optional[Dict[str, str]] = None,
        notifications: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
        retries: int = 2,
        retry_delay_minutes: int = 5,
    ) -> str:
        if not pyspark_app_ids:
            raise ValidationError("At least one PySpark app ID is required")

        apps = []
        for app_id in pyspark_app_ids:
            app = self.pyspark_service.get_app(app_id)
            if not app:
                raise NotFoundError(f"PySpark app {app_id} not found")
            if not app.generated_code:
                raise ValidationError(
                    f"PySpark app {app_id} ({app.name}) has no generated code. "
                    "Generate code first using the PySpark App Builder."
                )
            apps.append(app)

        final_spark_config = {**self.DEFAULT_SPARK_CONFIG, **(spark_config or {})}
        safe_dag_name = re.sub(r"[^a-z0-9_]", "_", dag_name.lower())
        dag_id = f"pipeline_{self.tenant_id}_{safe_dag_name}"

        self.dags_path.mkdir(parents=True, exist_ok=True)
        (self.spark_apps_path / "jobs").mkdir(parents=True, exist_ok=True)

        app_contexts = []
        for app in apps:
            app_file = f"{dag_id}_{app.id}.py"
            task_id = f'run_{re.sub(r"[^a-z0-9_]", "_", app.name.lower())}'
            app_contexts.append({
                "app_id": str(app.id),
                "app_name": app.name,
                "task_id": task_id,
                "spark_app_path": f"/opt/airflow/spark_apps/jobs/{app_file}",
            })
            spark_app_file = self.spark_apps_path / "jobs" / app_file
            spark_app_file.write_text(app.generated_code)
            logger.info(f"Wrote PySpark job file: {spark_app_file}")

        context = {
            "dag_id": dag_id,
            "dag_name": dag_name,
            "description": description,
            "tenant_id": self.tenant_id,
            "schedule": schedule,
            "parallel": parallel,
            "apps": app_contexts,
            "spark_conf": final_spark_config,
            "notifications": notifications or {},
            "generated_at": datetime.utcnow().isoformat(),
            "retries": retries,
            "retry_delay_minutes": retry_delay_minutes,
        }

        dag_content = self.template_engine.render("airflow/pyspark_pipeline_dag.py.j2", context)
        dag_file = self.dags_path / f"{dag_id}.py"
        dag_file.write_text(dag_content)
        logger.info(f"Generated pipeline DAG file: {dag_file}")

        try:
            self.airflow_client.trigger_dag_parse()
        except Exception as e:
            logger.warning(f"Failed to trigger DAG parse: {e}")

        return dag_id

    def update_dag_schedule(self, dag_id: str, new_schedule: str) -> None:
        if not self._is_tenant_dag(dag_id):
            raise NotFoundError(f"DAG {dag_id} not found")
        dag_file = self.dags_path / f"{dag_id}.py"
        if not dag_file.exists():
            raise NotFoundError(f"DAG {dag_id} not found")

        content = dag_file.read_text()
        updated = re.sub(
            r"schedule_interval='[^']*'",
            f"schedule_interval='{new_schedule}'",
            content,
        )
        dag_file.write_text(updated)
        logger.info(f"Updated DAG {dag_id} schedule to: {new_schedule}")
        try:
            self.airflow_client.trigger_dag_parse()
        except Exception as e:
            logger.warning(f"Failed to trigger DAG parse: {e}")

    def delete_dag(self, dag_id: str) -> None:
        if not self._is_tenant_dag(dag_id):
            raise NotFoundError(f"DAG {dag_id} not found")
        dag_file = self.dags_path / f"{dag_id}.py"
        if dag_file.exists():
            dag_file.unlink()
            logger.info(f"Deleted DAG file: {dag_file}")
        jobs_dir = self.spark_apps_path / "jobs"
        if jobs_dir.exists():
            for job_file in jobs_dir.glob(f"{dag_id}*.py"):
                job_file.unlink()
                logger.info(f"Deleted PySpark job file: {job_file}")
        try:
            self.airflow_client.pause_dag(dag_id)
            self.airflow_client.delete_dag(dag_id)
        except Exception as e:
            logger.warning(f"Failed to delete DAG from Airflow: {e}")

    def list_dags_for_tenant(self) -> List[Dict[str, Any]]:
        dags: List[Dict[str, Any]] = []
        prefix = f"pyspark_{self.tenant_id}_"
        pipeline_prefix = f"pipeline_{self.tenant_id}_"
        if not self.dags_path.exists():
            return dags
        for dag_file in self.dags_path.glob("*.py"):
            dag_name = dag_file.stem
            if dag_name.startswith(prefix) or dag_name.startswith(pipeline_prefix):
                dags.append({
                    "dag_id": dag_name,
                    "file_path": str(dag_file),
                    "is_pipeline": dag_name.startswith(pipeline_prefix),
                    "created_at": datetime.fromtimestamp(dag_file.stat().st_mtime).isoformat(),
                })
        return dags

    def get_dag_info(self, dag_id: str) -> Optional[Dict[str, Any]]:
        if not self._is_tenant_dag(dag_id):
            return None
        dag_file = self.dags_path / f"{dag_id}.py"
        if not dag_file.exists():
            return None
        content = dag_file.read_text()
        schedule_match = re.search(r"schedule_interval='([^']*)'", content)
        schedule = schedule_match.group(1) if schedule_match else None
        jobs_dir = self.spark_apps_path / "jobs"
        job_count = len(list(jobs_dir.glob(f"{dag_id}*.py"))) if jobs_dir.exists() else 0
        return {
            "dag_id": dag_id,
            "file_path": str(dag_file),
            "schedule": schedule,
            "is_pipeline": dag_id.startswith(f"pipeline_{self.tenant_id}_"),
            "job_count": job_count,
            "created_at": datetime.fromtimestamp(dag_file.stat().st_mtime).isoformat(),
        }

    def _is_tenant_dag(self, dag_id: str) -> bool:
        return (
            dag_id.startswith(f"pyspark_{self.tenant_id}_")
            or dag_id.startswith(f"pipeline_{self.tenant_id}_")
        )
