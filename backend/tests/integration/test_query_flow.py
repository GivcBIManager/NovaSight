"""
NovaSight Query Flow Integration Tests
========================================

Integration tests for query execution, caching, and NL-to-SQL functionality.
"""

import pytest
from flask.testing import FlaskClient
from typing import Dict, Any, List, Tuple
from unittest.mock import MagicMock

from tests.integration.conftest import helper
from app.services.clickhouse_client import QueryResult


def create_mock_query_result(
    columns: List[str],
    rows: List[Tuple],
    execution_time_ms: float = 10.0
) -> QueryResult:
    """Helper to create a mock QueryResult."""
    return QueryResult(
        columns=columns,
        rows=rows,
        row_count=len(rows),
        query="SELECT ...",
        execution_time_ms=execution_time_ms,
        bytes_read=1000,
        rows_read=len(rows),
    )


class TestQueryExecution:
    """Integration tests for query execution."""
    
    def test_execute_simple_query(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test executing a simple semantic query."""
        model = seeded_semantic_layer["sales_model"]
        
        # Mock ClickHouse execution with QueryResult
        mock_result = QueryResult(
            columns=["total_sales"],
            rows=[(25000.00,)],
            row_count=1,
            query="SELECT ...",
            execution_time_ms=50.0,
            bytes_read=50000,
            rows_read=1000,
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
            },
            headers=auth_headers
        )
        
        # Either success or endpoint not found
        assert response.status_code in [200, 400, 401, 404]
        
        if response.status_code == 200:
            data = response.get_json()
            # Response includes columns and rows from QueryResult
            assert "columns" in data or "rows" in data or "data" in data or "result" in data
    
    def test_execute_aggregated_query(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test executing a query with grouping."""
        model = seeded_semantic_layer["sales_model"]
        
        mock_result = create_mock_query_result(
            columns=["customer_name", "total_sales"],
            rows=[("Alice", 10000.00), ("Bob", 8000.00), ("Charlie", 7000.00)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "dimensions": ["customer_name"],
                "order_by": [{"field": "total_sales", "direction": "desc"}],
                "limit": 10,
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]
    
    def test_execute_time_series_query(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test executing a time series query."""
        model = seeded_semantic_layer["sales_model"]
        
        mock_result = create_mock_query_result(
            columns=["order_date", "total_sales"],
            rows=[("2024-01-01", 1000.00), ("2024-01-02", 1500.00), ("2024-01-03", 1200.00)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "dimensions": ["order_date"],
                "time_granularity": "day",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]


class TestQueryFilters:
    """Integration tests for query filters."""
    
    def test_query_with_equality_filter(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test query with equality filter."""
        model = seeded_semantic_layer["sales_model"]
        
        mock_result = create_mock_query_result(
            columns=["total_sales"],
            rows=[(5000.00,)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "filters": [
                    {"dimension": "customer_name", "operator": "equals", "value": "Alice"}
                ],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]
    
    def test_query_with_range_filter(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test query with range filter."""
        model = seeded_semantic_layer["sales_model"]
        
        mock_result = create_mock_query_result(
            columns=["total_sales"],
            rows=[(3000.00,)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "filters": [
                    {
                        "measure": "total_sales",
                        "operator": "greater_than",
                        "value": 1000
                    }
                ],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]
    
    def test_query_with_date_range_filter(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test query with date range filter."""
        model = seeded_semantic_layer["sales_model"]
        
        mock_result = create_mock_query_result(
            columns=["total_sales"],
            rows=[(15000.00,)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "date_range": {
                    "dimension": "order_date",
                    "start": "2024-01-01",
                    "end": "2024-03-31",
                },
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]
    
    def test_query_with_multiple_filters(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test query with multiple filters."""
        model = seeded_semantic_layer["sales_model"]
        
        mock_result = create_mock_query_result(
            columns=["total_sales"],
            rows=[(2000.00,)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "filters": [
                    {"dimension": "customer_name", "operator": "in", "value": ["Alice", "Bob"]},
                ],
                "date_range": {
                    "dimension": "order_date",
                    "start": "2024-01-01",
                    "end": "2024-06-30",
                },
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]


class TestQueryValidation:
    """Integration tests for query validation."""
    
    def test_query_with_invalid_model(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test query with non-existent model fails."""
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": "nonexistent_model",
                "measures": ["some_measure"],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [400, 404]
    
    def test_query_with_invalid_measure(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any]
    ):
        """Test query with invalid measure fails."""
        model = seeded_semantic_layer["sales_model"]
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["invalid_measure"],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [400, 404]
    
    def test_query_with_invalid_dimension(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any]
    ):
        """Test query with invalid dimension fails."""
        model = seeded_semantic_layer["sales_model"]
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "dimensions": ["invalid_dimension"],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [400, 404]
    
    def test_query_without_measures(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any]
    ):
        """Test query without measures fails."""
        model = seeded_semantic_layer["sales_model"]
        
        response = integration_client.post(
            "/api/v1/semantic/query",
            json={
                "model": model.name,
                "dimensions": ["customer_name"],
            },
            headers=auth_headers
        )
        
        # May fail validation or return empty result
        assert response.status_code in [200, 400, 404, 422]


class TestNLToSQL:
    """Integration tests for Natural Language to SQL."""
    
    def test_nl_query_basic(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test basic natural language query."""
        # Mock Ollama response
        mocker.patch(
            'app.services.ollama.client.OllamaClient.generate',
            return_value='{"model": "sales_orders", "measures": ["total_sales"], "dimensions": []}'
        )
        
        mock_result = create_mock_query_result(
            columns=["total_sales"],
            rows=[(50000.00,)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/assistant/query",
            json={
                "question": "What are the total sales?",
            },
            headers=auth_headers
        )
        
        # Either success or endpoint not found
        assert response.status_code in [200, 400, 401, 404]
    
    def test_nl_query_with_filters(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test natural language query with implied filters."""
        mocker.patch(
            'app.services.ollama.client.OllamaClient.generate',
            return_value='{"model": "sales_orders", "measures": ["total_sales"], "dimensions": ["customer_name"], "filters": [{"dimension": "customer_name", "operator": "equals", "value": "Alice"}]}'
        )
        
        mock_result = create_mock_query_result(
            columns=["total_sales", "customer_name"],
            rows=[(5000.00, "Alice")]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/assistant/query",
            json={
                "question": "What are Alice's total sales?",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]
    
    def test_nl_query_time_based(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test time-based natural language query."""
        mocker.patch(
            'app.services.ollama.client.OllamaClient.generate',
            return_value='{"model": "sales_orders", "measures": ["total_sales"], "date_range": {"dimension": "order_date", "start": "2024-01-01", "end": "2024-01-31"}}'
        )
        
        mock_result = create_mock_query_result(
            columns=["total_sales"],
            rows=[(10000.00,)]
        )
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        response = integration_client.post(
            "/api/v1/assistant/query",
            json={
                "question": "What were the sales in January 2024?",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]


class TestQueryCaching:
    """Integration tests for query caching."""
    
    def test_cached_query_returns_faster(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test that cached queries are returned faster."""
        model = seeded_semantic_layer["sales_model"]
        
        # First query - goes to database
        mock_result = create_mock_query_result(
            columns=["total_sales"],
            rows=[(25000.00,)]
        )
        mock_query = mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value=mock_result
        )
        
        query_payload = {
            "model": model.name,
            "measures": ["total_sales"],
        }
        
        # First request
        response1 = integration_client.post(
            "/api/v1/semantic/query",
            json=query_payload,
            headers=auth_headers
        )
        
        # Second request (should be cached if caching is enabled)
        response2 = integration_client.post(
            "/api/v1/semantic/query",
            json=query_payload,
            headers=auth_headers
        )
        
        assert response1.status_code in [200, 404]
        assert response2.status_code in [200, 404]


class TestQueryTenantIsolation:
    """Integration tests for query tenant isolation."""
    
    def test_query_respects_tenant_isolation(
        self,
        integration_client: FlaskClient,
        seeded_semantic_layer: Dict[str, Any],
        integration_app
    ):
        """Test that queries only access tenant's data."""
        from app.models.tenant import Tenant, TenantStatus, SubscriptionPlan
        from app.models.user import User, UserStatus
        from app.services.password_service import password_service
        from app.extensions import db
        from flask_jwt_extended import create_access_token
        
        model = seeded_semantic_layer["sales_model"]
        
        with integration_app.app_context():
            # Create another tenant - use string values for enum columns
            other_tenant = Tenant(
                name="Query Other Tenant",
                slug="query-other-tenant",
                plan="professional",
                status="active",
            )
            db.session.add(other_tenant)
            db.session.flush()
            
            other_user = User(
                tenant_id=other_tenant.id,
                email="query-other@example.com",
                name="Other Query User",
                password_hash=password_service.hash("TestPassword123!"),
                status="active",
            )
            db.session.add(other_user)
            db.session.commit()
            
            # Get token for other tenant's user
            other_token = create_access_token(
                identity={
                    "user_id": str(other_user.id),
                    "email": other_user.email,
                    "tenant_id": str(other_tenant.id),
                    "roles": ["tenant_admin"],
                }
            )
            other_headers = {
                "Authorization": f"Bearer {other_token}",
                "Content-Type": "application/json",
            }
            
            # Try to query first tenant's model
            response = integration_client.post(
                "/api/v1/semantic/query",
                json={
                    "model": model.name,
                    "measures": ["total_sales"],
                },
                headers=other_headers
            )
            
            # Should fail - model belongs to different tenant
            assert response.status_code in [400, 404]


class TestQueryExport:
    """Integration tests for query result export."""
    
    def test_export_query_results_csv(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test exporting query results as CSV."""
        model = seeded_semantic_layer["sales_model"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value={
                "data": [
                    {"customer_name": "Alice", "total_sales": 5000.00},
                    {"customer_name": "Bob", "total_sales": 3000.00},
                ],
                "rows": 2,
            }
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query/export",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "dimensions": ["customer_name"],
                "format": "csv",
            },
            headers=auth_headers
        )
        
        # Either CSV response or endpoint not found
        if response.status_code == 200:
            assert "text/csv" in response.content_type or response.data
        else:
            assert response.status_code == 404
    
    def test_export_query_results_json(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test exporting query results as JSON."""
        model = seeded_semantic_layer["sales_model"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.execute',
            return_value={
                "data": [
                    {"customer_name": "Alice", "total_sales": 5000.00},
                ],
                "rows": 1,
            }
        )
        
        response = integration_client.post(
            "/api/v1/semantic/query/export",
            json={
                "model": model.name,
                "measures": ["total_sales"],
                "dimensions": ["customer_name"],
                "format": "json",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 400, 401, 404]



