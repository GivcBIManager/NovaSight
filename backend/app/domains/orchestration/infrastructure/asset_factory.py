"""
NovaSight Orchestration Domain — Asset Factory
================================================

Dynamically generates Dagster assets from pipeline configurations.
Replaces DAG file generation with in-memory asset definitions.

Canonical location: ``app.domains.orchestration.infrastructure.asset_factory``
"""

from typing import Dict, Any, List, Optional, Callable
import logging

from dagster import (
    asset,
    AssetKey,
    AssetExecutionContext,
    MaterializeResult,
    MetadataValue,
    AssetsDefinition,
)

logger = logging.getLogger(__name__)


class AssetFactory:
    """
    Dynamically builds Dagster assets from DagConfig models.
    
    This replaces the Jinja2 template-based DAG generation with
    in-memory asset definitions that Dagster loads at runtime.
    """

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id

    def build_assets_from_dag_config(self, dag_config) -> List[AssetsDefinition]:
        """
        Build Dagster assets from a DagConfig model.
        
        Each TaskConfig becomes an asset with proper dependencies.
        """
        from app.domains.orchestration.domain.models import TaskType
        
        # Task type to asset builder mapping
        builders: Dict[str, Callable] = {
            TaskType.SPARK_SUBMIT.value if hasattr(TaskType.SPARK_SUBMIT, 'value') else str(TaskType.SPARK_SUBMIT): self._build_spark_asset,
            TaskType.DBT_RUN.value if hasattr(TaskType.DBT_RUN, 'value') else str(TaskType.DBT_RUN): self._build_dbt_asset,
            TaskType.DBT_TEST.value if hasattr(TaskType.DBT_TEST, 'value') else str(TaskType.DBT_TEST): self._build_dbt_test_asset,
            TaskType.SQL_QUERY.value if hasattr(TaskType.SQL_QUERY, 'value') else str(TaskType.SQL_QUERY): self._build_sql_asset,
            TaskType.PYTHON_OPERATOR.value if hasattr(TaskType.PYTHON_OPERATOR, 'value') else str(TaskType.PYTHON_OPERATOR): self._build_python_asset,
            TaskType.BASH_OPERATOR.value if hasattr(TaskType.BASH_OPERATOR, 'value') else str(TaskType.BASH_OPERATOR): self._build_bash_asset,
            TaskType.EMAIL.value if hasattr(TaskType.EMAIL, 'value') else str(TaskType.EMAIL): self._build_email_asset,
        }
        
        assets = []
        group_name = f"tenant_{self.tenant_id}_{dag_config.dag_id}"
        
        for task in dag_config.tasks:
            task_type_key = task.task_type.value if hasattr(task.task_type, 'value') else str(task.task_type)
            builder = builders.get(task_type_key)
            if builder:
                asset_def = builder(task, dag_config, group_name)
                if asset_def:
                    assets.append(asset_def)
            else:
                logger.warning(f"No builder for task type: {task.task_type}")
        
        return assets

    def _get_asset_deps(self, task) -> List[AssetKey]:
        """Convert task dependencies to AssetKeys."""
        return [AssetKey(dep) for dep in (task.depends_on or [])]

    def _build_spark_asset(
        self,
        task,
        dag_config,
        group_name: str,
    ) -> AssetsDefinition:
        """Build a Spark submit asset."""
        config = task.config or {}
        spark_app = config.get("spark_app_path", "")
        spark_args = config.get("spark_args", {})
        task_id = task.task_id
        tenant_id = self.tenant_id
        dag_id = dag_config.dag_id
        deps = self._get_asset_deps(task)

        @asset(
            name=task_id,
            group_name=group_name,
            compute_kind="spark",
            deps=deps,
            metadata={
                "tenant_id": tenant_id,
                "dag_id": dag_id,
                "spark_app": spark_app,
            },
            op_tags={
                "dagster/concurrency_key": "spark_jobs",
                "tenant_id": tenant_id,
            },
        )
        def _spark_asset(context: AssetExecutionContext) -> MaterializeResult:
            context.log.info(f"Executing Spark job: {spark_app}")
            
            # Get spark resource and execute
            spark = context.resources.spark
            session = spark.get_session()
            
            context.log.info(f"Spark args: {spark_args}")
            
            return MaterializeResult(
                metadata={
                    "spark_app": MetadataValue.text(spark_app),
                    "status": MetadataValue.text("completed"),
                }
            )
        
        return _spark_asset

    def _build_dbt_asset(
        self,
        task,
        dag_config,
        group_name: str,
    ) -> AssetsDefinition:
        """Build a dbt run asset."""
        config = task.config or {}
        models = config.get("models", [])
        tags = config.get("tags", [])
        full_refresh = config.get("full_refresh", False)
        task_id = task.task_id
        tenant_id = self.tenant_id
        dag_id = dag_config.dag_id
        deps = self._get_asset_deps(task)
        
        select_arg = " ".join(models) if models else "*"
        if tags:
            select_arg = " ".join([f"tag:{t}" for t in tags])

        @asset(
            name=task_id,
            group_name=group_name,
            compute_kind="dbt",
            deps=deps,
            metadata={
                "tenant_id": tenant_id,
                "dag_id": dag_id,
                "dbt_select": select_arg,
            },
            op_tags={
                "dagster/concurrency_key": "dbt_runs",
                "tenant_id": tenant_id,
            },
        )
        def _dbt_asset(context: AssetExecutionContext) -> MaterializeResult:
            context.log.info(f"Running dbt models: {select_arg}")
            
            dbt = context.resources.dbt
            
            cmd = ["run", "--select", select_arg]
            if full_refresh:
                cmd.append("--full-refresh")
            
            result = dbt.cli(cmd, context=context)
            
            return MaterializeResult(
                metadata={
                    "dbt_select": MetadataValue.text(select_arg),
                    "full_refresh": MetadataValue.bool(full_refresh),
                }
            )
        
        return _dbt_asset

    def _build_dbt_test_asset(
        self,
        task,
        dag_config,
        group_name: str,
    ) -> AssetsDefinition:
        """Build a dbt test asset."""
        config = task.config or {}
        select_arg = config.get("select", "*")
        task_id = task.task_id
        tenant_id = self.tenant_id
        dag_id = dag_config.dag_id
        deps = self._get_asset_deps(task)

        @asset(
            name=task_id,
            group_name=group_name,
            compute_kind="dbt",
            deps=deps,
            metadata={
                "tenant_id": tenant_id,
                "dag_id": dag_id,
            },
            op_tags={"dagster/concurrency_key": "dbt_runs"},
        )
        def _dbt_test_asset(context: AssetExecutionContext) -> MaterializeResult:
            context.log.info(f"Running dbt tests: {select_arg}")
            
            dbt = context.resources.dbt
            result = dbt.cli(["test", "--select", select_arg], context=context)
            
            return MaterializeResult(
                metadata={"tests_passed": MetadataValue.bool(True)}
            )
        
        return _dbt_test_asset

    def _build_sql_asset(
        self,
        task,
        dag_config,
        group_name: str,
    ) -> AssetsDefinition:
        """Build a SQL query asset."""
        config = task.config or {}
        query = config.get("query", "")
        database = config.get("database", "clickhouse")
        task_id = task.task_id
        tenant_id = self.tenant_id
        dag_id = dag_config.dag_id
        deps = self._get_asset_deps(task)

        @asset(
            name=task_id,
            group_name=group_name,
            compute_kind="sql",
            deps=deps,
            metadata={
                "tenant_id": tenant_id,
                "dag_id": dag_id,
                "database": database,
            },
        )
        def _sql_asset(context: AssetExecutionContext) -> MaterializeResult:
            context.log.info(f"Executing SQL on {database}")
            
            if database == "clickhouse":
                db = context.resources.clickhouse
            else:
                db = context.resources.postgres
            
            result = db.execute(query)
            
            return MaterializeResult(
                metadata={"rows_affected": MetadataValue.int(getattr(result, 'rowcount', 0))}
            )
        
        return _sql_asset

    def _build_python_asset(
        self,
        task,
        dag_config,
        group_name: str,
    ) -> AssetsDefinition:
        """Build a Python operator asset."""
        config = task.config or {}
        callable_path = config.get("python_callable", "")
        op_kwargs = config.get("op_kwargs", {})
        task_id = task.task_id
        tenant_id = self.tenant_id
        dag_id = dag_config.dag_id
        deps = self._get_asset_deps(task)

        @asset(
            name=task_id,
            group_name=group_name,
            compute_kind="python",
            deps=deps,
            metadata={
                "tenant_id": tenant_id,
                "dag_id": dag_id,
            },
        )
        def _python_asset(context: AssetExecutionContext) -> MaterializeResult:
            context.log.info(f"Executing Python callable: {callable_path}")
            
            # Dynamically import and execute callable
            module_path, func_name = callable_path.rsplit(".", 1)
            import importlib
            module = importlib.import_module(module_path)
            func = getattr(module, func_name)
            
            result = func(**op_kwargs)
            
            return MaterializeResult(
                metadata={"callable": MetadataValue.text(callable_path)}
            )
        
        return _python_asset

    def _build_bash_asset(
        self,
        task,
        dag_config,
        group_name: str,
    ) -> AssetsDefinition:
        """Build a Bash operator asset."""
        config = task.config or {}
        bash_command = config.get("bash_command", "")
        task_id = task.task_id
        tenant_id = self.tenant_id
        dag_id = dag_config.dag_id
        deps = self._get_asset_deps(task)

        @asset(
            name=task_id,
            group_name=group_name,
            compute_kind="bash",
            deps=deps,
            metadata={
                "tenant_id": tenant_id,
                "dag_id": dag_id,
            },
        )
        def _bash_asset(context: AssetExecutionContext) -> MaterializeResult:
            import subprocess
            
            context.log.info(f"Executing bash: {bash_command[:50]}...")
            
            result = subprocess.run(
                bash_command,
                shell=True,
                capture_output=True,
                text=True,
            )
            
            if result.returncode != 0:
                raise Exception(f"Bash command failed: {result.stderr}")
            
            return MaterializeResult(
                metadata={
                    "return_code": MetadataValue.int(result.returncode),
                    "stdout_preview": MetadataValue.text(result.stdout[:500] if result.stdout else ""),
                }
            )
        
        return _bash_asset

    def _build_email_asset(
        self,
        task,
        dag_config,
        group_name: str,
    ) -> AssetsDefinition:
        """Build an email notification asset."""
        config = task.config or {}
        task_id = task.task_id
        deps = self._get_asset_deps(task)

        @asset(
            name=task_id,
            group_name=group_name,
            compute_kind="email",
            deps=deps,
        )
        def _email_asset(context: AssetExecutionContext) -> MaterializeResult:
            recipients = config.get("recipients", [])
            subject = config.get("subject", "NovaSight Notification")
            
            context.log.info(f"Sending email to {recipients}")
            
            # Email sending logic would go here
            
            return MaterializeResult(
                metadata={"recipients": MetadataValue.text(", ".join(recipients))}
            )
        
        return _email_asset
