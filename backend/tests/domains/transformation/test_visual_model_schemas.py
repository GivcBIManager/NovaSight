"""
Tests for Visual Model Pydantic schemas.

Validates request/response serialization, field constraints,
enum values, and helper methods.
"""
import pytest


@pytest.mark.unit
class TestVisualModelSchemas:
    """Schema validation tests."""

    @pytest.fixture(autouse=True)
    def setup(self):
        from app.domains.transformation.schemas.visual_model_schemas import (
            VisualModelCreateRequest,
            VisualModelUpdateRequest,
            VisualModelCanvasState,
            DbtExecutionRequest,
            SingularTestCreateRequest,
            SourceFreshnessConfig,
            FreshnessThreshold,
            DbtPackage,
            PackagesUpdateRequest,
        )

        self.CreateReq = VisualModelCreateRequest
        self.UpdateReq = VisualModelUpdateRequest
        self.CanvasState = VisualModelCanvasState
        self.ExecReq = DbtExecutionRequest
        self.TestReq = SingularTestCreateRequest
        self.FreshnessConfig = SourceFreshnessConfig
        self.FreshnessThreshold = FreshnessThreshold
        self.DbtPackage = DbtPackage
        self.PkgUpdate = PackagesUpdateRequest

    # ── VisualModelCreateRequest ──────────────────────────────────

    def test_create_valid_staging_model(self):
        req = self.CreateReq(
            model_name='stg_orders',
            model_layer='staging',
            materialization='view',
            visual_config={
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [{'name': 'id'}],
            },
        )
        assert req.model_name == 'stg_orders'
        assert req.model_layer == 'staging'

    def test_create_model_with_optional_fields(self):
        req = self.CreateReq(
            model_name='fct_revenue',
            model_layer='marts',
            materialization='table',
            description='Revenue fact table',
            tags=['finance', 'marts'],
            visual_config={
                'source_models': ['int_order_items'],
                'columns': [{'name': 'revenue', 'expression': 'SUM(amount)'}],
                'group_by': ['customer_id'],
            },
        )
        assert req.description == 'Revenue fact table'
        assert 'finance' in req.tags

    def test_create_model_invalid_name_rejected(self):
        """Model names must match alphanumeric + underscore pattern."""
        with pytest.raises(Exception):
            self.CreateReq(
                model_name='invalid model name!',
                model_layer='staging',
                materialization='view',
                visual_config={},
            )

    def test_create_model_empty_name_rejected(self):
        with pytest.raises(Exception):
            self.CreateReq(
                model_name='',
                model_layer='staging',
                materialization='view',
                visual_config={},
            )

    def test_create_model_invalid_layer_rejected(self):
        with pytest.raises(Exception):
            self.CreateReq(
                model_name='stg_test',
                model_layer='nonexistent',
                materialization='view',
                visual_config={},
            )

    def test_create_model_invalid_materialization_rejected(self):
        with pytest.raises(Exception):
            self.CreateReq(
                model_name='stg_test',
                model_layer='staging',
                materialization='invalid_mat',
                visual_config={},
            )

    # ── Helper methods ────────────────────────────────────────────

    def test_to_code_gen_config(self):
        req = self.CreateReq(
            model_name='stg_test',
            model_layer='staging',
            materialization='view',
            visual_config={
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [{'name': 'id'}],
            },
        )
        config = req.to_code_gen_config()
        assert isinstance(config, dict)
        assert config.get('model_name') == 'stg_test'

    def test_to_schema_config(self):
        req = self.CreateReq(
            model_name='stg_test',
            model_layer='staging',
            materialization='view',
            description='Test model',
            visual_config={
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [
                    {'name': 'id', 'description': 'PK', 'tests': ['unique']},
                ],
            },
        )
        config = req.to_schema_config()
        assert isinstance(config, dict)
        assert config.get('model_name') == 'stg_test'

    # ── VisualModelUpdateRequest ──────────────────────────────────

    def test_update_request_partial(self):
        req = self.UpdateReq(description='New description')
        assert req.description == 'New description'

    # ── VisualModelCanvasState ────────────────────────────────────

    def test_canvas_state(self):
        state = self.CanvasState(canvas_position={'x': 100, 'y': 200})
        assert state.canvas_position['x'] == 100

    # ── DbtExecutionRequest ───────────────────────────────────────

    def test_execution_request_defaults(self):
        req = self.ExecReq(command='run')
        assert req.command == 'run'

    def test_execution_request_with_options(self):
        req = self.ExecReq(
            command='test',
            selector='stg_orders+',
            exclude='staging',
            full_refresh=True,
            target='prod',
        )
        assert req.full_refresh is True
        assert req.target == 'prod'

    # ── SingularTestCreateRequest ─────────────────────────────────

    def test_singular_test_request(self):
        req = self.TestReq(
            test_name='assert_positive',
            test_sql="SELECT * FROM {{ ref('orders') }} WHERE amount < 0",
        )
        assert req.test_name == 'assert_positive'

    # ── Source Freshness ──────────────────────────────────────────

    def test_freshness_threshold(self):
        t = self.FreshnessThreshold(count=12, period='hour')
        assert t.count == 12
        assert t.period == 'hour'

    def test_freshness_config(self):
        cfg = self.FreshnessConfig(
            source_name='raw',
            table_name='orders',
            loaded_at_field='_loaded_at',
            warn_after=self.FreshnessThreshold(count=12, period='hour'),
            error_after=self.FreshnessThreshold(count=24, period='hour'),
        )
        assert cfg.source_name == 'raw'
        assert cfg.warn_after.count == 12

    # ── Package Management ────────────────────────────────────────

    def test_dbt_package(self):
        pkg = self.DbtPackage(package='dbt-labs/dbt_utils', version='1.1.1')
        assert pkg.package == 'dbt-labs/dbt_utils'

    def test_packages_update_request(self):
        req = self.PkgUpdate(
            packages=[
                self.DbtPackage(package='dbt-labs/dbt_utils', version='1.1.1'),
                self.DbtPackage(
                    package='calogica/dbt_expectations', version='0.10.1'
                ),
            ]
        )
        assert len(req.packages) == 2
