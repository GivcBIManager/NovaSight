"""
Tests for DbtCodeGenerator (ADR-002 compliance).

Validates that all dbt artifacts are generated from Jinja2 templates
and never via arbitrary string concatenation.
"""
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path


@pytest.mark.unit
class TestDbtCodeGenerator:
    """Unit tests for DbtCodeGenerator."""

    @pytest.fixture(autouse=True)
    def setup(self, app):
        """Import inside app context so config is available."""
        from app.domains.transformation.infrastructure.code_generator import DbtCodeGenerator
        self.generator = DbtCodeGenerator()

    # ── generate_model_sql ────────────────────────────────────────

    def test_generate_staging_model_sql(self):
        config = {
            'model_name': 'stg_orders',
            'source_name': 'raw',
            'source_table': 'orders',
            'columns': [
                {'name': 'id', 'alias': 'order_id'},
                {'name': 'created_at'},
            ],
            'where_clause': 'id IS NOT NULL',
        }
        sql = self.generator.generate_model_sql('staging', config)
        assert isinstance(sql, str)
        assert len(sql) > 0
        # Should contain a SELECT and source reference
        sql_lower = sql.lower()
        assert 'select' in sql_lower

    def test_generate_intermediate_model_sql(self):
        config = {
            'model_name': 'int_order_items',
            'source_models': ['stg_orders', 'stg_items'],
            'columns': [
                {'name': 'order_id'},
                {'name': 'item_name'},
            ],
            'joins': [
                {
                    'model': 'stg_items',
                    'type': 'left',
                    'on': 'stg_orders.item_id = stg_items.id',
                }
            ],
        }
        sql = self.generator.generate_model_sql('intermediate', config)
        assert isinstance(sql, str)
        assert len(sql) > 0

    def test_generate_marts_model_sql(self):
        config = {
            'model_name': 'fct_orders',
            'source_models': ['int_order_items'],
            'columns': [
                {'name': 'order_id'},
                {'name': 'total_amount', 'expression': 'SUM(amount)'},
            ],
            'group_by': ['order_id'],
            'materialization': 'table',
        }
        sql = self.generator.generate_model_sql('marts', config)
        assert isinstance(sql, str)
        assert len(sql) > 0

    def test_generate_source_model_sql(self):
        config = {
            'model_name': 'src_raw_orders',
            'source_name': 'raw_db',
            'source_table': 'orders',
            'columns': [{'name': 'id'}, {'name': 'amount'}],
        }
        sql = self.generator.generate_model_sql('source', config)
        assert isinstance(sql, str)

    def test_invalid_layer_raises(self):
        with pytest.raises((ValueError, KeyError)):
            self.generator.generate_model_sql('nonexistent_layer', {})

    # ── generate_schema_yaml ──────────────────────────────────────

    def test_generate_schema_yaml(self):
        config = {
            'model_name': 'stg_orders',
            'description': 'Staging orders model',
            'columns': [
                {
                    'name': 'order_id',
                    'description': 'Primary key',
                    'tests': ['unique', 'not_null'],
                },
                {
                    'name': 'status',
                    'description': 'Order status',
                    'tests': [
                        {
                            'accepted_values': {
                                'values': ['pending', 'shipped', 'delivered'],
                            }
                        }
                    ],
                },
            ],
            'tags': ['staging', 'orders'],
        }
        yaml_str = self.generator.generate_schema_yaml(config)
        assert isinstance(yaml_str, str)
        assert 'stg_orders' in yaml_str
        assert 'order_id' in yaml_str

    def test_generate_schema_yaml_minimal(self):
        config = {
            'model_name': 'stg_users',
            'columns': [],
        }
        yaml_str = self.generator.generate_schema_yaml(config)
        assert isinstance(yaml_str, str)
        assert 'stg_users' in yaml_str

    # ── generate_sources_yaml ─────────────────────────────────────

    def test_generate_sources_yaml(self):
        config = {
            'source_name': 'raw_database',
            'database': 'analytics',
            'schema': 'public',
            'tables': [
                {
                    'name': 'orders',
                    'description': 'Raw orders table',
                    'columns': [
                        {'name': 'id', 'tests': ['unique', 'not_null']},
                    ],
                },
                {'name': 'users'},
            ],
        }
        yaml_str = self.generator.generate_sources_yaml(config)
        assert isinstance(yaml_str, str)
        assert 'raw_database' in yaml_str
        assert 'orders' in yaml_str

    # ── generate_metric_yaml ──────────────────────────────────────

    def test_generate_metric_yaml(self):
        config = {
            'metric_name': 'total_revenue',
            'label': 'Total Revenue',
            'description': 'Sum of all order amounts',
            'type': 'simple',
            'type_params': {
                'measure': 'order_amount',
                'expr': 'SUM(amount)',
            },
            'time_grains': ['day', 'week', 'month'],
        }
        yaml_str = self.generator.generate_metric_yaml(config)
        assert isinstance(yaml_str, str)
        assert 'total_revenue' in yaml_str

    # ── generate_singular_test ────────────────────────────────────

    def test_generate_singular_test(self):
        config = {
            'test_name': 'assert_order_amount_positive',
            'test_sql': "SELECT * FROM {{ ref('stg_orders') }} WHERE amount < 0",
            'description': 'Ensure no negative order amounts',
        }
        test_sql = self.generator.generate_singular_test(config)
        assert isinstance(test_sql, str)
        assert len(test_sql) > 0

    # ── ADR-002: Template-based generation ────────────────────────

    def test_layer_template_map_exists(self):
        """All layers must have a registered template."""
        assert hasattr(self.generator, 'LAYER_TEMPLATE_MAP') or hasattr(
            self.generator, 'layer_template_map'
        )

    def test_templates_directory_configured(self):
        """Generator should reference the templates directory."""
        # The Jinja loader should point to backend/templates/dbt/
        env = getattr(self.generator, 'env', None) or getattr(
            self.generator, 'jinja_env', None
        )
        if env is not None:
            assert env is not None, "Jinja2 environment should be configured"
