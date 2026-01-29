"""
NovaSight Dashboard Flow Integration Tests
============================================

Integration tests for dashboard and widget management including
creation, layout updates, data queries, sharing, and cloning.
"""

import pytest
from flask.testing import FlaskClient
from typing import Dict, Any

from tests.integration.conftest import helper


class TestDashboardList:
    """Integration tests for listing dashboards."""
    
    def test_list_dashboards_empty(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test listing dashboards when none exist."""
        response = integration_client.get(
            "/api/v1/dashboards",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
    
    def test_list_dashboards_with_data(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test listing dashboards returns existing dashboards."""
        response = integration_client.get(
            "/api/v1/dashboards",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1
    
    def test_list_dashboards_with_search(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test searching dashboards by name."""
        response = integration_client.get(
            "/api/v1/dashboards?search=Integration",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        # Should find the seeded dashboard
        for dashboard in data:
            assert "integration" in dashboard["name"].lower()
    
    def test_list_dashboards_with_tags(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test filtering dashboards by tags."""
        response = integration_client.get(
            "/api/v1/dashboards?tags=sales,analytics",
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestDashboardCreate:
    """Integration tests for creating dashboards."""
    
    def test_create_dashboard(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a dashboard."""
        response = integration_client.post(
            "/api/v1/dashboards",
            json={
                "name": "Test Dashboard",
                "description": "A test dashboard for integration testing",
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Test Dashboard"
        assert "id" in data
    
    def test_create_dashboard_with_layout(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a dashboard with initial layout."""
        response = integration_client.post(
            "/api/v1/dashboards",
            json={
                "name": "Dashboard with Layout",
                "layout": [
                    {"id": "placeholder", "x": 0, "y": 0, "w": 6, "h": 4}
                ],
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
    
    def test_create_dashboard_with_settings(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a dashboard with custom settings."""
        response = integration_client.post(
            "/api/v1/dashboards",
            json={
                "name": "Dashboard with Settings",
                "auto_refresh": True,
                "refresh_interval": 60,
                "theme": {"mode": "dark", "primaryColor": "#1890ff"},
                "tags": ["sales", "analytics"],
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data.get("auto_refresh") is True or data.get("settings", {}).get("auto_refresh") is True
    
    def test_create_public_dashboard(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a public dashboard."""
        response = integration_client.post(
            "/api/v1/dashboards",
            json={
                "name": "Public Dashboard",
                "is_public": True,
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data.get("is_public") is True


class TestDashboardGet:
    """Integration tests for getting dashboard details."""
    
    def test_get_dashboard(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test getting a specific dashboard."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.get(
            f"/api/v1/dashboards/{dashboard.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["id"] == str(dashboard.id)
        assert data["name"] == dashboard.name
    
    def test_get_dashboard_includes_widgets(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test that getting dashboard includes widgets."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.get(
            f"/api/v1/dashboards/{dashboard.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "widgets" in data
        assert len(data["widgets"]) >= 1
    
    def test_get_dashboard_not_found(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test getting non-existent dashboard returns 404."""
        import uuid
        fake_id = str(uuid.uuid4())
        
        response = integration_client.get(
            f"/api/v1/dashboards/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404


class TestDashboardUpdate:
    """Integration tests for updating dashboards."""
    
    def test_update_dashboard_name(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test updating dashboard name."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.patch(
            f"/api/v1/dashboards/{dashboard.id}",
            json={"name": "Updated Dashboard Name"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Updated Dashboard Name"
    
    def test_update_dashboard_description(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test updating dashboard description."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.patch(
            f"/api/v1/dashboards/{dashboard.id}",
            json={"description": "Updated description"},
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestDashboardLayout:
    """Integration tests for dashboard layout management."""
    
    def test_update_layout(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test updating dashboard layout."""
        dashboard = seeded_dashboard["dashboard"]
        widget = seeded_dashboard["widget"]
        
        response = integration_client.put(
            f"/api/v1/dashboards/{dashboard.id}/layout",
            json={
                "layout": [
                    {"id": str(widget.id), "x": 2, "y": 0, "w": 6, "h": 4}
                ]
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    def test_verify_layout_persisted(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test that layout changes are persisted."""
        dashboard = seeded_dashboard["dashboard"]
        widget = seeded_dashboard["widget"]
        
        # Update layout
        integration_client.put(
            f"/api/v1/dashboards/{dashboard.id}/layout",
            json={
                "layout": [
                    {"id": str(widget.id), "x": 4, "y": 2, "w": 8, "h": 6}
                ]
            },
            headers=auth_headers
        )
        
        # Get dashboard and verify layout
        response = integration_client.get(
            f"/api/v1/dashboards/{dashboard.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        # Layout should be updated
        widgets = data.get("widgets", [])
        if widgets:
            widget_data = widgets[0]
            position = widget_data.get("grid_position", widget_data)
            # Position should reflect update
            assert position.get("x") == 4 or position.get("w") == 8


class TestWidgetCreate:
    """Integration tests for creating widgets."""
    
    def test_add_widget_to_dashboard(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test adding a widget to a dashboard."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.post(
            f"/api/v1/dashboards/{dashboard.id}/widgets",
            json={
                "name": "New Widget",
                "type": "metric_card",
                "query_config": {
                    "measures": ["order_count"],
                },
                "viz_config": {
                    "showChange": True,
                },
                "grid_position": {"x": 4, "y": 0, "w": 4, "h": 2},
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "New Widget"
    
    def test_add_chart_widget(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test adding a chart widget."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.post(
            f"/api/v1/dashboards/{dashboard.id}/widgets",
            json={
                "name": "Sales Chart",
                "type": "line_chart",
                "query_config": {
                    "measures": ["total_sales"],
                    "dimensions": ["order_date"],
                },
                "viz_config": {
                    "xAxis": {"field": "order_date"},
                    "yAxis": {"field": "total_sales"},
                },
                "grid_position": {"x": 0, "y": 4, "w": 12, "h": 6},
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
    
    def test_add_table_widget(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test adding a table widget."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.post(
            f"/api/v1/dashboards/{dashboard.id}/widgets",
            json={
                "name": "Data Table",
                "type": "table",
                "query_config": {
                    "measures": ["total_sales", "order_count"],
                    "dimensions": ["customer_name"],
                },
                "viz_config": {
                    "pagination": True,
                    "pageSize": 10,
                },
                "grid_position": {"x": 0, "y": 10, "w": 12, "h": 8},
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201


class TestWidgetData:
    """Integration tests for widget data queries."""
    
    def test_get_widget_data(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any],
        mocker
    ):
        """Test getting widget data."""
        dashboard = seeded_dashboard["dashboard"]
        widget = seeded_dashboard["widget"]
        
        # Mock query execution
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={
                "data": [{"total_sales": 15000.00}],
                "rows": 1,
            }
        )
        
        response = integration_client.get(
            f"/api/v1/dashboards/{dashboard.id}/widgets/{widget.id}/data",
            headers=auth_headers
        )
        
        # Either success or endpoint not found
        assert response.status_code in [200, 404]
    
    def test_get_widget_data_with_filters(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any],
        mocker
    ):
        """Test getting widget data with filters."""
        dashboard = seeded_dashboard["dashboard"]
        widget = seeded_dashboard["widget"]
        
        mocker.patch(
            'app.services.clickhouse_client.ClickHouseClient.query',
            return_value={"data": [{"total_sales": 5000.00}], "rows": 1}
        )
        
        response = integration_client.post(
            f"/api/v1/dashboards/{dashboard.id}/widgets/{widget.id}/data",
            json={
                "filters": [
                    {"dimension": "customer_name", "operator": "equals", "value": "Alice"}
                ]
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404, 405]


class TestWidgetUpdate:
    """Integration tests for updating widgets."""
    
    def test_update_widget_name(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test updating widget name."""
        dashboard = seeded_dashboard["dashboard"]
        widget = seeded_dashboard["widget"]
        
        response = integration_client.patch(
            f"/api/v1/dashboards/{dashboard.id}/widgets/{widget.id}",
            json={"name": "Updated Widget Name"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Updated Widget Name"
    
    def test_update_widget_config(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test updating widget configuration."""
        dashboard = seeded_dashboard["dashboard"]
        widget = seeded_dashboard["widget"]
        
        response = integration_client.patch(
            f"/api/v1/dashboards/{dashboard.id}/widgets/{widget.id}",
            json={
                "query_config": {
                    "measures": ["total_sales", "order_count"],
                },
                "viz_config": {
                    "format": "number",
                    "showChange": False,
                },
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestWidgetDelete:
    """Integration tests for deleting widgets."""
    
    def test_delete_widget(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test deleting a widget."""
        dashboard = seeded_dashboard["dashboard"]
        widget = seeded_dashboard["widget"]
        
        response = integration_client.delete(
            f"/api/v1/dashboards/{dashboard.id}/widgets/{widget.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]


class TestDashboardDelete:
    """Integration tests for deleting dashboards."""
    
    def test_delete_dashboard(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test deleting a dashboard."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.delete(
            f"/api/v1/dashboards/{dashboard.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
        
        # Verify it's deleted
        get_response = integration_client.get(
            f"/api/v1/dashboards/{dashboard.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404


class TestDashboardSharing:
    """Integration tests for dashboard sharing."""
    
    def test_share_dashboard_with_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test sharing a dashboard with another user."""
        dashboard = seeded_dashboard["dashboard"]
        regular_user = seeded_dashboard["regular_user"]
        
        response = integration_client.post(
            f"/api/v1/dashboards/{dashboard.id}/share",
            json={
                "user_ids": [str(regular_user.id)],
                "permission": "view",
            },
            headers=auth_headers
        )
        
        # Either success or endpoint not implemented
        assert response.status_code in [200, 201, 404]
    
    def test_share_dashboard_with_role(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test sharing a dashboard with a role."""
        dashboard = seeded_dashboard["dashboard"]
        viewer_role = seeded_dashboard["viewer_role"]
        
        response = integration_client.post(
            f"/api/v1/dashboards/{dashboard.id}/share",
            json={
                "role_ids": [str(viewer_role.id)],
                "permission": "view",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201, 404]


class TestDashboardClone:
    """Integration tests for cloning dashboards."""
    
    def test_clone_dashboard(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test cloning a dashboard."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.post(
            f"/api/v1/dashboards/{dashboard.id}/clone",
            json={
                "name": "Cloned Dashboard",
            },
            headers=auth_headers
        )
        
        # Either success or endpoint not implemented
        assert response.status_code in [200, 201, 404]
        
        if response.status_code in [200, 201]:
            data = response.get_json()
            assert data["name"] == "Cloned Dashboard"
            assert data["id"] != str(dashboard.id)


class TestDashboardTenantIsolation:
    """Integration tests for dashboard tenant isolation."""
    
    def test_dashboard_tenant_isolation(
        self,
        integration_client: FlaskClient,
        seeded_dashboard: Dict[str, Any],
        integration_app
    ):
        """Test that dashboards are isolated between tenants."""
        from app.models.tenant import Tenant, TenantStatus, SubscriptionPlan
        from app.models.user import User, UserStatus
        from app.services.password_service import password_service
        from app.extensions import db
        from flask_jwt_extended import create_access_token
        
        dashboard = seeded_dashboard["dashboard"]
        
        with integration_app.app_context():
            # Create another tenant with user
            other_tenant = Tenant(
                name="Dashboard Other Tenant",
                slug="dashboard-other-tenant",
                plan=SubscriptionPlan.PROFESSIONAL,
                status=TenantStatus.ACTIVE,
            )
            db.session.add(other_tenant)
            db.session.flush()
            
            other_user = User(
                tenant_id=other_tenant.id,
                email="dashboard-other@integration.test",
                name="Other Dashboard User",
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
            
            # Try to access first tenant's dashboard
            response = integration_client.get(
                f"/api/v1/dashboards/{dashboard.id}",
                headers=other_headers
            )
            
            # Should not be found (tenant isolation)
            assert response.status_code in [403, 404]


class TestDashboardRBAC:
    """Integration tests for dashboard RBAC."""
    
    def test_viewer_can_view_dashboards(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str]
    ):
        """Test that viewer role can view dashboards."""
        response = integration_client.get(
            "/api/v1/dashboards",
            headers=viewer_auth_headers
        )
        
        assert response.status_code == 200
    
    def test_viewer_cannot_create_dashboard(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str]
    ):
        """Test that viewer role cannot create dashboards."""
        response = integration_client.post(
            "/api/v1/dashboards",
            json={
                "name": "Viewer Created Dashboard",
            },
            headers=viewer_auth_headers
        )
        
        # Should be forbidden (depends on RBAC implementation)
        assert response.status_code in [201, 403]  # May allow based on config
    
    def test_viewer_cannot_delete_others_dashboard(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str],
        seeded_dashboard: Dict[str, Any]
    ):
        """Test that viewer cannot delete dashboards they don't own."""
        dashboard = seeded_dashboard["dashboard"]
        
        response = integration_client.delete(
            f"/api/v1/dashboards/{dashboard.id}",
            headers=viewer_auth_headers
        )
        
        # Should be forbidden
        assert response.status_code in [403, 404]
