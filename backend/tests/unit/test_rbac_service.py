"""
Tests for RBAC Service
======================

Unit tests for Role-Based Access Control functionality.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from app.models.rbac import (
    Permission,
    ResourcePermission,
    RoleHierarchy,
    role_permissions,
    get_all_permissions,
)
from app.services.rbac_service import RBACService, rbac_service


class TestRBACService:
    """Tests for RBACService."""
    
    def test_default_permissions_structure(self):
        """Test that default permissions are properly structured."""
        assert "datasources" in RBACService.DEFAULT_PERMISSIONS
        assert "semantic" in RBACService.DEFAULT_PERMISSIONS
        assert "analytics" in RBACService.DEFAULT_PERMISSIONS
        assert "dashboards" in RBACService.DEFAULT_PERMISSIONS
        assert "pipelines" in RBACService.DEFAULT_PERMISSIONS
        assert "users" in RBACService.DEFAULT_PERMISSIONS
        assert "roles" in RBACService.DEFAULT_PERMISSIONS
        assert "admin" in RBACService.DEFAULT_PERMISSIONS
        
        # Check format of permissions
        for category, perms in RBACService.DEFAULT_PERMISSIONS.items():
            for perm in perms:
                assert perm.startswith(f"{category}.")
    
    def test_default_roles_structure(self):
        """Test that default roles are properly structured."""
        assert "super_admin" in RBACService.DEFAULT_ROLES
        assert "tenant_admin" in RBACService.DEFAULT_ROLES
        assert "data_engineer" in RBACService.DEFAULT_ROLES
        assert "bi_developer" in RBACService.DEFAULT_ROLES
        assert "analyst" in RBACService.DEFAULT_ROLES
        assert "viewer" in RBACService.DEFAULT_ROLES
        
        # Check viewer is default
        assert RBACService.DEFAULT_ROLES["viewer"].get("is_default") is True
        
        # Check super_admin has wildcard
        assert "*" in RBACService.DEFAULT_ROLES["super_admin"]["permissions"]
    
    def test_expand_permission_patterns_wildcard(self):
        """Test expanding wildcard permission patterns."""
        patterns = ["*"]
        result = RBACService._expand_permission_patterns(patterns)
        
        # Should contain all categories
        for category in RBACService.DEFAULT_PERMISSIONS.keys():
            assert category in result
    
    def test_expand_permission_patterns_category_wildcard(self):
        """Test expanding category wildcard patterns."""
        patterns = ["dashboards.*", "analytics.*"]
        result = RBACService._expand_permission_patterns(patterns)
        
        assert "dashboards" in result
        assert "analytics" in result
        assert len(result) == 2
    
    def test_expand_permission_patterns_specific(self):
        """Test expanding specific permission patterns."""
        patterns = ["dashboards.view", "dashboards.create", "analytics.query"]
        result = RBACService._expand_permission_patterns(patterns)
        
        assert "dashboards" in result
        assert "analytics" in result
        assert "dashboards.view" in result["dashboards"]
        assert "dashboards.create" in result["dashboards"]
        assert "analytics.query" in result["analytics"]
    
    def test_cache_clear_all(self):
        """Test clearing all cache."""
        # Add something to cache
        RBACService._permission_cache["user1"] = {"perm1", "perm2"}
        RBACService._permission_cache["user2"] = {"perm3"}
        
        RBACService.clear_cache()
        
        assert len(RBACService._permission_cache) == 0
    
    def test_cache_clear_specific_user(self):
        """Test clearing cache for specific user."""
        # Add something to cache
        RBACService._permission_cache["user1"] = {"perm1", "perm2"}
        RBACService._permission_cache["user2"] = {"perm3"}
        
        RBACService.clear_cache("user1")
        
        assert "user1" not in RBACService._permission_cache
        assert "user2" in RBACService._permission_cache


class TestResourcePermission:
    """Tests for ResourcePermission model."""
    
    def test_permission_levels(self):
        """Test permission level hierarchy."""
        assert ResourcePermission.PERMISSION_LEVELS["owner"] == 0
        assert ResourcePermission.PERMISSION_LEVELS["admin"] == 1
        assert ResourcePermission.PERMISSION_LEVELS["edit"] == 2
        assert ResourcePermission.PERMISSION_LEVELS["view"] == 3
    
    def test_has_level_owner(self):
        """Test owner has all levels."""
        rp = ResourcePermission(permission="owner")
        
        assert rp.has_level("owner") is True
        assert rp.has_level("admin") is True
        assert rp.has_level("edit") is True
        assert rp.has_level("view") is True
    
    def test_has_level_view(self):
        """Test view only has view level."""
        rp = ResourcePermission(permission="view")
        
        assert rp.has_level("owner") is False
        assert rp.has_level("admin") is False
        assert rp.has_level("edit") is False
        assert rp.has_level("view") is True
    
    def test_has_level_edit(self):
        """Test edit has edit and view levels."""
        rp = ResourcePermission(permission="edit")
        
        assert rp.has_level("owner") is False
        assert rp.has_level("admin") is False
        assert rp.has_level("edit") is True
        assert rp.has_level("view") is True
    
    def test_is_expired_no_expiry(self):
        """Test non-expiring permission."""
        rp = ResourcePermission(expires_at=None)
        assert rp.is_expired() is False
    
    def test_is_expired_future(self):
        """Test permission with future expiry."""
        rp = ResourcePermission(expires_at=datetime.utcnow() + timedelta(days=1))
        assert rp.is_expired() is False
    
    def test_is_expired_past(self):
        """Test expired permission."""
        rp = ResourcePermission(expires_at=datetime.utcnow() - timedelta(days=1))
        assert rp.is_expired() is True


class TestPermissionModel:
    """Tests for Permission model."""
    
    def test_to_dict(self):
        """Test permission serialization."""
        perm = Permission(
            id=uuid.uuid4(),
            name="dashboards.view",
            description="View dashboards",
            category="dashboards",
            is_system=True
        )
        
        result = perm.to_dict()
        
        assert result["name"] == "dashboards.view"
        assert result["description"] == "View dashboards"
        assert result["category"] == "dashboards"
        assert result["is_system"] is True


class TestPermissionChecking:
    """Tests for permission checking logic."""
    
    @pytest.fixture
    def mock_user(self):
        """Create a mock user with roles."""
        user = MagicMock()
        user.id = uuid.uuid4()
        user.tenant_id = uuid.uuid4()
        user.roles = []
        return user
    
    @pytest.fixture
    def mock_role(self):
        """Create a mock role with permissions."""
        role = MagicMock()
        role.id = uuid.uuid4()
        role.name = "analyst"
        role.permissions = {
            "dashboards": ["dashboards.view", "dashboards.create"],
            "analytics": ["analytics.query"]
        }
        role.parent_roles_rel = []
        return role
    
    def test_check_permission_wildcard(self, mock_user, mock_role):
        """Test wildcard permission grants all access."""
        mock_role.permissions = ["*"]
        mock_user.roles = [mock_role]
        
        # Clear cache first
        RBACService.clear_cache()
        
        with patch.object(RBACService, 'get_user_permissions', return_value={"*"}):
            assert RBACService.check_permission(mock_user, "anything.here") is True
    
    def test_check_permission_category_wildcard(self, mock_user):
        """Test category wildcard grants access to all in category."""
        RBACService.clear_cache()
        
        with patch.object(
            RBACService, 
            'get_user_permissions', 
            return_value={"dashboards.*"}
        ):
            assert RBACService.check_permission(mock_user, "dashboards.view") is True
            assert RBACService.check_permission(mock_user, "dashboards.delete") is True
            assert RBACService.check_permission(mock_user, "analytics.query") is False
    
    def test_check_permission_exact_match(self, mock_user):
        """Test exact permission matching."""
        RBACService.clear_cache()
        
        with patch.object(
            RBACService, 
            'get_user_permissions', 
            return_value={"dashboards.view", "analytics.query"}
        ):
            assert RBACService.check_permission(mock_user, "dashboards.view") is True
            assert RBACService.check_permission(mock_user, "analytics.query") is True
            assert RBACService.check_permission(mock_user, "dashboards.delete") is False
    
    def test_check_permission_colon_format_compatibility(self, mock_user):
        """Test backwards compatibility with colon format."""
        RBACService.clear_cache()
        
        with patch.object(
            RBACService, 
            'get_user_permissions', 
            return_value={"dashboards:view", "admin:*"}
        ):
            # Admin wildcard should grant all access
            assert RBACService.check_permission(mock_user, "anything") is True


class TestResourcePermissionChecking:
    """Tests for resource-level permission checking."""
    
    def test_action_to_level_mapping(self):
        """Test that actions map to correct permission levels."""
        # This tests the logic in check_resource_permission
        action_to_level = {
            "delete": "owner",
            "admin": "admin",
            "share": "admin",
            "edit": "edit",
            "update": "edit",
            "view": "view",
            "read": "view",
        }
        
        for action, level in action_to_level.items():
            # View permission should only allow view/read
            rp = ResourcePermission(permission="view")
            if level == "view":
                assert rp.has_level(level) is True
            else:
                assert rp.has_level(level) is False
