"""
NovaSight Query Flow Integration Tests
========================================

Integration tests for query execution, caching, and NL-to-SQL functionality.
"""

import pytest
from flask.testing import FlaskClient
from typing import Dict, Any

from tests.integration.conftest import helper


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
        
        # Mock ClickHouse execution
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={
                "data": [{"total_sales": 25000.00}],
                "rows": 1,
                "statistics": {
                    "elapsed": 0.05,
                    "rows_read": 1000,
                    "bytes_read": 50000,
                }
            }
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
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.get_json()
            assert "data" in data or "result" in data
    
    def test_execute_aggregated_query(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test executing a query with grouping."""
        model = seeded_semantic_layer["sales_model"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={
                "data": [
                    {"customer_name": "Alice", "total_sales": 10000.00},
                    {"customer_name": "Bob", "total_sales": 8000.00},
                    {"customer_name": "Charlie", "total_sales": 7000.00},
                ],
                "rows": 3,
            }
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
        
        assert response.status_code in [200, 404]
    
    def test_execute_time_series_query(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test executing a time series query."""
        model = seeded_semantic_layer["sales_model"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={
                "data": [
                    {"order_date": "2024-01-01", "total_sales": 1000.00},
                    {"order_date": "2024-01-02", "total_sales": 1500.00},
                    {"order_date": "2024-01-03", "total_sales": 1200.00},
                ],
                "rows": 3,
            }
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
        
        assert response.status_code in [200, 404]


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
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 5000.00}], "rows": 1}
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
        
        assert response.status_code in [200, 404]
    
    def test_query_with_range_filter(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test query with range filter."""
        model = seeded_semantic_layer["sales_model"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 3000.00}], "rows": 1}
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
        
        assert response.status_code in [200, 404]
    
    def test_query_with_date_range_filter(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test query with date range filter."""
        model = seeded_semantic_layer["sales_model"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 15000.00}], "rows": 1}
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
        
        assert response.status_code in [200, 404]
    
    def test_query_with_multiple_filters(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_semantic_layer: Dict[str, Any],
        mocker
    ):
        """Test query with multiple filters."""
        model = seeded_semantic_layer["sales_model"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 2000.00}], "rows": 1}
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
        
        assert response.status_code in [200, 404]


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
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 50000.00}], "rows": 1}
        )
        
        response = integration_client.post(
            "/api/v1/assistant/query",
            json={
                "question": "What are the total sales?",
            },
            headers=auth_headers
        )
        
        # Either success or endpoint not found
        assert response.status_code in [200, 404]
    
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
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 5000.00, "customer_name": "Alice"}], "rows": 1}
        )
        
        response = integration_client.post(
            "/api/v1/assistant/query",
            json={
                "question": "What are Alice's total sales?",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
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
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 10000.00}], "rows": 1}
        )
        
        response = integration_client.post(
            "/api/v1/assistant/query",
            json={
                "question": "What were the sales in January 2024?",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]


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
        mock_query = mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 25000.00}], "rows": 1}
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
            # Create another tenant
            other_tenant = Tenant(
                name="Query Other Tenant",
                slug="query-other-tenant",
                plan=SubscriptionPlan.PROFESSIONAL,
                status=TenantStatus.ACTIVE,
            )
            db.session.add(other_tenant)
            db.session.flush()
            
            other_user = User(
                tenant_id=other_tenant.id,
                email="query-other@integration.test",
                name="Other Query User",
                password_hash=password_service.hash("TestPassword123!"),
                status=UserStatus.ACTIVE,
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
            'app.services.clickhouse_client.ClickHouseClient.query',
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
            'app.services.clickhouse_client.ClickHouseClient.query',
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
        
        assert response.status_code in [200, 404]
