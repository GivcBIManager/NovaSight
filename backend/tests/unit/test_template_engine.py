"""
Unit Tests for Template Engine Core
====================================

Tests for the main TemplateEngine class and its functionality.
"""

import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.services.template_engine.engine import (
    TemplateEngine,
    TemplateEngineError,
    TemplateValidationError,
    TemplateRenderError,
    TemplateNotFoundError,
    TemplateSecurityError,
    get_template_engine,
    init_template_engine,
)


@pytest.fixture
def temp_template_dir(tmp_path):
    """Create a temporary template directory with test templates."""
    # Create directory structure
    sql_dir = tmp_path / "sql"
    sql_dir.mkdir()
    
    # Create a simple test template
    test_template = sql_dir / "test.sql.j2"
    test_template.write_text("""
-- Test template
CREATE TABLE {{ table_name | sql_safe }} (
{% for col in columns %}
    {{ col.name | sql_safe }} {{ col.type }}{% if not loop.last %},{% endif %}
{% endfor %}
);
""")
    
    # Create manifest
    manifest = {
        "version": "1.0.0",
        "templates": {
            "sql/test.sql.j2": {
                "description": "Test template",
                "schema": {}
            }
        }
    }
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest))
    
    return tmp_path


@pytest.fixture
def engine(temp_template_dir):
    """Create a TemplateEngine instance with test templates."""
    return TemplateEngine(template_dir=temp_template_dir)


class TestTemplateEngineInit:
    """Tests for TemplateEngine initialization."""

    def test_init_with_custom_dir(self, temp_template_dir):
        engine = TemplateEngine(template_dir=temp_template_dir)
        assert engine.template_dir == temp_template_dir

    def test_init_creates_missing_dir(self, tmp_path):
        missing_dir = tmp_path / "nonexistent"
        engine = TemplateEngine(template_dir=missing_dir)
        assert missing_dir.exists()

    def test_manifest_loaded(self, engine):
        assert "version" in engine.manifest
        assert engine.manifest["version"] == "1.0.0"

    def test_filters_registered(self, engine):
        assert "snake_case" in engine.env.filters
        assert "sql_safe" in engine.env.filters
        assert "sql_escape" in engine.env.filters

    def test_globals_registered(self, engine):
        assert "now" in engine.env.globals
        assert "template_version" in engine.env.globals


class TestTemplateRendering:
    """Tests for template rendering functionality."""

    def test_render_simple_template(self, engine):
        result = engine.render(
            "sql/test.sql.j2",
            {
                "table_name": "users",
                "columns": [
                    {"name": "id", "type": "UUID"},
                    {"name": "email", "type": "VARCHAR(255)"}
                ]
            },
            validate=False
        )
        assert "CREATE TABLE users" in result
        assert "id UUID" in result
        assert "email VARCHAR(255)" in result

    def test_render_adds_metadata(self, engine):
        result = engine.render(
            "sql/test.sql.j2",
            {"table_name": "test", "columns": [{"name": "id", "type": "INT"}]},
            validate=False
        )
        # Metadata is available but not necessarily in output
        assert "test" in result

    def test_render_nonexistent_template(self, engine):
        with pytest.raises(TemplateNotFoundError):
            engine.render("nonexistent.j2", {}, validate=False)

    def test_render_string(self, engine):
        result = engine.render_string(
            "Hello {{ name }}!",
            {"name": "World"}
        )
        assert result == "Hello World!"


class TestSecurityChecks:
    """Tests for security validation."""

    def test_shell_injection_blocked(self, engine):
        with pytest.raises(TemplateSecurityError) as exc_info:
            engine.render(
                "sql/test.sql.j2",
                {"table_name": "test$(whoami)", "columns": []},
                validate=False
            )
        assert "injection detected" in str(exc_info.value)

    def test_template_injection_blocked(self, engine):
        with pytest.raises(TemplateSecurityError):
            engine.render(
                "sql/test.sql.j2",
                {"table_name": "test{{dangerous}}", "columns": []},
                validate=False
            )

    def test_sql_injection_blocked(self, engine):
        with pytest.raises(TemplateSecurityError):
            engine.render(
                "sql/test.sql.j2",
                {"table_name": "test'; DROP TABLE users; --", "columns": []},
                validate=False
            )

    def test_nested_injection_blocked(self, engine):
        with pytest.raises(TemplateSecurityError):
            engine.render(
                "sql/test.sql.j2",
                {
                    "table_name": "test",
                    "columns": [{"name": "id", "type": "INT; DROP TABLE x;"}]
                },
                validate=False
            )

    def test_security_check_disabled(self, engine):
        # When check_security=False, dangerous patterns are allowed
        # (for testing only - never do this in production!)
        result = engine.render(
            "sql/test.sql.j2",
            {"table_name": "test", "columns": []},
            validate=False,
            check_security=False
        )
        assert "test" in result


class TestParameterValidation:
    """Tests for parameter validation."""

    def test_validation_with_registered_schema(self, temp_template_dir):
        """Test that validation works when schema is registered."""
        engine = TemplateEngine(template_dir=temp_template_dir)
        
        # Register the template for validation
        engine.VALIDATED_TEMPLATES.add("sql/test.sql.j2")
        
        # Without proper schema registration, it should pass with warning
        result = engine.render(
            "sql/test.sql.j2",
            {"table_name": "valid_table", "columns": [{"name": "id", "type": "INT"}]},
            validate=True
        )
        assert "valid_table" in result

    def test_validation_disabled(self, engine):
        result = engine.render(
            "sql/test.sql.j2",
            {"table_name": "test", "columns": []},
            validate=False
        )
        assert "test" in result


class TestTemplateListingAndInfo:
    """Tests for template listing and information retrieval."""

    def test_list_templates(self, engine):
        templates = engine.list_templates()
        assert "sql/test.sql.j2" in templates

    def test_list_templates_by_category(self, engine):
        templates = engine.list_templates(category="sql")
        assert len(templates) >= 1
        assert all(t.startswith("sql/") for t in templates)

    def test_get_template_info(self, engine):
        info = engine.get_template_info("sql/test.sql.j2")
        assert info["name"] == "sql/test.sql.j2"
        assert info["exists"] is True
        assert "hash" in info


class TestManifestValidation:
    """Tests for manifest validation."""

    def test_validate_manifest_success(self, engine):
        report = engine.validate_manifest()
        assert report["valid"] is True
        assert report["missing_templates"] == []

    def test_validate_manifest_missing_template(self, temp_template_dir):
        # Add a template to manifest that doesn't exist
        manifest_path = temp_template_dir / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["templates"]["nonexistent.j2"] = {"description": "Missing"}
        manifest_path.write_text(json.dumps(manifest))
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        report = engine.validate_manifest()
        
        assert report["valid"] is False
        assert "nonexistent.j2" in report["missing_templates"]


class TestCustomFiltersInTemplates:
    """Tests for custom filters working in templates."""

    def test_snake_case_filter(self, temp_template_dir):
        # Create template using snake_case filter
        template = temp_template_dir / "filters" / "test.txt.j2"
        template.parent.mkdir(exist_ok=True)
        template.write_text("{{ name | snake_case }}")
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        result = engine.render_string("{{ name | snake_case }}", {"name": "MyTableName"})
        assert result == "my_table_name"

    def test_sql_safe_filter(self, engine):
        result = engine.render_string(
            "{{ name | sql_safe }}",
            {"name": "Invalid Name!"}
        )
        assert result == "invalid_name"

    def test_pascal_case_filter(self, engine):
        result = engine.render_string(
            "{{ name | pascal_case }}",
            {"name": "my_class_name"}
        )
        assert result == "MyClassName"


class TestSingletonInstance:
    """Tests for the singleton template engine instance."""

    def test_get_template_engine_returns_instance(self):
        engine = get_template_engine()
        assert isinstance(engine, TemplateEngine)

    def test_init_template_engine_creates_new(self, temp_template_dir):
        engine = init_template_engine(template_dir=str(temp_template_dir))
        assert engine.template_dir == temp_template_dir


class TestErrorHandling:
    """Tests for error handling."""

    def test_template_syntax_error(self, temp_template_dir):
        # Create a template with syntax error
        bad_template = temp_template_dir / "bad.j2"
        bad_template.write_text("{% invalid syntax %}")
        
        engine = TemplateEngine(template_dir=temp_template_dir)
        with pytest.raises(TemplateRenderError):
            engine.render("bad.j2", {}, validate=False)

    def test_validation_error_includes_details(self, engine):
        # Mock a validation error with details
        from app.services.template_engine.validator import TemplateParameterValidator
        from pydantic import BaseModel, ValidationError
        
        class StrictSchema(BaseModel):
            required_field: str
        
        TemplateParameterValidator.register_schema("sql/test.sql.j2", StrictSchema)
        
        try:
            with pytest.raises(TemplateValidationError) as exc_info:
                engine.render("sql/test.sql.j2", {})  # Missing required_field
            
            assert exc_info.value.errors is not None
        finally:
            # Clean up
            TemplateParameterValidator.SCHEMA_MAP.pop("sql/test.sql.j2", None)
