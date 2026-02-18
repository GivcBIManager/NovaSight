"""
NovaSight Semantic Layer YAML Generator
========================================

Generates dbt Semantic Layer YAML files (MetricFlow format) from
PostgreSQL SemanticModel entities.

This enables bidirectional sync between the visual semantic layer builder
and dbt's native semantic layer definitions.
"""

import logging
import yaml
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.domains.transformation.domain.models import (
    SemanticModel,
    Dimension,
    Measure,
    Relationship,
    DimensionType,
    AggregationType,
    ModelType,
    RelationshipType,
)

logger = logging.getLogger(__name__)


class SemanticYAMLGeneratorError(Exception):
    """Base exception for semantic YAML generator errors."""
    pass


class SemanticYAMLGenerator:
    """
    Generates dbt Semantic Layer YAML from SemanticModel entities.
    
    The generator outputs MetricFlow-compatible YAML files that can be
    used with dbt's semantic layer for metric queries.
    
    Output files:
    - semantic_models.yml: Model definitions with dimensions, measures, entities
    - metrics.yml: Metric definitions derived from measures
    
    Usage:
        generator = SemanticYAMLGenerator(dbt_project_path)
        result = generator.export_models(tenant_id, models)
    """
    
    # Mapping from our AggregationType to MetricFlow aggregation
    AGG_TYPE_MAP = {
        AggregationType.SUM: "sum",
        AggregationType.COUNT: "count",
        AggregationType.COUNT_DISTINCT: "count_distinct",
        AggregationType.AVG: "average",
        AggregationType.MIN: "min",
        AggregationType.MAX: "max",
        AggregationType.MEDIAN: "median",
        AggregationType.PERCENTILE: "percentile",
        AggregationType.STDDEV: "stddev",
        AggregationType.VARIANCE: "variance",
    }
    
    # Mapping from our DimensionType to MetricFlow dimension type
    DIM_TYPE_MAP = {
        DimensionType.CATEGORICAL: "categorical",
        DimensionType.TEMPORAL: "time",
        DimensionType.NUMERIC: "categorical",  # MetricFlow doesn't have numeric dims
        DimensionType.HIERARCHICAL: "categorical",
    }
    
    def __init__(
        self,
        dbt_project_path: Optional[str] = None,
        output_dir: Optional[str] = None,
    ):
        """
        Initialize the generator.
        
        Args:
            dbt_project_path: Path to dbt project. Defaults to ./dbt
            output_dir: Output directory for YAML files. Defaults to models/semantic
        """
        if dbt_project_path:
            self.dbt_path = Path(dbt_project_path)
        else:
            self.dbt_path = Path(__file__).parent.parent.parent.parent.parent / 'dbt'
        
        if output_dir:
            self.output_dir = Path(output_dir)
        else:
            self.output_dir = self.dbt_path / 'models' / 'semantic'
        
        logger.info(f"SemanticYAMLGenerator initialized: output_dir={self.output_dir}")
    
    def export_models(
        self,
        models: List[SemanticModel],
        overwrite: bool = False,
    ) -> Dict[str, Any]:
        """
        Export semantic models to dbt YAML files.
        
        Args:
            models: List of SemanticModel instances to export
            overwrite: Whether to overwrite existing files
        
        Returns:
            Dictionary with:
              - files_created: List of newly created file paths
              - files_updated: List of updated file paths
              - errors: List of error messages
        """
        result = {
            "files_created": [],
            "files_updated": [],
            "errors": [],
        }
        
        if not models:
            return result
        
        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate semantic_models.yml
        try:
            sem_models_content = self._generate_semantic_models_yaml(models)
            sem_models_path = self.output_dir / "semantic_models.yml"
            
            existed = sem_models_path.exists()
            if existed and not overwrite:
                result["errors"].append(
                    f"File exists and overwrite=False: {sem_models_path}"
                )
            else:
                sem_models_path.write_text(sem_models_content, encoding='utf-8')
                if existed:
                    result["files_updated"].append(str(sem_models_path))
                else:
                    result["files_created"].append(str(sem_models_path))
                    
        except Exception as e:
            logger.error(f"Failed to generate semantic_models.yml: {e}")
            result["errors"].append(f"semantic_models.yml: {str(e)}")
        
        # Generate metrics.yml for measures with create_metric=True
        try:
            metrics_content = self._generate_metrics_yaml(models)
            if metrics_content:
                metrics_path = self.output_dir / "metrics.yml"
                
                existed = metrics_path.exists()
                if existed and not overwrite:
                    result["errors"].append(
                        f"File exists and overwrite=False: {metrics_path}"
                    )
                else:
                    metrics_path.write_text(metrics_content, encoding='utf-8')
                    if existed:
                        result["files_updated"].append(str(metrics_path))
                    else:
                        result["files_created"].append(str(metrics_path))
                        
        except Exception as e:
            logger.error(f"Failed to generate metrics.yml: {e}")
            result["errors"].append(f"metrics.yml: {str(e)}")
        
        return result
    
    def export_single_model(
        self,
        model: SemanticModel,
        include_metrics: bool = True,
    ) -> Dict[str, str]:
        """
        Export a single model to YAML strings (for preview).
        
        Args:
            model: SemanticModel to export
            include_metrics: Whether to generate metrics YAML
        
        Returns:
            Dictionary with 'semantic_model' and optionally 'metrics' YAML strings
        """
        result = {}
        
        # Generate semantic model YAML
        sem_model_dict = self._model_to_dict(model)
        result["semantic_model"] = yaml.dump(
            {"semantic_models": [sem_model_dict]},
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
        )
        
        # Generate metrics YAML if applicable
        if include_metrics:
            metrics = self._extract_metrics_from_model(model)
            if metrics:
                result["metrics"] = yaml.dump(
                    {"metrics": metrics},
                    default_flow_style=False,
                    sort_keys=False,
                    allow_unicode=True,
                )
        
        return result
    
    def _generate_semantic_models_yaml(self, models: List[SemanticModel]) -> str:
        """Generate the semantic_models.yml content."""
        semantic_models = []
        
        for model in models:
            try:
                model_dict = self._model_to_dict(model)
                semantic_models.append(model_dict)
            except Exception as e:
                logger.warning(f"Failed to convert model {model.name}: {e}")
        
        content = {
            "version": 2,
            "semantic_models": semantic_models,
        }
        
        # Add generation metadata as comment
        header = f"""# Generated by NovaSight Semantic Layer
# Generated at: {datetime.utcnow().isoformat()}
# DO NOT EDIT MANUALLY - changes will be overwritten

"""
        
        yaml_content = yaml.dump(
            content,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
            width=120,
        )
        
        return header + yaml_content
    
    def _generate_metrics_yaml(self, models: List[SemanticModel]) -> Optional[str]:
        """Generate the metrics.yml content from model measures."""
        all_metrics = []
        
        for model in models:
            metrics = self._extract_metrics_from_model(model)
            all_metrics.extend(metrics)
        
        if not all_metrics:
            return None
        
        content = {
            "version": 2,
            "metrics": all_metrics,
        }
        
        header = f"""# Generated by NovaSight Semantic Layer
# Generated at: {datetime.utcnow().isoformat()}
# DO NOT EDIT MANUALLY - changes will be overwritten

"""
        
        yaml_content = yaml.dump(
            content,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
            width=120,
        )
        
        return header + yaml_content
    
    def _model_to_dict(self, model: SemanticModel) -> Dict[str, Any]:
        """Convert a SemanticModel to MetricFlow dictionary format."""
        result = {
            "name": model.name,
            "model": f"ref('{model.dbt_model}')",
        }
        
        if model.description is not None:
            result["description"] = model.description
        
        # Entities - derived from primary keys in dimensions
        entities = []
        primary_keys = [d for d in (model.dimensions or []) if d.is_primary_key]
        
        for pk in primary_keys:
            entities.append({
                "name": pk.name,
                "type": "primary",
                "expr": pk.expression,
            })
        
        # If no explicit primary key, use model name as entity
        if not entities:
            entities.append({
                "name": f"{model.name}_id",
                "type": "primary",
                "expr": "id",  # Assume id column
            })
        
        result["entities"] = entities
        
        # Dimensions
        dimensions = []
        for dim in (model.dimensions or []):
            if dim.is_primary_key:
                continue  # Already added as entity
            
            dim_dict = {
                "name": dim.name,
                "type": self.DIM_TYPE_MAP.get(dim.type, "categorical"),
            }
            
            if dim.description:
                dim_dict["description"] = dim.description
            
            if dim.expression:
                dim_dict["expr"] = dim.expression
            
            # Handle time dimensions specially
            if dim.type == DimensionType.TEMPORAL:
                dim_dict["type"] = "time"
                dim_dict["type_params"] = {
                    "time_granularity": "day",  # Default granularity
                }
            
            dimensions.append(dim_dict)
        
        if dimensions:
            result["dimensions"] = dimensions
        
        # Measures
        measures = []
        for measure in (model.measures or []):
            measure_dict = {
                "name": measure.name,
                "agg": self.AGG_TYPE_MAP.get(measure.aggregation, "sum"),
                "expr": measure.expression,
            }
            
            if measure.description:
                measure_dict["description"] = measure.description
            
            # Flag to create metric automatically
            if measure.create_metric:
                measure_dict["create_metric"] = True
            
            measures.append(measure_dict)
        
        if measures:
            result["measures"] = measures
        
        # Add defaults if specified
        if model.meta is not None and model.meta.get("defaults"):  # type: ignore[union-attr]
            result["defaults"] = model.meta["defaults"]  # type: ignore[index]
        
        return result
    
    def _extract_metrics_from_model(self, model: SemanticModel) -> List[Dict[str, Any]]:
        """Extract metric definitions from model measures."""
        metrics = []
        
        for measure in (model.measures or []):
            if not measure.create_metric:
                continue
            
            metric = {
                "name": measure.name,
                "type": "simple",
                "type_params": {
                    "measure": measure.name,
                },
            }
            
            if measure.description:
                metric["description"] = measure.description
            
            if measure.label:
                metric["label"] = measure.label
            
            # Add filter if specified
            if measure.filter_sql:
                metric["filter"] = measure.filter_sql
            
            metrics.append(metric)
        
        return metrics
    
    def parse_yaml_file(self, filepath: str) -> Dict[str, Any]:
        """
        Parse an existing semantic layer YAML file.
        
        Args:
            filepath: Path to YAML file
        
        Returns:
            Parsed YAML content as dictionary
        """
        path = Path(filepath)
        if not path.exists():
            raise SemanticYAMLGeneratorError(f"File not found: {filepath}")
        
        content = path.read_text(encoding='utf-8')
        return yaml.safe_load(content)
    
    def validate_yaml(self, content: str) -> List[str]:
        """
        Validate semantic layer YAML content.
        
        Args:
            content: YAML string to validate
        
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        try:
            data = yaml.safe_load(content)
        except yaml.YAMLError as e:
            return [f"Invalid YAML syntax: {e}"]
        
        if not isinstance(data, dict):
            return ["Root must be a dictionary"]
        
        # Check for required keys
        if "semantic_models" in data:
            for i, model in enumerate(data["semantic_models"]):
                if not model.get("name"):
                    errors.append(f"semantic_models[{i}]: 'name' is required")
                if not model.get("model"):
                    errors.append(f"semantic_models[{i}]: 'model' is required")
                if not model.get("entities"):
                    errors.append(f"semantic_models[{i}]: 'entities' is required")
        
        if "metrics" in data:
            for i, metric in enumerate(data["metrics"]):
                if not metric.get("name"):
                    errors.append(f"metrics[{i}]: 'name' is required")
                if not metric.get("type"):
                    errors.append(f"metrics[{i}]: 'type' is required")
        
        return errors


# ============================================================================
# Factory Functions
# ============================================================================

_default_generator: Optional[SemanticYAMLGenerator] = None


def get_semantic_yaml_generator(
    dbt_project_path: Optional[str] = None,
) -> SemanticYAMLGenerator:
    """
    Get a SemanticYAMLGenerator instance.
    
    Args:
        dbt_project_path: Path to dbt project
    
    Returns:
        SemanticYAMLGenerator instance
    """
    global _default_generator
    
    if dbt_project_path:
        return SemanticYAMLGenerator(dbt_project_path)
    
    if _default_generator is None:
        _default_generator = SemanticYAMLGenerator()
    
    return _default_generator
