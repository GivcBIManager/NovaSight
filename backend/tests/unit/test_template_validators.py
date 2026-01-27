"""
Unit Tests for Template Engine Validators
==========================================

Tests for Pydantic validators used in template parameter validation.
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from app.services.template_engine.validator import (
    SQLIdentifier,
    ColumnDefinition,
    IndexDefinition,
    TableDefinition,
    DbtColumnDefinition,
    DbtModelDefinition,
    AirflowTaskDefinition,
    AirflowDefaultArgs,
    AirflowDagDefinition,
    ClickHouseColumnDefinition,
    ClickHouseTableDefinition,
    TemplateParameterValidator,
)


class TestSQLIdentifier:
    """Tests for SQLIdentifier validator."""

    def test_valid_identifier(self):
        result = SQLIdentifier(name="valid_name")
        assert result.name == "valid_name"

    def test_valid_with_numbers(self):
        result = SQLIdentifier(name="table123")
        assert result.name == "table123"

    def test_invalid_starts_with_number(self):
        with pytest.raises(ValidationError) as exc_info:
            SQLIdentifier(name="123invalid")
        assert "Invalid SQL identifier" in str(exc_info.value)

    def test_invalid_special_characters(self):
        with pytest.raises(ValidationError):
            SQLIdentifier(name="invalid-name")

    def test_invalid_uppercase(self):
        with pytest.raises(ValidationError):
            SQLIdentifier(name="InvalidName")

    def test_reserved_word_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            SQLIdentifier(name="select")
        assert "reserved word" in str(exc_info.value)

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            SQLIdentifier(name="")


class TestColumnDefinition:
    """Tests for ColumnDefinition validator."""

    def test_valid_column(self):
        col = ColumnDefinition(
            name="user_id",
            type="UUID",
            nullable=False,
            primary_key=True
        )
        assert col.name == "user_id"
        assert col.type == "UUID"
        assert col.nullable is False
        assert col.primary_key is True

    def test_valid_varchar_with_length(self):
        col = ColumnDefinition(name="username", type="VARCHAR(255)")
        assert col.type == "VARCHAR(255)"

    def test_valid_numeric_with_precision(self):
        col = ColumnDefinition(name="amount", type="NUMERIC(10,2)")
        assert col.type == "NUMERIC(10,2)"

    def test_invalid_column_name(self):
        with pytest.raises(ValidationError):
            ColumnDefinition(name="Invalid-Name", type="TEXT")

    def test_invalid_column_type(self):
        with pytest.raises(ValidationError) as exc_info:
            ColumnDefinition(name="col", type="INVALID_TYPE")
        assert "Invalid column type" in str(exc_info.value)

    def test_default_value_validation(self):
        # Valid default
        col = ColumnDefinition(name="created_at", type="TIMESTAMP", default="NOW()")
        assert col.default == "NOW()"

    def test_dangerous_default_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            ColumnDefinition(name="col", type="TEXT", default="'; DROP TABLE users; --")
        assert "dangerous pattern" in str(exc_info.value)


class TestTableDefinition:
    """Tests for TableDefinition validator."""

    def test_valid_table(self):
        table = TableDefinition(
            table_name="users",
            columns=[
                ColumnDefinition(name="id", type="UUID", primary_key=True),
                ColumnDefinition(name="email", type="VARCHAR(255)")
            ]
        )
        assert table.table_name == "users"
        assert len(table.columns) == 2
        assert table.tenant_aware is True

    def test_default_schema(self):
        table = TableDefinition(
            table_name="test",
            columns=[ColumnDefinition(name="id", type="INTEGER", primary_key=True)]
        )
        assert table.schema_name == "public"

    def test_tenant_aware_requires_primary_key(self):
        with pytest.raises(ValidationError) as exc_info:
            TableDefinition(
                table_name="test",
                columns=[ColumnDefinition(name="col", type="TEXT")],
                tenant_aware=True
            )
        assert "primary key" in str(exc_info.value)

    def test_duplicate_column_names_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            TableDefinition(
                table_name="test",
                columns=[
                    ColumnDefinition(name="id", type="INTEGER", primary_key=True),
                    ColumnDefinition(name="id", type="TEXT")  # Duplicate!
                ]
            )
        assert "Duplicate column names" in str(exc_info.value)

    def test_invalid_table_name(self):
        with pytest.raises(ValidationError):
            TableDefinition(
                table_name="Invalid-Table",
                columns=[ColumnDefinition(name="id", type="INTEGER", primary_key=True)]
            )


class TestDbtModelDefinition:
    """Tests for DbtModelDefinition validator."""

    def test_valid_model(self):
        model = DbtModelDefinition(
            model_name="stg_customers",
            description="Staging model for customers",
            materialized="table"
        )
        assert model.model_name == "stg_customers"
        assert model.materialized == "table"

    def test_default_materialized(self):
        model = DbtModelDefinition(model_name="test_model")
        assert model.materialized == "view"

    def test_invalid_model_name(self):
        with pytest.raises(ValidationError):
            DbtModelDefinition(model_name="Invalid-Model")

    def test_invalid_materialized(self):
        with pytest.raises(ValidationError):
            DbtModelDefinition(model_name="test", materialized="invalid")

    def test_incremental_with_unique_key(self):
        model = DbtModelDefinition(
            model_name="incremental_model",
            materialized="incremental",
            unique_key=["id", "updated_at"],
            incremental_strategy="merge"
        )
        assert model.unique_key == ["id", "updated_at"]
        assert model.incremental_strategy == "merge"

    def test_valid_tags(self):
        model = DbtModelDefinition(
            model_name="test",
            tags=["staging", "customers", "pii-data"]
        )
        assert len(model.tags) == 3

    def test_invalid_tag(self):
        with pytest.raises(ValidationError):
            DbtModelDefinition(model_name="test", tags=["Invalid Tag!"])


class TestAirflowDagDefinition:
    """Tests for AirflowDagDefinition validator."""

    def test_valid_dag(self):
        dag = AirflowDagDefinition(
            dag_id="tenant.ingestion_pipeline",
            description="Data ingestion pipeline",
            schedule="0 * * * *",
            start_date=datetime(2026, 1, 1),
            tasks=[
                AirflowTaskDefinition(task_id="extract", task_type="python"),
                AirflowTaskDefinition(task_id="transform", task_type="dbt_run"),
            ]
        )
        assert dag.dag_id == "tenant.ingestion_pipeline"
        assert len(dag.tasks) == 2

    def test_preset_schedule(self):
        dag = AirflowDagDefinition(
            dag_id="test_dag",
            start_date=datetime(2026, 1, 1),
            schedule="@daily",
            tasks=[AirflowTaskDefinition(task_id="task1", task_type="python")]
        )
        assert dag.schedule == "@daily"

    def test_invalid_schedule(self):
        with pytest.raises(ValidationError):
            AirflowDagDefinition(
                dag_id="test",
                start_date=datetime(2026, 1, 1),
                schedule="invalid cron",
                tasks=[AirflowTaskDefinition(task_id="t", task_type="python")]
            )

    def test_duplicate_task_ids_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            AirflowDagDefinition(
                dag_id="test",
                start_date=datetime(2026, 1, 1),
                tasks=[
                    AirflowTaskDefinition(task_id="task1", task_type="python"),
                    AirflowTaskDefinition(task_id="task1", task_type="bash"),  # Duplicate!
                ]
            )
        assert "Duplicate task_ids" in str(exc_info.value)

    def test_invalid_upstream_reference(self):
        with pytest.raises(ValidationError) as exc_info:
            AirflowDagDefinition(
                dag_id="test",
                start_date=datetime(2026, 1, 1),
                tasks=[
                    AirflowTaskDefinition(
                        task_id="task1",
                        task_type="python",
                        upstream_tasks=["nonexistent"]
                    ),
                ]
            )
        assert "unknown upstream task" in str(exc_info.value)


class TestClickHouseTableDefinition:
    """Tests for ClickHouseTableDefinition validator."""

    def test_valid_table(self):
        table = ClickHouseTableDefinition(
            table_name="events",
            columns=[
                ClickHouseColumnDefinition(name="event_id", type="UUID"),
                ClickHouseColumnDefinition(name="timestamp", type="DateTime64(3)"),
                ClickHouseColumnDefinition(name="value", type="Float64"),
            ],
            order_by=["timestamp", "event_id"]
        )
        assert table.table_name == "events"
        assert table.engine == "MergeTree"

    def test_with_partitioning(self):
        table = ClickHouseTableDefinition(
            table_name="logs",
            columns=[
                ClickHouseColumnDefinition(name="log_date", type="Date"),
                ClickHouseColumnDefinition(name="message", type="String"),
            ],
            order_by=["log_date"],
            partition_by="toYYYYMM(log_date)"
        )
        assert table.partition_by == "toYYYYMM(log_date)"

    def test_invalid_engine(self):
        with pytest.raises(ValidationError):
            ClickHouseTableDefinition(
                table_name="test",
                columns=[ClickHouseColumnDefinition(name="id", type="UInt64")],
                order_by=["id"],
                engine="InvalidEngine"
            )


class TestTemplateParameterValidator:
    """Tests for TemplateParameterValidator class."""

    def test_get_schema_exists(self):
        schema = TemplateParameterValidator.get_schema("sql/create_table.sql.j2")
        assert schema is TableDefinition

    def test_get_schema_not_found(self):
        schema = TemplateParameterValidator.get_schema("nonexistent.j2")
        assert schema is None

    def test_validate_success(self):
        result = TemplateParameterValidator.validate(
            "sql/create_table.sql.j2",
            {
                "table_name": "users",
                "columns": [{"name": "id", "type": "UUID", "primary_key": True}]
            }
        )
        assert isinstance(result, TableDefinition)

    def test_validate_failure(self):
        with pytest.raises(ValueError):
            TemplateParameterValidator.validate(
                "sql/create_table.sql.j2",
                {"table_name": "invalid-name", "columns": []}
            )

    def test_validate_no_schema(self):
        with pytest.raises(ValueError) as exc_info:
            TemplateParameterValidator.validate("unknown_template.j2", {})
        assert "No schema defined" in str(exc_info.value)

    def test_register_schema(self):
        from pydantic import BaseModel
        
        class CustomSchema(BaseModel):
            name: str
        
        TemplateParameterValidator.register_schema("custom/template.j2", CustomSchema)
        schema = TemplateParameterValidator.get_schema("custom/template.j2")
        assert schema is CustomSchema
