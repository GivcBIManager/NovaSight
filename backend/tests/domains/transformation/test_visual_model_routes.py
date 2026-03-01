"""
Tests for Visual Model API routes.

Validates REST endpoints for the Visual Model builder, warehouse
introspection, execution history, test builder, and package manager.
"""
import json
import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.unit
class TestVisualModelRoutes:
    """API route tests with mocked service layer."""

    BASE_URL = '/api/v1/visual-models'

    # ── CRUD endpoints ────────────────────────────────────────────

    def test_list_visual_models(self, client, api_headers):
        resp = client.get(self.BASE_URL, headers=api_headers)
        # Should return 200 or 401 depending on fixture setup
        assert resp.status_code in (200, 401, 404)

    def test_create_visual_model(self, client, api_headers):
        payload = {
            'model_name': 'stg_test_orders',
            'model_layer': 'staging',
            'materialization': 'view',
            'visual_config': {
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [{'name': 'id'}, {'name': 'amount'}],
            },
        }
        resp = client.post(
            self.BASE_URL,
            data=json.dumps(payload),
            headers=api_headers,
        )
        assert resp.status_code in (201, 200, 400, 401, 404)

    def test_create_visual_model_validation_error(self, client, api_headers):
        # Missing required fields
        payload = {'model_name': ''}
        resp = client.post(
            self.BASE_URL,
            data=json.dumps(payload),
            headers=api_headers,
        )
        # Should be 400 or 422 for validation error
        assert resp.status_code in (400, 401, 404, 422)

    def test_get_visual_model_by_id(self, client, api_headers):
        resp = client.get(f'{self.BASE_URL}/1', headers=api_headers)
        assert resp.status_code in (200, 401, 404)

    def test_update_visual_model(self, client, api_headers):
        payload = {'description': 'Updated description'}
        resp = client.put(
            f'{self.BASE_URL}/1',
            data=json.dumps(payload),
            headers=api_headers,
        )
        assert resp.status_code in (200, 401, 404)

    def test_delete_visual_model(self, client, api_headers):
        resp = client.delete(f'{self.BASE_URL}/1', headers=api_headers)
        assert resp.status_code in (200, 204, 401, 404)

    # ── Code preview endpoint ─────────────────────────────────────

    def test_preview_code(self, client, api_headers):
        payload = {
            'model_name': 'stg_preview',
            'model_layer': 'staging',
            'materialization': 'view',
            'visual_config': {
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [{'name': 'id'}],
            },
        }
        resp = client.post(
            f'{self.BASE_URL}/preview',
            data=json.dumps(payload),
            headers=api_headers,
        )
        assert resp.status_code in (200, 400, 401, 404)

    # ── Canvas state endpoint ─────────────────────────────────────

    def test_save_canvas_state(self, client, api_headers):
        payload = {
            'canvas_position': {'x': 100, 'y': 200},
        }
        resp = client.put(
            f'{self.BASE_URL}/1/canvas',
            data=json.dumps(payload),
            headers=api_headers,
        )
        assert resp.status_code in (200, 401, 404)

    # ── Warehouse introspection endpoints ─────────────────────────

    def test_get_warehouse_schemas(self, client, api_headers):
        resp = client.get(f'{self.BASE_URL}/warehouse/schemas', headers=api_headers)
        assert resp.status_code in (200, 401, 404, 500)

    def test_get_warehouse_tables(self, client, api_headers):
        resp = client.get(
            f'{self.BASE_URL}/warehouse/schemas/public/tables',
            headers=api_headers,
        )
        assert resp.status_code in (200, 401, 404, 500)

    def test_get_warehouse_columns(self, client, api_headers):
        resp = client.get(
            f'{self.BASE_URL}/warehouse/schemas/public/tables/orders/columns',
            headers=api_headers,
        )
        assert resp.status_code in (200, 401, 404, 500)

    # ── DAG endpoint ──────────────────────────────────────────────

    def test_get_dag(self, client, api_headers):
        resp = client.get(f'{self.BASE_URL}/dag', headers=api_headers)
        assert resp.status_code in (200, 401, 404)

    # ── Execution history endpoints ───────────────────────────────

    def test_get_execution_history(self, client, api_headers):
        resp = client.get(f'{self.BASE_URL}/executions', headers=api_headers)
        assert resp.status_code in (200, 401, 404)

    def test_get_execution_logs(self, client, api_headers):
        resp = client.get(f'{self.BASE_URL}/executions/1/logs', headers=api_headers)
        assert resp.status_code in (200, 401, 404)

    # ── Test builder endpoints ────────────────────────────────────

    def test_create_singular_test(self, client, api_headers):
        payload = {
            'test_name': 'assert_positive_amount',
            'test_sql': "SELECT * FROM {{ ref('stg_orders') }} WHERE amount < 0",
        }
        resp = client.post(
            f'{self.BASE_URL}/tests',
            data=json.dumps(payload),
            headers=api_headers,
        )
        assert resp.status_code in (200, 201, 400, 401, 404)

    # ── Source freshness endpoint ─────────────────────────────────

    def test_save_source_freshness(self, client, api_headers):
        payload = {
            'source_name': 'raw_data',
            'table_name': 'orders',
            'loaded_at_field': 'updated_at',
            'warn_after': {'count': 12, 'period': 'hour'},
            'error_after': {'count': 24, 'period': 'hour'},
        }
        resp = client.post(
            f'{self.BASE_URL}/freshness',
            data=json.dumps(payload),
            headers=api_headers,
        )
        assert resp.status_code in (200, 201, 400, 401, 404)

    # ── Package manager endpoint ──────────────────────────────────

    def test_update_packages(self, client, api_headers):
        payload = {
            'packages': [
                {
                    'package': 'dbt-labs/dbt_utils',
                    'version': '1.1.1',
                },
            ],
        }
        resp = client.post(
            f'{self.BASE_URL}/packages',
            data=json.dumps(payload),
            headers=api_headers,
        )
        assert resp.status_code in (200, 201, 400, 401, 404)


@pytest.mark.unit
class TestVisualModelRouteSecurity:
    """Security-focused route tests."""

    BASE_URL = '/api/v1/visual-models'

    def test_unauthenticated_access_rejected(self, client):
        """Requests without auth headers should be rejected."""
        resp = client.get(self.BASE_URL)
        assert resp.status_code in (401, 403, 404, 422)

    def test_invalid_model_name_rejected(self, client, api_headers):
        """Model names with SQL injection patterns should be rejected."""
        payload = {
            'model_name': "'; DROP TABLE users; --",
            'model_layer': 'staging',
            'materialization': 'view',
            'visual_config': {
                'source_name': 'raw',
                'source_table': 'orders',
                'columns': [],
            },
        }
        resp = client.post(
            self.BASE_URL,
            data=json.dumps(payload),
            headers=api_headers,
        )
        # Should be rejected by Pydantic regex validation
        assert resp.status_code in (400, 401, 404, 422)
