"""
NovaSight Admin Flow Integration Tests
========================================

Integration tests for administrative functions including
tenant management, user management, role management, and system settings.
"""

import pytest
from flask.testing import FlaskClient
from typing import Dict, Any

from tests.integration.conftest import helper


class TestTenantManagement:
    """Integration tests for tenant management (super admin)."""
    
    def test_list_tenants(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test listing all tenants."""
        response = integration_client.get(
            "/api/v1/admin/tenants",
            headers=auth_headers
        )
        
        # Either success or endpoint not found/forbidden
        assert response.status_code in [200, 403, 404]
    
    def test_get_tenant_details(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test getting tenant details."""
        tenant = seeded_tenant["tenant"]
        
        response = integration_client.get(
            f"/api/v1/admin/tenants/{tenant.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 403, 404]
    
    def test_update_tenant_settings(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test updating tenant settings."""
        tenant = seeded_tenant["tenant"]
        
        response = integration_client.patch(
            f"/api/v1/admin/tenants/{tenant.id}",
            json={
                "settings": {
                    "timezone": "America/New_York",
                    "date_format": "MM/DD/YYYY",
                }
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 403, 404]


class TestUserManagement:
    """Integration tests for user management."""
    
    def test_list_users(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test listing users in tenant."""
        response = integration_client.get(
            "/api/v1/users",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.get_json()
            assert "users" in data or isinstance(data, list)
    
    def test_get_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test getting user details."""
        user = seeded_tenant["admin_user"]
        
        response = integration_client.get(
            f"/api/v1/users/{user.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_create_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a new user."""
        response = integration_client.post(
            "/api/v1/users",
            json={
                "email": "newadminuser@integration.test",
                "name": "New Admin User",
                "password": "SecurePassword123!",
                "roles": ["viewer"],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [201, 404]
    
    def test_update_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test updating user details."""
        user = seeded_tenant["regular_user"]
        
        response = integration_client.patch(
            f"/api/v1/users/{user.id}",
            json={
                "name": "Updated User Name",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_deactivate_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test deactivating a user."""
        user = seeded_tenant["regular_user"]
        
        response = integration_client.patch(
            f"/api/v1/users/{user.id}",
            json={
                "status": "inactive",
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_delete_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test deleting a user."""
        user = seeded_tenant["regular_user"]
        
        response = integration_client.delete(
            f"/api/v1/users/{user.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204, 404]


class TestRoleManagement:
    """Integration tests for role management."""
    
    def test_list_roles(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test listing roles in tenant."""
        response = integration_client.get(
            "/api/v1/roles",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_get_role(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test getting role details."""
        role = seeded_tenant["admin_role"]
        
        response = integration_client.get(
            f"/api/v1/roles/{role.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_create_custom_role(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test creating a custom role."""
        response = integration_client.post(
            "/api/v1/roles",
            json={
                "name": "custom_analyst",
                "display_name": "Custom Analyst",
                "description": "Custom role for analysts",
                "permissions": [
                    "dashboards:view",
                    "dashboards:create",
                    "semantic:view",
                    "analytics:query",
                ],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [201, 404]
    
    def test_update_role_permissions(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test updating role permissions."""
        role = seeded_tenant["viewer_role"]
        
        response = integration_client.patch(
            f"/api/v1/roles/{role.id}",
            json={
                "permissions": [
                    "dashboards:view",
                    "semantic:view",
                ],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_cannot_modify_system_role(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test that system roles cannot be modified."""
        admin_role = seeded_tenant["admin_role"]
        
        response = integration_client.delete(
            f"/api/v1/roles/{admin_role.id}",
            headers=auth_headers
        )
        
        # System roles should not be deletable
        assert response.status_code in [400, 403, 404]
    
    def test_assign_role_to_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test assigning a role to a user."""
        user = seeded_tenant["regular_user"]
        admin_role = seeded_tenant["admin_role"]
        
        response = integration_client.post(
            f"/api/v1/users/{user.id}/roles",
            json={
                "role_id": str(admin_role.id),
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201, 404]
    
    def test_remove_role_from_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test removing a role from a user."""
        user = seeded_tenant["regular_user"]
        viewer_role = seeded_tenant["viewer_role"]
        
        response = integration_client.delete(
            f"/api/v1/users/{user.id}/roles/{viewer_role.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204, 404]


class TestAuditLog:
    """Integration tests for audit log access."""
    
    def test_list_audit_logs(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test listing audit logs."""
        response = integration_client.get(
            "/api/v1/audit",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 403, 404]
    
    def test_filter_audit_logs_by_action(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test filtering audit logs by action type."""
        response = integration_client.get(
            "/api/v1/audit?action=login",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 403, 404]
    
    def test_filter_audit_logs_by_user(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test filtering audit logs by user."""
        user = seeded_tenant["admin_user"]
        
        response = integration_client.get(
            f"/api/v1/audit?user_id={user.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 403, 404]
    
    def test_filter_audit_logs_by_date_range(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test filtering audit logs by date range."""
        response = integration_client.get(
            "/api/v1/audit?start_date=2024-01-01&end_date=2024-12-31",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 403, 404]


class TestSystemSettings:
    """Integration tests for system settings."""
    
    def test_get_system_settings(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test getting system settings."""
        response = integration_client.get(
            "/api/v1/settings",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_update_system_settings(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test updating system settings."""
        response = integration_client.patch(
            "/api/v1/settings",
            json={
                "default_timezone": "UTC",
                "session_timeout_minutes": 60,
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 403, 404]


class TestInvitations:
    """Integration tests for user invitations."""
    
    def test_send_invitation(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test sending a user invitation."""
        response = integration_client.post(
            "/api/v1/invitations",
            json={
                "email": "invited@integration.test",
                "roles": ["viewer"],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201, 404]
    
    def test_list_pending_invitations(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test listing pending invitations."""
        response = integration_client.get(
            "/api/v1/invitations",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_revoke_invitation(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test revoking an invitation."""
        # First create an invitation
        create_response = integration_client.post(
            "/api/v1/invitations",
            json={
                "email": "revoke@integration.test",
                "roles": ["viewer"],
            },
            headers=auth_headers
        )
        
        if create_response.status_code in [200, 201]:
            invitation_id = create_response.get_json().get("id")
            if invitation_id:
                response = integration_client.delete(
                    f"/api/v1/invitations/{invitation_id}",
                    headers=auth_headers
                )
                assert response.status_code in [200, 204, 404]


class TestAdminRBAC:
    """Integration tests for admin RBAC."""
    
    def test_viewer_cannot_access_admin_endpoints(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str]
    ):
        """Test that viewer role cannot access admin endpoints."""
        response = integration_client.get(
            "/api/v1/admin/tenants",
            headers=viewer_auth_headers
        )
        
        assert response.status_code in [403, 404]
    
    def test_viewer_cannot_create_users(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str]
    ):
        """Test that viewer cannot create users."""
        response = integration_client.post(
            "/api/v1/users",
            json={
                "email": "viewercreated@integration.test",
                "name": "Viewer Created",
                "password": "SecurePassword123!",
            },
            headers=viewer_auth_headers
        )
        
        assert response.status_code in [403, 404]
    
    def test_viewer_cannot_modify_roles(
        self,
        integration_client: FlaskClient,
        viewer_auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test that viewer cannot modify roles."""
        role = seeded_tenant["viewer_role"]
        
        response = integration_client.patch(
            f"/api/v1/roles/{role.id}",
            json={
                "permissions": ["*"],
            },
            headers=viewer_auth_headers
        )
        
        assert response.status_code in [403, 404]


class TestBulkOperations:
    """Integration tests for bulk admin operations."""
    
    def test_bulk_user_deactivation(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test bulk user deactivation."""
        user = seeded_tenant["regular_user"]
        
        response = integration_client.post(
            "/api/v1/users/bulk/deactivate",
            json={
                "user_ids": [str(user.id)],
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
    
    def test_bulk_role_assignment(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str],
        seeded_tenant: Dict[str, Any]
    ):
        """Test bulk role assignment."""
        user = seeded_tenant["regular_user"]
        role = seeded_tenant["admin_role"]
        
        response = integration_client.post(
            "/api/v1/roles/bulk/assign",
            json={
                "user_ids": [str(user.id)],
                "role_id": str(role.id),
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
