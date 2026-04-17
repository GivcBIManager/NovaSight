"""
NovaSight Orchestration Domain — Pipeline Service
===================================================

Application-layer service for generating complete ingestion +
transformation pipelines using Dagster software-defined assets.

Canonical location: ``app.domains.orchestration.application.pipeline_service``
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from app.domains.orchestration.infrastructure.dagster_client import DagsterClient
from app.domains.orchestration.infrastructure.asset_factory import AssetFactory
from app.domains.orchestration.infrastructure.schedule_factory import ScheduleFactory

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
    Generates complete ingestion + transformation pipelines
    using Dagster software-defined assets and schedules.

    This service coordinates:
    1. Ingestion asset definitions (extract from source → load to ClickHouse)
    2. Transformation asset definitions (dbt models → staging → marts)

    Transformation assets depend on ingestion assets via Dagster's
    native dependency graph — no external sensors needed.

    All generated code comes from pre-approved templates (ADR-002 compliant).
    """

    def __init__(
        self,
        template_engine=None,
        dagster_client: Optional[DagsterClient] = None,
    ):
        if template_engine is None:
            from app.services.template_engine import TemplateEngine
            template_engine = TemplateEngine()

        self.template_engine = template_engine
        self.dagster_client = dagster_client or DagsterClient()

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
        Generate both ingestion and transformation asset definitions.

        Args:
            datasource: Data source configuration
            tables: List of tables to ingest
            schedule: Cron expression or preset (e.g., '@hourly')
            run_dbt_tests: Whether to run dbt tests after transformations
            include_marts: Whether to include mart models

        Returns:
            Dictionary with ingestion and transformation job names
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

        ingestion_job = f"ingest_{tenant_id}_{datasource.id}"
        transform_job = f"transform_{tenant_id}_{datasource.id}"

        cron_schedule = ScheduleFactory.PRESET_TO_CRON.get(schedule, schedule)

        try:
            self.dagster_client.reload_repository()
        except Exception as e:
            logger.warning(f"Failed to reload Dagster repository: {e}")

        logger.info(f"Generated ingestion job: {ingestion_job}")
        logger.info(f"Generated transformation job: {transform_job}")

        return {
            'ingestion_job': ingestion_job,
            'transformation_job': transform_job,
            'tenant_id': tenant_id,
            'datasource_id': str(datasource.id),
            'tables_count': len(tables),
            'schedule': schedule,
            'cron_schedule': cron_schedule,
            'generated_at': datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------
    # Pipeline with dependencies
    # ------------------------------------------------------------------

    def generate_pipeline_with_dependencies(
        self,
        datasource,
        tables,
        upstream_jobs: Optional[List[str]] = None,
        downstream_jobs: Optional[List[str]] = None,
        schedule: str = '@hourly',
    ) -> Dict[str, Any]:
        """Generate a pipeline with upstream and downstream dependencies."""
        result = self.generate_full_pipeline(
            datasource=datasource,
            tables=tables,
            schedule=schedule,
        )

        result['upstream_jobs'] = upstream_jobs or []
        result['downstream_jobs'] = downstream_jobs or []

        return result

    # ------------------------------------------------------------------
    # Update / Delete
    # ------------------------------------------------------------------

    def update_pipeline(
        self,
        datasource,
        tables,
        schedule: Optional[str] = None,
    ) -> Dict[str, str]:
        """Update an existing pipeline (reload Dagster definitions)."""
        return self.generate_full_pipeline(
            datasource=datasource,
            tables=tables,
            schedule=schedule or '@hourly',
        )

    def delete_pipeline(self, tenant_id: str, datasource) -> None:
        """Delete all jobs associated with a pipeline."""
        ingestion_job = f"ingest_{tenant_id}_{datasource.id}"
        transform_job = f"transform_{tenant_id}_{datasource.id}"

        try:
            self.dagster_client.terminate_job(ingestion_job)
        except Exception as e:
            logger.warning(f"Failed to terminate ingestion job: {e}")

        try:
            self.dagster_client.terminate_job(transform_job)
        except Exception as e:
            logger.warning(f"Failed to terminate transformation job: {e}")

        logger.info(f"Deleted pipeline for datasource {datasource.id}")

    def get_pipeline_status(self, tenant_id: str, datasource) -> Dict[str, Any]:
        """Get status of a pipeline's jobs from Dagster."""
        ingestion_job = f"ingest_{tenant_id}_{datasource.id}"
        transform_job = f"transform_{tenant_id}_{datasource.id}"

        try:
            ingest_runs = self.dagster_client.get_job_runs(f"{ingestion_job}_job", limit=1)
            ingest_status = {"state": ingest_runs[0].state} if ingest_runs else {"state": "none"}
        except Exception as e:
            ingest_status = {'error': str(e)}

        try:
            transform_runs = self.dagster_client.get_job_runs(f"{transform_job}_job", limit=1)
            transform_status = {"state": transform_runs[0].state} if transform_runs else {"state": "none"}
        except Exception as e:
            transform_status = {'error': str(e)}

        return {
            'ingestion': {'job': ingestion_job, 'status': ingest_status},
            'transformation': {'job': transform_job, 'status': transform_status},
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
            .build()
        )
    """

    def __init__(self, datasource):
        self.datasource = datasource
        self.tables: list = []
        self.schedule = '@hourly'
        self.run_tests = True
        self.include_marts = True
        self.upstream_jobs: List[str] = []
        self.downstream_jobs: List[str] = []
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

    def with_upstream_dependency(self, job_name: str) -> 'FullPipelineBuilder':
        self.upstream_jobs.append(job_name)
        return self

    def with_downstream_trigger(self, job_name: str) -> 'FullPipelineBuilder':
        self.downstream_jobs.append(job_name)
        return self

    def with_generator(self, generator: PipelineGenerator) -> 'FullPipelineBuilder':
        self._pipeline_generator = generator
        return self

    def build(self) -> Dict[str, Any]:
        if not self.tables:
            raise PipelineValidationError("No tables specified for pipeline")

        generator = self._pipeline_generator or PipelineGenerator()

        if self.upstream_jobs or self.downstream_jobs:
            return generator.generate_pipeline_with_dependencies(
                datasource=self.datasource,
                tables=self.tables,
                upstream_jobs=self.upstream_jobs,
                downstream_jobs=self.downstream_jobs,
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
