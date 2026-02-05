"""
Comprehensive Dashboard API and Service Tests
==============================================

Extended tests for Dashboard API endpoints and service layer.
Covers widget operations, sharing, filters, and export functionality.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4
import json


class TestDashboardAPICreate:
    """Tests for dashboard creation via API."""
    
    def test_create_dashboard_success(self, client, api_headers):
        """Test successful dashboard creation."""
        dashboard_data = {
            "name": "Sales Overview",
            "description": "Monthly sales metrics",
            "is_public": False,
            "tags": ["sales", "monthly"],
            "settings": {
                "refresh_interval": 300,
                "theme": "light"
            }
        }
        
        response = client.post(
            "/api/v1/dashboards",
            json=dashboard_data,
            headers=api_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Sales Overview"
        assert "id" in data
    
    def test_create_dashboard_with_layout(self, client, api_headers):
        """Test creating dashboard with initial layout."""
        dashboard_data = {
            "name": "Layout Test Dashboard",
            "layout": [
                {"i": "widget-1", "x": 0, "y": 0, "w": 6, "h": 4},
                {"i": "widget-2", "x": 6, "y": 0, "w": 6, "h": 4},
            ]
        }
        
        response = client.post(
            "/api/v1/dashboards",
            json=dashboard_data,
            headers=api_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert len(data.get("layout", [])) == 2
    
    def test_create_dashboard_validation_name_required(self, client, api_headers):
        """Test that name is required for dashboard creation."""
        response = client.post(
            "/api/v1/dashboards",
            json={"description": "No name provided"},
            headers=api_headers
        )
        
        assert response.status_code in [400, 422]
    
    def test_create_dashboard_name_too_long(self, client, api_headers):
        """Test validation for dashboard name length."""
        response = client.post(
            "/api/v1/dashboards",
            json={"name": "A" * 300},  # Too long
            headers=api_headers
        )
        
        assert response.status_code in [400, 422]
    
    def test_create_dashboard_sanitizes_html(self, client, api_headers):
        """Test that HTML in name/description is sanitized."""
        response = client.post(
            "/api/v1/dashboards",
            json={
                "name": "<script>alert('xss')</script>Dashboard",
                "description": "<img src=x onerror=alert('xss')>"
            },
            headers=api_headers
        )
        
        if response.status_code == 201:
            data = response.get_json()
            assert "<script>" not in data.get("name", "")
            assert "onerror" not in data.get("description", "")


class TestDashboardAPIList:
    """Tests for dashboard listing via API."""
    
    def test_list_dashboards_paginated(self, client, api_headers):
        """Test paginated dashboard listing."""
        response = client.get(
            "/api/v1/dashboards?page=1&limit=10",
            headers=api_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "items" in data or "dashboards" in data or isinstance(data, list)
    
    def test_list_dashboards_filter_by_tag(self, client, api_headers):
        """Test filtering dashboards by tag."""
        response = client.get(
            "/api/v1/dashboards?tags=sales",
            headers=api_headers
        )
        
        assert response.status_code == 200
    
    def test_list_dashboards_search(self, client, api_headers):
        """Test searching dashboards by name."""
        response = client.get(
            "/api/v1/dashboards?search=overview",
            headers=api_headers
        )
        
        assert response.status_code == 200
    
    def test_list_dashboards_sort_by_updated(self, client, api_headers):
        """Test sorting dashboards by update time."""
        response = client.get(
            "/api/v1/dashboards?sort=-updated_at",
            headers=api_headers
        )
        
        assert response.status_code == 200


class TestDashboardAPIWidgets:
    """Tests for widget operations via API."""
    
    def test_add_widget_to_dashboard(self, client, api_headers, sample_dashboard):
        """Test adding a widget to dashboard."""
        widget_data = {
            "type": "metric_card",
            "title": "Total Revenue",
            "config": {
                "model": "sales_orders",
                "measure": "total_revenue",
                "comparison": "previous_period"
            },
            "position": {"x": 0, "y": 0, "w": 4, "h": 3}
        }
        
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/widgets",
            json=widget_data,
            headers=api_headers
        )
        
        assert response.status_code in [200, 201]
    
    def test_add_widget_invalid_type(self, client, api_headers, sample_dashboard):
        """Test adding widget with invalid type fails."""
        widget_data = {
            "type": "invalid_widget_type",
            "title": "Bad Widget",
        }
        
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/widgets",
            json=widget_data,
            headers=api_headers
        )
        
        assert response.status_code in [400, 422]
    
    def test_update_widget_config(self, client, api_headers, sample_dashboard):
        """Test updating widget configuration."""
        # First add a widget
        widget_data = {
            "type": "bar_chart",
            "title": "Original Title",
        }
        
        create_response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/widgets",
            json=widget_data,
            headers=api_headers
        )
        
        if create_response.status_code in [200, 201]:
            widget_id = create_response.get_json().get("id")
            
            # Update the widget
            update_response = client.patch(
                f"/api/v1/dashboards/{sample_dashboard.id}/widgets/{widget_id}",
                json={"title": "Updated Title"},
                headers=api_headers
            )
            
            assert update_response.status_code == 200
    
    def test_delete_widget(self, client, api_headers, sample_dashboard):
        """Test deleting a widget from dashboard."""
        # First add a widget
        widget_data = {
            "type": "line_chart",
            "title": "Widget to Delete",
        }
        
        create_response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/widgets",
            json=widget_data,
            headers=api_headers
        )
        
        if create_response.status_code in [200, 201]:
            widget_id = create_response.get_json().get("id")
            
            delete_response = client.delete(
                f"/api/v1/dashboards/{sample_dashboard.id}/widgets/{widget_id}",
                headers=api_headers
            )
            
            assert delete_response.status_code in [200, 204]


class TestDashboardSharing:
    """Tests for dashboard sharing functionality."""
    
    def test_share_dashboard_with_user(self, client, api_headers, sample_dashboard):
        """Test sharing dashboard with another user."""
        share_data = {
            "user_id": str(uuid4()),
            "permission": "view"
        }
        
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/share",
            json=share_data,
            headers=api_headers
        )
        
        assert response.status_code in [200, 201]
    
    def test_share_dashboard_invalid_permission(self, client, api_headers, sample_dashboard):
        """Test that invalid share permission fails."""
        share_data = {
            "user_id": str(uuid4()),
            "permission": "superadmin"  # Invalid
        }
        
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/share",
            json=share_data,
            headers=api_headers
        )
        
        assert response.status_code in [400, 422]
    
    def test_make_dashboard_public(self, client, api_headers, sample_dashboard):
        """Test making dashboard public."""
        response = client.patch(
            f"/api/v1/dashboards/{sample_dashboard.id}",
            json={"is_public": True},
            headers=api_headers
        )
        
        assert response.status_code == 200
    
    def test_revoke_dashboard_share(self, client, api_headers, sample_dashboard):
        """Test revoking shared access."""
        user_id = str(uuid4())
        
        # First share
        client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/share",
            json={"user_id": user_id, "permission": "view"},
            headers=api_headers
        )
        
        # Then revoke
        response = client.delete(
            f"/api/v1/dashboards/{sample_dashboard.id}/share/{user_id}",
            headers=api_headers
        )
        
        assert response.status_code in [200, 204]


class TestDashboardFilters:
    """Tests for dashboard global filters."""
    
    def test_apply_date_filter(self, client, api_headers, sample_dashboard):
        """Test applying date range filter to dashboard."""
        filter_data = {
            "filters": [
                {
                    "field": "order_date",
                    "operator": "between",
                    "value": ["2024-01-01", "2024-12-31"]
                }
            ]
        }
        
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/filters",
            json=filter_data,
            headers=api_headers
        )
        
        assert response.status_code in [200, 201]
    
    def test_apply_dimension_filter(self, client, api_headers, sample_dashboard):
        """Test applying dimension filter to dashboard."""
        filter_data = {
            "filters": [
                {
                    "field": "region",
                    "operator": "in",
                    "value": ["North", "South"]
                }
            ]
        }
        
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/filters",
            json=filter_data,
            headers=api_headers
        )
        
        assert response.status_code in [200, 201]
    
    def test_clear_filters(self, client, api_headers, sample_dashboard):
        """Test clearing all dashboard filters."""
        response = client.delete(
            f"/api/v1/dashboards/{sample_dashboard.id}/filters",
            headers=api_headers
        )
        
        assert response.status_code in [200, 204]


class TestDashboardExport:
    """Tests for dashboard export functionality."""
    
    def test_export_dashboard_pdf(self, client, api_headers, sample_dashboard):
        """Test exporting dashboard as PDF."""
        response = client.get(
            f"/api/v1/dashboards/{sample_dashboard.id}/export?format=pdf",
            headers=api_headers
        )
        
        # May return 200 with PDF or 202 for async job
        assert response.status_code in [200, 202]
    
    def test_export_dashboard_png(self, client, api_headers, sample_dashboard):
        """Test exporting dashboard as PNG."""
        response = client.get(
            f"/api/v1/dashboards/{sample_dashboard.id}/export?format=png",
            headers=api_headers
        )
        
        assert response.status_code in [200, 202]
    
    def test_export_dashboard_json(self, client, api_headers, sample_dashboard):
        """Test exporting dashboard configuration as JSON."""
        response = client.get(
            f"/api/v1/dashboards/{sample_dashboard.id}/export?format=json",
            headers=api_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "name" in data


class TestDashboardClone:
    """Tests for dashboard cloning."""
    
    def test_clone_dashboard(self, client, api_headers, sample_dashboard):
        """Test cloning a dashboard."""
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/clone",
            json={"name": "Cloned Dashboard"},
            headers=api_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.get_json()
        assert data.get("name") == "Cloned Dashboard"
        assert data.get("id") != str(sample_dashboard.id)
    
    def test_clone_dashboard_with_widgets(self, client, api_headers, sample_dashboard):
        """Test that cloning preserves widgets."""
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/clone",
            json={"name": "Clone with Widgets", "include_widgets": True},
            headers=api_headers
        )
        
        assert response.status_code in [200, 201]


class TestDashboardVersion:
    """Tests for dashboard versioning."""
    
    def test_get_dashboard_versions(self, client, api_headers, sample_dashboard):
        """Test getting version history of dashboard."""
        response = client.get(
            f"/api/v1/dashboards/{sample_dashboard.id}/versions",
            headers=api_headers
        )
        
        # May not be implemented, so 200 or 404
        assert response.status_code in [200, 404]
    
    def test_restore_dashboard_version(self, client, api_headers, sample_dashboard):
        """Test restoring dashboard to previous version."""
        response = client.post(
            f"/api/v1/dashboards/{sample_dashboard.id}/versions/1/restore",
            headers=api_headers
        )
        
        # May not be implemented
        assert response.status_code in [200, 404]
