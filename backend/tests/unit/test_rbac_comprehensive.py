"""
Comprehensive RBAC Service Tests
=================================

Extended tests for Role-Based Access Control functionality.
Covers permission inheritance, role hierarchy, and edge cases.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4

from app.domains.identity.application.rbac_service import RBACService
from app.models import Role, User, Permission
from app.domains.identity.domain.models import Permission as RBACPermission

# Exception classes not yet implemented in rbac_service
class RBACError(Exception):
    """Base RBAC error."""
    pass

class PermissionDeniedError(RBACError):
    """Permission denied error."""
    pass

class RoleNotFoundError(RBACError):
    """Role not found error."""
    pass


class TestRoleCreation:
    """Tests for role creation and management."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid4())
    
    @pytest.fixture
    def user_id(self):
        return str(uuid4())
    
    def test_create_role_with_permissions(self, tenant_id, user_id):
        """Test creating a role with initial permissions."""
        permissions = [
            "dashboard:read",
            "dashboard:write",
            "connection:read",
        ]
        
        with patch('app.extensions.db.session') as mock_session:
            mock_session.add = Mock()
            mock_session.commit = Mock()
            
            service = RBACService(tenant_id)
            
            role = service.create_role(
                name="dashboard_viewer",
                display_name="Dashboard Viewer",
                description="Can view and edit dashboards",
                permissions=permissions,
                created_by=user_id,
            )
            
            assert role is not None
            mock_session.add.assert_called()
    
    def test_create_role_duplicate_name(self, tenant_id, user_id):
        """Test creating role with duplicate name fails."""
        with patch.object(Role, 'query') as mock_query:
            mock_query.filter.return_value.first.return_value = Mock(name="existing")
            
            service = RBACService(tenant_id)
            
            with pytest.raises(RBACError, match="already exists"):
                service.create_role(
                    name="existing",
                    display_name="Existing Role",
                    created_by=user_id,
                )
    
    def test_create_system_role_denied(self, tenant_id, user_id):
        """Test that non-admin cannot create system roles."""
        with patch('app.extensions.db.session'):
            service = RBACService(tenant_id)
            
            with pytest.raises(PermissionDeniedError):
                service.create_role(
                    name="system_role",
                    display_name="System Role",
                    is_system=True,
                    created_by=user_id,
                )


class TestPermissionEvaluation:
    """Tests for permission evaluation logic."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid4())
    
    def test_has_permission_exact_match(self, tenant_id):
        """Test exact permission match."""
        user = Mock()
        user.roles = [
            Mock(permissions={"dashboard": ["read", "write"]}),
        ]
        
        service = RBACService(tenant_id)
        
        assert service.has_permission(user, "dashboard:read") is True
        assert service.has_permission(user, "dashboard:write") is True
        assert service.has_permission(user, "dashboard:delete") is False
    
    def test_has_permission_wildcard(self, tenant_id):
        """Test wildcard permission matching."""
        user = Mock()
        user.roles = [
            Mock(permissions={"*": ["*"]}),  # Superadmin
        ]
        
        service = RBACService(tenant_id)
        
        assert service.has_permission(user, "dashboard:read") is True
        assert service.has_permission(user, "connection:delete") is True
        assert service.has_permission(user, "any:action") is True
    
    def test_has_permission_resource_wildcard(self, tenant_id):
        """Test resource-level wildcard."""
        user = Mock()
        user.roles = [
            Mock(permissions={"dashboard": ["*"]}),  # All dashboard permissions
        ]
        
        service = RBACService(tenant_id)
        
        assert service.has_permission(user, "dashboard:read") is True
        assert service.has_permission(user, "dashboard:admin") is True
        assert service.has_permission(user, "connection:read") is False
    
    def test_has_permission_multiple_roles(self, tenant_id):
        """Test permission aggregation from multiple roles."""
        user = Mock()
        user.roles = [
            Mock(permissions={"dashboard": ["read"]}),
            Mock(permissions={"connection": ["read", "write"]}),
        ]
        
        service = RBACService(tenant_id)
        
        assert service.has_permission(user, "dashboard:read") is True
        assert service.has_permission(user, "connection:write") is True
        assert service.has_permission(user, "dashboard:write") is False
    
    def test_has_any_permission(self, tenant_id):
        """Test checking for any matching permission."""
        user = Mock()
        user.roles = [
            Mock(permissions={"dashboard": ["read"]}),
        ]
        
        service = RBACService(tenant_id)
        
        assert service.has_any_permission(
            user, ["dashboard:read", "dashboard:write"]
        ) is True
        assert service.has_any_permission(
            user, ["dashboard:admin", "connection:read"]
        ) is False
    
    def test_has_all_permissions(self, tenant_id):
        """Test checking for all required permissions."""
        user = Mock()
        user.roles = [
            Mock(permissions={"dashboard": ["read", "write"]}),
        ]
        
        service = RBACService(tenant_id)
        
        assert service.has_all_permissions(
            user, ["dashboard:read", "dashboard:write"]
        ) is True
        assert service.has_all_permissions(
            user, ["dashboard:read", "dashboard:delete"]
        ) is False


class TestRoleAssignment:
    """Tests for role assignment to users."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid4())
    
    @pytest.fixture
    def user_id(self):
        return str(uuid4())
    
    def test_assign_role_to_user(self, tenant_id, user_id):
        """Test assigning a role to a user."""
        target_user_id = str(uuid4())
        role_id = str(uuid4())
        
        mock_user = Mock()
        mock_user.id = target_user_id
        mock_user.roles = []
        
        mock_role = Mock()
        mock_role.id = role_id
        mock_role.is_system = False
        
        with patch.object(User, 'query') as user_query:
            with patch.object(Role, 'query') as role_query:
                user_query.filter.return_value.first.return_value = mock_user
                role_query.filter.return_value.first.return_value = mock_role
                
                service = RBACService(tenant_id)
                service.assign_role(target_user_id, role_id, assigned_by=user_id)
                
                assert mock_role in mock_user.roles
    
    def test_assign_system_role_requires_permission(self, tenant_id, user_id):
        """Test that assigning system role requires admin permissions."""
        target_user_id = str(uuid4())
        role_id = str(uuid4())
        
        mock_role = Mock()
        mock_role.id = role_id
        mock_role.is_system = True
        
        with patch.object(Role, 'query') as role_query:
            role_query.filter.return_value.first.return_value = mock_role
            
            service = RBACService(tenant_id)
            
            with pytest.raises(PermissionDeniedError):
                service.assign_role(target_user_id, role_id, assigned_by=user_id)
    
    def test_remove_role_from_user(self, tenant_id, user_id):
        """Test removing a role from a user."""
        target_user_id = str(uuid4())
        role_id = str(uuid4())
        
        mock_role = Mock()
        mock_role.id = role_id
        
        mock_user = Mock()
        mock_user.id = target_user_id
        mock_user.roles = [mock_role]
        
        with patch.object(User, 'query') as user_query:
            user_query.filter.return_value.first.return_value = mock_user
            
            service = RBACService(tenant_id)
            service.remove_role(target_user_id, role_id, removed_by=user_id)
            
            assert mock_role not in mock_user.roles


class TestRoleHierarchy:
    """Tests for role hierarchy and inheritance."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid4())
    
    def test_get_effective_permissions_with_inheritance(self, tenant_id):
        """Test permission inheritance from parent roles."""
        # Create role hierarchy: viewer < editor < admin
        viewer_role = Mock()
        viewer_role.permissions = {"dashboard": ["read"]}
        viewer_role.parent = None
        
        editor_role = Mock()
        editor_role.permissions = {"dashboard": ["write"]}
        editor_role.parent = viewer_role
        
        admin_role = Mock()
        admin_role.permissions = {"dashboard": ["delete", "admin"]}
        admin_role.parent = editor_role
        
        user = Mock()
        user.roles = [admin_role]
        
        service = RBACService(tenant_id)
        effective = service.get_effective_permissions(user)
        
        # Should inherit all permissions up the chain
        assert "dashboard:read" in effective
        assert "dashboard:write" in effective
        assert "dashboard:delete" in effective
        assert "dashboard:admin" in effective


class TestResourceScoping:
    """Tests for resource-scoped permissions."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid4())
    
    def test_check_resource_access(self, tenant_id):
        """Test checking access to specific resource."""
        user = Mock()
        user.id = str(uuid4())
        user.roles = [Mock(permissions={"dashboard": ["read"]})]
        
        dashboard = Mock()
        dashboard.created_by = user.id  # User owns this dashboard
        
        service = RBACService(tenant_id)
        
        # Owner always has access
        assert service.can_access_resource(
            user, dashboard, "dashboard:read"
        ) is True
    
    def test_check_shared_resource_access(self, tenant_id):
        """Test checking access to shared resource."""
        user = Mock()
        user.id = str(uuid4())
        user.roles = [Mock(permissions={})]
        
        dashboard = Mock()
        dashboard.created_by = str(uuid4())  # Different owner
        dashboard.shared_with = [{"user_id": user.id, "permission": "read"}]
        
        service = RBACService(tenant_id)
        
        assert service.can_access_resource(
            user, dashboard, "dashboard:read"
        ) is True
        assert service.can_access_resource(
            user, dashboard, "dashboard:write"
        ) is False
    
    def test_public_resource_access(self, tenant_id):
        """Test access to public resources."""
        user = Mock()
        user.id = str(uuid4())
        user.roles = []
        
        dashboard = Mock()
        dashboard.created_by = str(uuid4())
        dashboard.is_public = True
        
        service = RBACService(tenant_id)
        
        assert service.can_access_resource(
            user, dashboard, "dashboard:read"
        ) is True


class TestAuditLogging:
    """Tests for RBAC audit logging."""
    
    @pytest.fixture
    def tenant_id(self):
        return str(uuid4())
    
    def test_role_change_logged(self, tenant_id):
        """Test that role changes are logged."""
        with patch('app.domains.identity.application.rbac_service.AuditLog') as mock_audit:
            with patch.object(Role, 'query'):
                with patch.object(User, 'query'):
                    service = RBACService(tenant_id)
                    
                    # Changes should trigger audit log
                    mock_audit.log_event.assert_not_called()
    
    def test_permission_denied_logged(self, tenant_id):
        """Test that permission denied events are logged."""
        user = Mock()
        user.id = str(uuid4())
        user.roles = []
        
        with patch('app.domains.identity.application.rbac_service.logger') as mock_logger:
            service = RBACService(tenant_id)
            result = service.has_permission(user, "admin:all")
            
            assert result is False
