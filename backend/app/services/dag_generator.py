"""
NovaSight DAG Generator
=======================

Generates Airflow DAG Python files from configuration.
Uses templates for security (no arbitrary code generation).
Supports Spark-based ingestion DAGs.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import json
from jinja2 import Environment, PackageLoader, select_autoescape
from app.models.dag import DagConfig, TaskConfig, ScheduleType
from app.models.connection import DataSource, DataSourceTable
from app.services.airflow_client import AirflowClient
import logging

logger = logging.getLogger(__name__)


class DagGenerator:
    """Generates Airflow DAG files from configuration."""
    
    def __init__(self, tenant_id: str, airflow_client: Optional[AirflowClient] = None):
        """
        Initialize DAG generator.
        
        Args:
            tenant_id: Tenant UUID for DAG namespacing
            airflow_client: Optional Airflow API client
        """
        self.tenant_id = tenant_id
        self.airflow_client = airflow_client or AirflowClient()
        self.dags_path = Path('/opt/airflow/dags')
        self.spark_apps_path = Path('/opt/airflow/spark_apps')
        
        # Initialize Jinja2 environment with templates
        self.env = Environment(
            loader=PackageLoader('app', 'templates/airflow'),
            autoescape=select_autoescape(['py']),
            trim_blocks=True,
            lstrip_blocks=True,
        )
    
    def generate(self, dag_config: DagConfig) -> str:
        """
        Generate Airflow DAG file content.
        
        Args:
            dag_config: DAG configuration
        
        Returns:
            Generated Python DAG file content
        """
        template = self.env.get_template('dag_template.py.j2')
        
        # Prepare template context
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
    
    def _get_schedule_string(self, dag_config: DagConfig) -> str:
        """Get schedule string for DAG."""
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
    
    def _format_start_date(self, start_date: datetime) -> str:
        """Format start date for template."""
        if not start_date:
            return "datetime(2024, 1, 1)"
        return f"datetime({start_date.year}, {start_date.month}, {start_date.day})"
    
    def _prepare_task(self, task: TaskConfig) -> Dict[str, Any]:
        """Prepare task configuration for template."""
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
    
    # Spark-based Ingestion DAG Generation
    
    def generate_ingestion_dag(
        self,
        datasource: DataSource,
        tables: List[DataSourceTable],
        schedule: str = '@hourly'
    ) -> str:
        """
        Generate ingestion DAG that submits PySpark jobs to Spark cluster.
        
        Args:
            datasource: Data source configuration
            tables: List of tables to ingest
            schedule: Airflow schedule expression
        
        Returns:
            DAG ID of generated DAG
        """
        # Prepare table configurations
        table_configs = [
            {
                'source_table': t.source_name,
                'target_table': t.target_name,
                'incremental_column': t.incremental_column or 'updated_at',
                'mode': 'incremental' if t.incremental_column else 'full',
                'primary_keys': t.primary_keys or [],
            }
            for t in tables
        ]
        
        # Generate PySpark application config
        spark_config = {
            'tenant_id': str(datasource.tenant_id),
            'datasource_id': str(datasource.id),
            'datasource_type': datasource.type.value,
            'connection_config': {
                'host': datasource.host,
                'port': datasource.port,
                'database': datasource.database,
                'username': datasource.username,
                'jdbc_driver': self._get_jdbc_driver(datasource.type.value),
            },
            'clickhouse_config': {
                'host': 'clickhouse',
                'port': 9000,
                'database': f'tenant_{datasource.tenant_id}',
            },
            'tables': table_configs,
        }
        
        # Render DAG from template
        template = self.env.get_template('spark_ingestion_dag.py.j2')
        dag_content = template.render(
            tenant_id=str(datasource.tenant_id),
            datasource_id=str(datasource.id),
            datasource_name=datasource.name,
            datasource_type=datasource.type.value,
            dag_id=f'ingest_{datasource.tenant_id}_{datasource.id}',
            schedule=schedule,
            spark_app_path='/opt/airflow/spark_apps/ingestion/ingest_to_clickhouse.py',
            spark_config=spark_config,
            num_tables=len(tables),
            spark_conf={
                'spark.executor.memory': '2g',
                'spark.executor.cores': '2',
                'spark.dynamicAllocation.enabled': 'true',
                'spark.dynamicAllocation.minExecutors': '1',
                'spark.dynamicAllocation.maxExecutors': '5',
            }
        )
        
        # Write DAG file
        dag_id = f'ingest_{datasource.tenant_id}_{datasource.id}'
        dag_file = self.dags_path / f'{dag_id}.py'
        
        # Ensure directory exists
        dag_file.parent.mkdir(parents=True, exist_ok=True)
        dag_file.write_text(dag_content)
        
        # Write PySpark config file for this datasource
        config_file = self.spark_apps_path / 'configs' / f'{dag_id}_config.json'
        config_file.parent.mkdir(parents=True, exist_ok=True)
        config_file.write_text(json.dumps(spark_config, indent=2))
        
        logger.info(f"Generated ingestion DAG: {dag_id}")
        
        # Trigger DAG parsing in Airflow
        try:
            self.airflow_client.trigger_dag_parse()
        except Exception as e:
            logger.warning(f"Failed to trigger DAG parse: {e}")
        
        return dag_id
    
    def _get_jdbc_driver(self, db_type: str) -> str:
        """
        Get JDBC driver class for database type.
        
        Args:
            db_type: Database type (postgresql, mysql, oracle, sqlserver)
        
        Returns:
            JDBC driver class name
        """
        drivers = {
            'postgresql': 'org.postgresql.Driver',
            'mysql': 'com.mysql.cj.jdbc.Driver',
            'oracle': 'oracle.jdbc.OracleDriver',
            'sqlserver': 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
        }
        return drivers.get(db_type.lower(), 'org.postgresql.Driver')
    
    def update_ingestion_dag(
        self,
        datasource: DataSource,
        tables: List[DataSourceTable],
        schedule: Optional[str] = None
    ) -> str:
        """
        Update existing ingestion DAG.
        
        Args:
            datasource: Data source configuration
            tables: List of tables to ingest
            schedule: Optional new schedule
        
        Returns:
            DAG ID of updated DAG
        """
        # Delete old DAG
        dag_id = f'ingest_{datasource.tenant_id}_{datasource.id}'
        self.delete_dag(dag_id)
        
        # Generate new DAG
        return self.generate_ingestion_dag(
            datasource, 
            tables, 
            schedule or datasource.sync_frequency or '@hourly'
        )
    
    def delete_dag(self, dag_id: str) -> None:
        """
        Delete a DAG file and its config.
        
        Args:
            dag_id: DAG identifier
        """
        dag_file = self.dags_path / f'{dag_id}.py'
        if dag_file.exists():
            dag_file.unlink()
            logger.info(f"Deleted DAG file: {dag_file}")
        
        # Delete config file
        config_file = self.spark_apps_path / 'configs' / f'{dag_id}_config.json'
        if config_file.exists():
            config_file.unlink()
            logger.info(f"Deleted config file: {config_file}")
        
        # Pause and delete from Airflow
        try:
            self.airflow_client.pause_dag(dag_id)
            self.airflow_client.delete_dag(dag_id)
        except Exception as e:
            logger.warning(f"Failed to delete DAG from Airflow: {e}")
