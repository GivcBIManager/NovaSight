"""
NovaSight Orchestration Domain — Pipeline Service
===================================================

Application-layer service for generating complete ingestion +
transformation pipelines.

Canonical location: ``app.domains.orchestration.application.pipeline_service``
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import logging

from app.domains.orchestration.infrastructure.dag_generator import DagGenerator
from app.domains.orchestration.infrastructure.transformation_dag_generator import (
    TransformationDAGGenerator,
)
from app.domains.orchestration.infrastructure.airflow_client import AirflowClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class PipelineGeneratorError(Exception):
    """Base exception for pipeline generator errors."""
    pass


class PipelineValidationError(PipelineGeneratorError):
    """Raised when pipeline validation fails."""
    pass


# ---------------------------------------------------------------------------
# PipelineGenerator
# ---------------------------------------------------------------------------

class PipelineGenerator:
    """
    Generates complete ingestion + transformation pipelines.

    This service coordinates:
    1. Ingestion DAG generation (extract from source → load to ClickHouse)
    2. Transformation DAG generation (dbt models → staging → marts)

    The transformation DAG waits for the ingestion DAG to complete
    via ExternalTaskSensor before running.

    All generated code comes from pre-approved templates (ADR-002 compliant).
    """

    def __init__(
        self,
        ingestion_generator: Optional[DagGenerator] = None,
        transform_generator: Optional[TransformationDAGGenerator] = None,
        template_engine=None,
        airflow_client: Optional[AirflowClient] = None,
    ):
        # Lazy imports to avoid circular deps
        if template_engine is None:
            from app.services.template_engine import TemplateEngine
            template_engine = TemplateEngine()

        self.template_engine = template_engine
        self.airflow_client = airflow_client or AirflowClient()

        self._ingestion_generator = ingestion_generator
        self._transform_generator = transform_generator or TransformationDAGGenerator(
            template_engine=self.template_engine,
            airflow_client=self.airflow_client,
        )

    def _get_ingestion_generator(self, tenant_id: str) -> DagGenerator:
        """Get or create ingestion generator for tenant."""
        if self._ingestion_generator is None:
            return DagGenerator(
                tenant_id=tenant_id,
                airflow_client=self.airflow_client,
            )
        return self._ingestion_generator

    # ------------------------------------------------------------------
    # Full pipeline
    # ------------------------------------------------------------------

    def generate_full_pipeline(
        self,
        datasource,
        tables,
        schedule: str = '@hourly',
        run_dbt_tests: bool = True,
        include_marts: bool = True,
    ) -> Dict[str, str]:
        """
        Generate both ingestion and transformation DAGs.

        Args:
            datasource: Data source configuration
            tables: List of tables to ingest
            schedule: Airflow schedule expression
            run_dbt_tests: Whether to run dbt tests after transformations
            include_marts: Whether to include mart models

        Returns:
            Dictionary with ingestion_dag_id and transformation_dag_id
        """
        tenant_id = str(datasource.tenant_id)

        if not tables:
            raise PipelineValidationError(
                "At least one table is required for pipeline generation"
            )

        logger.info(
            f"Generating full pipeline for datasource {datasource.name} "
            f"(tenant: {tenant_id}, tables: {len(tables)})"
        )

        # 1. Ingestion DAG
        ingestion_generator = self._get_ingestion_generator(tenant_id)
        ingest_dag_id = ingestion_generator.generate_ingestion_dag(
            datasource=datasource,
            tables=tables,
            schedule=schedule,
        )
        logger.info(f"Generated ingestion DAG: {ingest_dag_id}")

        # 2. Transformation DAG (triggered after ingestion)
        transform_dag_id = self._transform_generator.generate_transformation_dag(
            tenant_id=tenant_id,
            datasource=datasource,
            models=None,
            schedule=None,
            run_tests=run_dbt_tests,
        )
        logger.info(f"Generated transformation DAG: {transform_dag_id}")

        return {
            'ingestion_dag_id': ingest_dag_id,
            'transformation_dag_id': transform_dag_id,
            'tenant_id': tenant_id,
            'datasource_id': str(datasource.id),
            'tables_count': len(tables),
            'schedule': schedule,
            'generated_at': datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------
    # Pipeline with dependencies
    # ------------------------------------------------------------------

    def generate_pipeline_with_dependencies(
        self,
        datasource,
        tables,
        upstream_dags: Optional[List[str]] = None,
        downstream_dags: Optional[List[str]] = None,
        schedule: str = '@hourly',
    ) -> Dict[str, Any]:
        """Generate a pipeline with upstream and downstream dependencies."""
        tenant_id = str(datasource.tenant_id)

        result = self.generate_full_pipeline(
            datasource=datasource,
            tables=tables,
            schedule=schedule,
        )

        result['upstream_dags'] = upstream_dags or []
        result['downstream_dags'] = downstream_dags or []

        if upstream_dags or downstream_dags:
            orchestration_dag_id = self._generate_orchestration_dag(
                tenant_id=tenant_id,
                pipeline_dags=[result['ingestion_dag_id'], result['transformation_dag_id']],
                upstream_dags=upstream_dags or [],
                downstream_dags=downstream_dags or [],
                schedule=schedule,
            )
            result['orchestration_dag_id'] = orchestration_dag_id

        return result

    def _generate_orchestration_dag(
        self,
        tenant_id: str,
        pipeline_dags: List[str],
        upstream_dags: List[str],
        downstream_dags: List[str],
        schedule: str,
    ) -> str:
        """Generate an orchestration DAG that coordinates multiple pipelines."""
        dag_id = f'orchestrate_{tenant_id}_{pipeline_dags[0].split("_")[-1]}'

        context = {
            'dag_id': dag_id,
            'tenant_id': tenant_id,
            'pipeline_dags': pipeline_dags,
            'upstream_dags': upstream_dags,
            'downstream_dags': downstream_dags,
            'schedule': schedule,
            'generated_at': datetime.utcnow().isoformat(),
        }

        dag_content = self.template_engine.render(
            'airflow/orchestration_dag.py.j2',
            context,
        )

        dags_path = Path('/opt/airflow/dags')
        dags_path.mkdir(parents=True, exist_ok=True)

        dag_file = dags_path / f'{dag_id}.py'
        dag_file.write_text(dag_content)
        logger.info(f"Generated orchestration DAG: {dag_id}")

        return dag_id

    # ------------------------------------------------------------------
    # Update / Delete
    # ------------------------------------------------------------------

    def update_pipeline(
        self,
        datasource,
        tables,
        schedule: Optional[str] = None,
    ) -> Dict[str, str]:
        """Update an existing pipeline (delete + regenerate)."""
        tenant_id = str(datasource.tenant_id)
        self.delete_pipeline(tenant_id, datasource)
        return self.generate_full_pipeline(
            datasource=datasource,
            tables=tables,
            schedule=schedule or '@hourly',
        )

    def delete_pipeline(self, tenant_id: str, datasource) -> None:
        """Delete all DAGs associated with a pipeline."""
        ingestion_generator = self._get_ingestion_generator(tenant_id)
        ingest_dag_id = f'ingest_{tenant_id}_{datasource.id}'
        ingestion_generator.delete_dag(ingest_dag_id)

        transform_dag_id = f'transform_{tenant_id}_{datasource.id}'
        self._transform_generator.delete_dag(transform_dag_id)

        logger.info(f"Deleted pipeline for datasource {datasource.id}")

    def get_pipeline_status(self, tenant_id: str, datasource) -> Dict[str, Any]:
        """Get status of a pipeline's DAGs."""
        ingest_dag_id = f'ingest_{tenant_id}_{datasource.id}'
        transform_dag_id = f'transform_{tenant_id}_{datasource.id}'

        try:
            ingest_status = self.airflow_client.get_dag_status(ingest_dag_id)
        except Exception as e:
            ingest_status = {'error': str(e)}

        try:
            transform_status = self.airflow_client.get_dag_status(transform_dag_id)
        except Exception as e:
            transform_status = {'error': str(e)}

        return {
            'ingestion': {'dag_id': ingest_dag_id, 'status': ingest_status},
            'transformation': {'dag_id': transform_dag_id, 'status': transform_status},
        }


# ---------------------------------------------------------------------------
# Fluent Builder
# ---------------------------------------------------------------------------

class FullPipelineBuilder:
    """
    Fluent builder for creating complex pipelines.

    Usage::

        pipeline = (
            FullPipelineBuilder(datasource)
            .add_tables(tables)
            .with_schedule('@hourly')
            .with_tests(True)
            .with_upstream_dependency('dag_id')
            .build()
        )
    """

    def __init__(self, datasource):
        self.datasource = datasource
        self.tables: list = []
        self.schedule = '@hourly'
        self.run_tests = True
        self.include_marts = True
        self.upstream_dags: List[str] = []
        self.downstream_dags: List[str] = []
        self._pipeline_generator: Optional[PipelineGenerator] = None

    def add_tables(self, tables) -> 'FullPipelineBuilder':
        self.tables.extend(tables)
        return self

    def add_table(self, table) -> 'FullPipelineBuilder':
        self.tables.append(table)
        return self

    def with_schedule(self, schedule: str) -> 'FullPipelineBuilder':
        self.schedule = schedule
        return self

    def with_tests(self, enabled: bool = True) -> 'FullPipelineBuilder':
        self.run_tests = enabled
        return self

    def with_marts(self, enabled: bool = True) -> 'FullPipelineBuilder':
        self.include_marts = enabled
        return self

    def with_upstream_dependency(self, dag_id: str) -> 'FullPipelineBuilder':
        self.upstream_dags.append(dag_id)
        return self

    def with_downstream_trigger(self, dag_id: str) -> 'FullPipelineBuilder':
        self.downstream_dags.append(dag_id)
        return self

    def with_generator(self, generator: PipelineGenerator) -> 'FullPipelineBuilder':
        self._pipeline_generator = generator
        return self

    def build(self) -> Dict[str, Any]:
        if not self.tables:
            raise PipelineValidationError("No tables specified for pipeline")

        generator = self._pipeline_generator or PipelineGenerator()

        if self.upstream_dags or self.downstream_dags:
            return generator.generate_pipeline_with_dependencies(
                datasource=self.datasource,
                tables=self.tables,
                upstream_dags=self.upstream_dags,
                downstream_dags=self.downstream_dags,
                schedule=self.schedule,
            )
        else:
            return generator.generate_full_pipeline(
                datasource=self.datasource,
                tables=self.tables,
                schedule=self.schedule,
                run_dbt_tests=self.run_tests,
                include_marts=self.include_marts,
            )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_pipeline_generator() -> PipelineGenerator:
    """Get a pipeline generator instance."""
    return PipelineGenerator()
