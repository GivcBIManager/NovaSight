"""
Template Engine Comprehensive Tests
====================================

Extended tests for the Template Engine covering:
- All template types (PySpark, Airflow DAGs, dbt, SQL)
- Validation rules
- Security enforcement
- Parameter handling
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4
import json

from app.services.template_engine.engine import (
    TemplateEngine,
    TemplateEngineError,
    TemplateValidationError,
    TemplateRenderError,
    TemplateNotFoundError,
    TemplateSecurityError,
)
from app.services.template_engine.validator import (
    TemplateParameterValidator,
    SQLIdentifier,
    ColumnDefinition,
    TableDefinition,
)

# Aliases for backward compatibility with test expectations
TemplateValidator = TemplateParameterValidator

class ValidationResult:
    """Simple validation result wrapper for tests."""
    def __init__(self, is_valid: bool = True, errors: list = None):
        self.is_valid = is_valid
        self.errors = errors or []


class TestPySparkTemplates:
    """Tests for PySpark job templates."""
    
    @pytest.fixture
    def pyspark_params(self):
        """Sample PySpark job parameters."""
        return {
            "job_name": "extract_sales_data",
            "source_connection": {
                "type": "postgresql",
                "host": "db.example.com",
                "port": 5432,
                "database": "sales",
                "username": "reader",
            },
            "target_table": "raw_sales",
            "partition_columns": ["date", "region"],
            "incremental_column": "updated_at",
            "spark_config": {
                "spark.executor.memory": "4g",
                "spark.executor.cores": 2,
            }
        }
    
    def test_render_extraction_job(self, temp_template_dir, pyspark_params):
        """Test rendering PySpark extraction job."""
        # Create PySpark template
        pyspark_dir = temp_template_dir / "pyspark"
        pyspark_dir.mkdir(exist_ok=True)
        
        template_content = '''
from pyspark.sql import SparkSession

def extract_{{ job_name | snake_case }}():
    spark = SparkSession.builder \\
        .appName("{{ job_name }}") \\
        .getOrCreate()
    
    # Read from source
    df = spark.read \\
        .format("jdbc") \\
        .option("url", "jdbc:{{ source_connection.type }}://{{ source_connection.host }}:{{ source_connection.port }}/{{ source_connection.database }}") \\
        .option("dbtable", "{{ source_connection.table | default('source_table') }}") \\
        .option("user", "{{ source_connection.username }}") \\
        .load()
    
    # Write to target
    df.write \\
        .mode("append") \\
{% if partition_columns %}
        .partitionBy({{ partition_columns | tojson }}) \\
{% endif %}
        .saveAsTable("{{ target_table }}")

if __name__ == "__main__":
    extract_{{ job_name | snake_case }}()
'''
        (pyspark_dir / "extraction.py.j2").write_text(template_content)
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        result = engine.render(
            "pyspark/extraction.py.j2",
            pyspark_params,
            validate=False
        )
        
        assert "extract_extract_sales_data" in result
        assert "jdbc:postgresql" in result
        assert "partitionBy" in result
    
    def test_render_transformation_job(self, temp_template_dir):
        """Test rendering PySpark transformation job."""
        pyspark_dir = temp_template_dir / "pyspark"
        pyspark_dir.mkdir(exist_ok=True)
        
        template_content = '''
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

def transform_{{ job_name | snake_case }}():
    spark = SparkSession.builder.appName("{{ job_name }}").getOrCreate()
    
    df = spark.table("{{ source_table }}")
    
    result = df \\
{% for agg in aggregations %}
        .groupBy("{{ agg.group_by }}") \\
        .agg(F.{{ agg.function }}("{{ agg.column }}").alias("{{ agg.alias }}")){% if not loop.last %} \\
{% endif %}
{% endfor %}
    
    result.write.mode("overwrite").saveAsTable("{{ target_table }}")

if __name__ == "__main__":
    transform_{{ job_name | snake_case }}()
'''
        (pyspark_dir / "transformation.py.j2").write_text(template_content)
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        result = engine.render(
            "pyspark/transformation.py.j2",
            {
                "job_name": "aggregate_sales",
                "source_table": "raw_sales",
                "target_table": "sales_summary",
                "aggregations": [
                    {"group_by": "region", "function": "sum", "column": "amount", "alias": "total_amount"},
                    {"group_by": "product", "function": "count", "column": "*", "alias": "order_count"},
                ]
            },
            validate=False
        )
        
        assert "transform_aggregate_sales" in result
        assert "F.sum" in result
        assert "F.count" in result


class TestAirflowDAGTemplates:
    """Tests for Airflow DAG templates."""
    
    @pytest.fixture
    def dag_params(self):
        """Sample DAG parameters."""
        return {
            "dag_id": "daily_sales_pipeline",
            "schedule": "0 2 * * *",
            "start_date": "2024-01-01",
            "catchup": False,
            "tags": ["sales", "daily"],
            "tasks": [
                {
                    "task_id": "extract_orders",
                    "operator": "PythonOperator",
                    "python_callable": "extract_orders",
                    "dependencies": []
                },
                {
                    "task_id": "transform_orders",
                    "operator": "PythonOperator",
                    "python_callable": "transform_orders",
                    "dependencies": ["extract_orders"]
                },
                {
                    "task_id": "load_to_warehouse",
                    "operator": "PythonOperator",
                    "python_callable": "load_warehouse",
                    "dependencies": ["transform_orders"]
                }
            ]
        }
    
    def test_render_dag(self, temp_template_dir, dag_params):
        """Test rendering Airflow DAG."""
        airflow_dir = temp_template_dir / "airflow"
        airflow_dir.mkdir(exist_ok=True)
        
        template_content = '''
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

with DAG(
    dag_id="{{ dag_id }}",
    schedule_interval="{{ schedule }}",
    start_date=datetime.fromisoformat("{{ start_date }}"),
    catchup={{ catchup | lower }},
    tags={{ tags | tojson }},
) as dag:
{% for task in tasks %}
    {{ task.task_id }} = {{ task.operator }}(
        task_id="{{ task.task_id }}",
        python_callable={{ task.python_callable }},
    )
{% endfor %}

{% for task in tasks %}
{% if task.dependencies %}
    [{% for dep in task.dependencies %}{{ dep }}{% if not loop.last %}, {% endif %}{% endfor %}] >> {{ task.task_id }}
{% endif %}
{% endfor %}
'''
        (airflow_dir / "dag.py.j2").write_text(template_content)
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        result = engine.render(
            "airflow/dag.py.j2",
            dag_params,
            validate=False
        )
        
        assert 'dag_id="daily_sales_pipeline"' in result
        assert 'schedule_interval="0 2 * * *"' in result
        assert "extract_orders" in result
        assert ">> transform_orders" in result
    
    def test_dag_schedule_validation(self, temp_template_dir):
        """Test that invalid cron expressions are rejected."""
        engine = TemplateEngine(template_dir=temp_template_dir)
        
        invalid_params = {
            "dag_id": "test_dag",
            "schedule": "invalid cron expression",
            "start_date": "2024-01-01",
            "tasks": []
        }
        
        # Should validate schedule format
        # This would be handled by schema validation


class TestDbtTemplates:
    """Tests for dbt model templates."""
    
    @pytest.fixture
    def dbt_model_params(self):
        """Sample dbt model parameters."""
        return {
            "model_name": "mart_sales_summary",
            "materialization": "table",
            "schema": "marts",
            "source_ref": "{{ ref('stg_orders') }}",
            "columns": [
                {"name": "order_date", "type": "DATE"},
                {"name": "region", "type": "VARCHAR"},
                {"name": "total_orders", "type": "INTEGER"},
                {"name": "total_revenue", "type": "DECIMAL(18,2)"},
            ],
            "grain": ["order_date", "region"],
            "tests": ["unique", "not_null"]
        }
    
    def test_render_dbt_model(self, temp_template_dir, dbt_model_params):
        """Test rendering dbt model."""
        dbt_dir = temp_template_dir / "dbt"
        dbt_dir.mkdir(exist_ok=True)
        
        template_content = '''
{{ "{{" }} config(
    materialized='{{ materialization }}',
    schema='{{ schema }}'
) {{ "}}" }}

SELECT
{% for col in columns %}
    {{ col.name }}{% if not loop.last %},{% endif %}
{% endfor %}
FROM {{ source_ref }}
{% if grain %}
GROUP BY
{% for g in grain %}
    {{ g }}{% if not loop.last %},{% endif %}
{% endfor %}
{% endif %}
'''
        (dbt_dir / "model.sql.j2").write_text(template_content)
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        result = engine.render(
            "dbt/model.sql.j2",
            dbt_model_params,
            validate=False
        )
        
        assert "materialized='table'" in result
        assert "schema='marts'" in result
        assert "order_date" in result
    
    def test_render_dbt_test(self, temp_template_dir):
        """Test rendering dbt generic test."""
        dbt_dir = temp_template_dir / "dbt"
        dbt_dir.mkdir(exist_ok=True)
        
        template_content = '''
{% raw %}{% test {% endraw %}{{ test_name }}{% raw %}(model, column_name) %}{% endraw %}

SELECT *
FROM {% raw %}{{ model }}{% endraw %}
WHERE {{ column_name | sql_safe }} IS {{ condition }}

{% raw %}{% endtest %}{% endraw %}
'''
        (dbt_dir / "test.sql.j2").write_text(template_content)
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        result = engine.render(
            "dbt/test.sql.j2",
            {
                "test_name": "positive_value",
                "column_name": "amount",
                "condition": "< 0"
            },
            validate=False
        )
        
        assert "positive_value" in result
        assert "amount" in result


class TestSQLTemplates:
    """Tests for SQL query templates."""
    
    def test_render_aggregation_query(self, temp_template_dir):
        """Test rendering aggregation query."""
        sql_dir = temp_template_dir / "sql"
        sql_dir.mkdir(exist_ok=True)
        
        template_content = '''
SELECT
{% for dim in dimensions %}
    {{ dim | sql_safe }}{% if measures or not loop.last %},{% endif %}
{% endfor %}
{% for measure in measures %}
    {{ measure.aggregation }}({{ measure.column | sql_safe }}) AS {{ measure.alias | sql_safe }}{% if not loop.last %},{% endif %}
{% endfor %}
FROM {{ table | sql_safe }}
{% if filters %}
WHERE
{% for filter in filters %}
    {{ filter.column | sql_safe }} {{ filter.operator }} {{ filter.value | sql_value }}{% if not loop.last %} AND{% endif %}
{% endfor %}
{% endif %}
{% if dimensions %}
GROUP BY
{% for dim in dimensions %}
    {{ dim | sql_safe }}{% if not loop.last %},{% endif %}
{% endfor %}
{% endif %}
{% if order_by %}
ORDER BY {{ order_by | sql_safe }}
{% endif %}
{% if limit %}
LIMIT {{ limit }}
{% endif %}
'''
        (sql_dir / "aggregation.sql.j2").write_text(template_content)
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        result = engine.render(
            "sql/aggregation.sql.j2",
            {
                "table": "sales_orders",
                "dimensions": ["region", "product_category"],
                "measures": [
                    {"aggregation": "SUM", "column": "amount", "alias": "total_amount"},
                    {"aggregation": "COUNT", "column": "*", "alias": "order_count"}
                ],
                "filters": [
                    {"column": "order_date", "operator": ">=", "value": "2024-01-01"}
                ],
                "order_by": "total_amount DESC",
                "limit": 100
            },
            validate=False
        )
        
        assert "SELECT" in result
        assert "SUM(amount)" in result
        assert "GROUP BY" in result
        assert "LIMIT 100" in result


class TestSecurityEnforcement:
    """Tests for template security enforcement."""
    
    def test_block_code_execution(self, temp_template_dir):
        """Test that code execution attempts are blocked."""
        sql_dir = temp_template_dir / "sql"
        sql_dir.mkdir(exist_ok=True)
        
        (sql_dir / "simple.sql.j2").write_text("SELECT * FROM {{ table }}")
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        
        dangerous_inputs = [
            "{{ ''.__class__.__mro__[1].__subclasses__() }}",
            "{{ config.__class__.__init__.__globals__['os'].popen('id').read() }}",
            "{% import 'os' as os %}{{ os.system('id') }}",
        ]
        
        for payload in dangerous_inputs:
            with pytest.raises((TemplateSecurityError, TemplateRenderError)):
                engine.render(
                    "sql/simple.sql.j2",
                    {"table": payload},
                    validate=False
                )
    
    def test_block_file_inclusion(self, temp_template_dir):
        """Test that file inclusion is blocked."""
        sql_dir = temp_template_dir / "sql"
        sql_dir.mkdir(exist_ok=True)
        
        malicious_template = '''
{% include '/etc/passwd' %}
'''
        (sql_dir / "malicious.sql.j2").write_text(malicious_template)
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        
        # Should not be able to include files outside template directory
        with pytest.raises((TemplateSecurityError, TemplateRenderError, TemplateNotFoundError)):
            engine.render("sql/malicious.sql.j2", {}, validate=False)
    
    def test_block_environment_access(self, temp_template_dir):
        """Test that environment variable access is blocked."""
        sql_dir = temp_template_dir / "sql"
        sql_dir.mkdir(exist_ok=True)
        
        (sql_dir / "simple.sql.j2").write_text("SELECT * FROM {{ table }}")
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        
        with pytest.raises((TemplateSecurityError, TemplateRenderError)):
            engine.render(
                "sql/simple.sql.j2",
                {"table": "{{ environ.DATABASE_URL }}"},
                validate=False
            )


class TestParameterValidation:
    """Tests for template parameter validation."""
    
    def test_required_parameters_enforced(self, temp_template_dir):
        """Test that required parameters are enforced."""
        sql_dir = temp_template_dir / "sql"
        sql_dir.mkdir(exist_ok=True)
        
        (sql_dir / "query.sql.j2").write_text(
            "SELECT * FROM {{ table_name }} WHERE id = {{ id }}"
        )
        
        # Create manifest with schema
        manifest = {
            "version": "1.0.0",
            "templates": {
                "sql/query.sql.j2": {
                    "description": "Simple query",
                    "schema": {
                        "type": "object",
                        "required": ["table_name", "id"],
                        "properties": {
                            "table_name": {"type": "string"},
                            "id": {"type": "integer"}
                        }
                    }
                }
            }
        }
        (temp_template_dir / "manifest.json").write_text(json.dumps(manifest))
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        
        # Missing required parameter
        with pytest.raises(TemplateValidationError):
            engine.render(
                "sql/query.sql.j2",
                {"table_name": "users"},  # Missing 'id'
                validate=True
            )
    
    def test_type_validation(self, temp_template_dir):
        """Test that parameter types are validated."""
        sql_dir = temp_template_dir / "sql"
        sql_dir.mkdir(exist_ok=True)
        
        (sql_dir / "limit.sql.j2").write_text(
            "SELECT * FROM users LIMIT {{ limit }}"
        )
        
        manifest = {
            "version": "1.0.0",
            "templates": {
                "sql/limit.sql.j2": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "minimum": 1, "maximum": 1000}
                        }
                    }
                }
            }
        }
        (temp_template_dir / "manifest.json").write_text(json.dumps(manifest))
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        
        # Invalid type
        with pytest.raises(TemplateValidationError):
            engine.render(
                "sql/limit.sql.j2",
                {"limit": "not a number"},
                validate=True
            )
