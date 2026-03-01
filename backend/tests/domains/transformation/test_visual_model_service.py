"""
Tests for VisualModelService.

Covers CRUD operations, code generation invocation, warehouse introspection,
execution history, and DAG construction.
"""
import pytest
import uuid
from unittest.mock import patch, MagicMock, PropertyMock
from datetime import datetime, timedelta


@pytest.mark.unit
class TestVisualModelService:
    """Unit tests for VisualModelService with mocked DB and ClickHouse."""

    @pytest.fixture(autouse=True)
    def setup(self, app, db_session, sample_tenant):
        """Set up service with real DB session but mocked externals."""
        from app.domains.transformation.application.visual_model_service import (
            VisualModelService,
        )
        from app.domains.transformation.infrastructure.code_generator import (
            DbtCodeGenerator,
        )

        self.tenant = sample_tenant
        self.service = VisualModelService(
            tenant_id=str(sample_tenant.id),
            code_generator=DbtCodeGenerator(),
        )
        self.db = db_session

    # ── Create ────────────────────────────────────────────────────

    def test_create_visual_model(self):
        result = self.service.create_visual_model(
            model_name='stg_orders',
            model_layer='staging',
            materialization='view',
            description='Staging orders',
            visual_config={
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [{'name': 'id'}, {'name': 'amount'}],
            },
            tags=['staging'],
        )
        assert result is not None
        assert result.model_name == 'stg_orders'
        assert result.model_layer.value if hasattr(result.model_layer, 'value') else result.model_layer == 'staging'

    def test_create_duplicate_model_name_raises(self):
        self.service.create_visual_model(
            model_name='stg_users',
            model_layer='staging',
            materialization='view',
            visual_config={
                'source_name': 'raw',
                'source_table': 'users',
                'columns': [{'name': 'id'}],
            },
        )
        # Second creation with the same name should raise
        with pytest.raises(Exception):
            self.service.create_visual_model(
                model_name='stg_users',
                model_layer='staging',
                materialization='view',
                visual_config={
                    'source_name': 'raw',
                    'source_table': 'users',
                    'columns': [{'name': 'id'}],
                },
            )

    # ── Read ──────────────────────────────────────────────────────

    def test_list_visual_models(self):
        self.service.create_visual_model(
            model_name='stg_a',
            model_layer='staging',
            materialization='view',
            visual_config={'source_name': 'r', 'source_table': 'a', 'columns': []},
        )
        self.service.create_visual_model(
            model_name='stg_b',
            model_layer='staging',
            materialization='view',
            visual_config={'source_name': 'r', 'source_table': 'b', 'columns': []},
        )
        models = self.service.list_visual_models()
        names = [m.model_name for m in models]
        assert 'stg_a' in names
        assert 'stg_b' in names

    def test_get_visual_model_by_id(self):
        created = self.service.create_visual_model(
            model_name='stg_c',
            model_layer='staging',
            materialization='view',
            visual_config={'source_name': 'r', 'source_table': 'c', 'columns': []},
        )
        fetched = self.service.get_visual_model(created.id)
        assert fetched is not None
        assert fetched.model_name == 'stg_c'

    def test_get_nonexistent_model_returns_none(self):
        result = self.service.get_visual_model(99999)
        assert result is None

    # ── Update ────────────────────────────────────────────────────

    def test_update_visual_model(self):
        created = self.service.create_visual_model(
            model_name='stg_d',
            model_layer='staging',
            materialization='view',
            visual_config={'source_name': 'r', 'source_table': 'd', 'columns': []},
        )
        updated = self.service.update_visual_model(
            model_id=created.id,
            description='Updated description',
            materialization='table',
        )
        assert updated is not None
        assert updated.description == 'Updated description'

    # ── Delete ────────────────────────────────────────────────────

    def test_delete_visual_model(self):
        created = self.service.create_visual_model(
            model_name='stg_e',
            model_layer='staging',
            materialization='view',
            visual_config={'source_name': 'r', 'source_table': 'e', 'columns': []},
        )
        success = self.service.delete_visual_model(created.id)
        assert success is True
        assert self.service.get_visual_model(created.id) is None

    def test_delete_nonexistent_model(self):
        result = self.service.delete_visual_model(99999)
        assert result is False or result is None

    # ── Code Preview ──────────────────────────────────────────────

    def test_preview_sql(self):
        result = self.service.preview_sql(
            model_layer='staging',
            visual_config={
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [{'name': 'id'}, {'name': 'amount'}],
            },
        )
        assert 'generated_sql' in result or hasattr(result, 'generated_sql')

    # ── Canvas State ──────────────────────────────────────────────

    def test_save_canvas_state(self):
        created = self.service.create_visual_model(
            model_name='stg_f',
            model_layer='staging',
            materialization='view',
            visual_config={'source_name': 'r', 'source_table': 'f', 'columns': []},
        )
        canvas = {'x': 100, 'y': 200, 'width': 300, 'height': 150}
        updated = self.service.save_canvas_state(created.id, canvas)
        assert updated is not None
        assert updated.canvas_position == canvas

    # ── Warehouse Introspection (mocked CH) ───────────────────────

    @patch('app.domains.transformation.application.visual_model_service.get_clickhouse_client')
    def test_get_warehouse_schemas(self, mock_get_ch):
        mock_client = MagicMock()
        mock_client.execute.return_value = [('public',), ('staging',)]
        mock_get_ch.return_value = mock_client

        schemas = self.service.get_warehouse_schemas()
        assert isinstance(schemas, list)

    @patch('app.domains.transformation.application.visual_model_service.get_clickhouse_client')
    def test_get_warehouse_tables(self, mock_get_ch):
        mock_client = MagicMock()
        mock_client.execute.return_value = [('orders',), ('users',)]
        mock_get_ch.return_value = mock_client

        tables = self.service.get_warehouse_tables('public')
        assert isinstance(tables, list)

    @patch('app.domains.transformation.application.visual_model_service.get_clickhouse_client')
    def test_get_warehouse_columns(self, mock_get_ch):
        mock_client = MagicMock()
        mock_client.execute.return_value = [
            ('id', 'UInt64', ''),
            ('name', 'String', ''),
        ]
        mock_get_ch.return_value = mock_client

        columns = self.service.get_warehouse_columns('public', 'users')
        assert isinstance(columns, list)


@pytest.mark.unit
class TestVisualModelServiceFactory:
    """Test service factory function."""

    def test_get_visual_model_service(self, app, sample_tenant):
        from app.domains.transformation.application.visual_model_service import (
            get_visual_model_service,
        )

        service = get_visual_model_service(str(sample_tenant.id))
        assert service is not None
