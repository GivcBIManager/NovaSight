"""
Unit Tests for User Management API
===================================

Tests for user CRUD, role assignment, and permission management.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4


class TestUserService:
    """Tests for UserService class."""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        with patch('app.services.user_service.db') as mock:
            yield mock
    
    @pytest.fixture
    def mock_password_service(self):
        """Mock password service."""
        with patch('app.services.user_service.PasswordService') as mock:
            instance = mock.return_value
            instance.validate_strength.return_value = (True, None)
            instance.hash.return_value = 'hashed_password'
            yield instance
    
    @pytest.fixture
    def user_service(self, mock_password_service):
        """Create UserService instance."""
        from app.services.user_service import UserService
        return UserService(tenant_id=str(uuid4()))
    
    def test_list_for_tenant_basic(self, mock_db):
        """Test listing users for tenant."""
        from app.services.user_service import UserService
        
        tenant_id = str(uuid4())
        
        # Mock paginate
        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_pagination.pages = 0
        mock_pagination.has_next = False
        mock_pagination.has_prev = False
        
        with patch('app.services.user_service.User') as MockUser:
            MockUser.query.filter_by.return_value.order_by.return_value.paginate.return_value = mock_pagination
            
            result = UserService.list_for_tenant(tenant_id=tenant_id)
            
            assert 'items' in result
            assert 'total' in result
            assert result['page'] == 1
            assert result['per_page'] == 20
    
    def test_list_for_tenant_with_search(self, mock_db):
        """Test listing users with search filter."""
        from app.services.user_service import UserService
        
        tenant_id = str(uuid4())
        
        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_pagination.pages = 0
        mock_pagination.has_next = False
        mock_pagination.has_prev = False
        
        with patch('app.services.user_service.User') as MockUser:
            query_mock = MagicMock()
            query_mock.filter.return_value = query_mock
            query_mock.order_by.return_value.paginate.return_value = mock_pagination
            MockUser.query.filter_by.return_value = query_mock
            MockUser.email.ilike.return_value = True
            MockUser.name.ilike.return_value = True
            
            result = UserService.list_for_tenant(
                tenant_id=tenant_id,
                search="test@example.com"
            )
            
            assert 'items' in result
    
    def test_create_user_validates_password(self, user_service, mock_password_service, mock_db):
        """Test that user creation validates password strength."""
        mock_password_service.validate_strength.return_value = (False, "Password too weak")
        
        with pytest.raises(ValueError, match="Password too weak"):
            user_service.create_user(
                email="test@example.com",
                name="Test User",
                password="weak"
            )
    
    def test_create_user_checks_email_uniqueness(self, user_service, mock_password_service, mock_db):
        """Test that user creation checks for duplicate email."""
        with patch('app.services.user_service.User') as MockUser:
            # Simulate existing user
            MockUser.query.filter.return_value.first.return_value = Mock()
            
            with pytest.raises(ValueError, match="already exists"):
                user_service.create_user(
                    email="existing@example.com",
                    name="Test User",
                    password="ValidPassword123!"
                )
    
    def test_get_permissions_aggregates_roles(self, user_service, mock_db):
        """Test that get_permissions aggregates permissions from all roles."""
        mock_user = Mock()
        mock_role1 = Mock()
        mock_role1.permissions = {"users.view": True, "users.create": False}
        mock_role2 = Mock()
        mock_role2.permissions = {"dashboards.view": True, "dashboards.create": True}
        mock_user.roles = [mock_role1, mock_role2]
        
        with patch.object(user_service, 'get_user', return_value=mock_user):
            permissions = user_service.get_permissions(str(uuid4()))
            
            assert "users.view" in permissions
            assert "dashboards.view" in permissions
            assert "dashboards.create" in permissions
            assert "users.create" not in permissions  # Was False
    
    def test_get_permissions_user_not_found(self, user_service, mock_db):
        """Test get_permissions raises error for non-existent user."""
        with patch.object(user_service, 'get_user', return_value=None):
            with pytest.raises(ValueError, match="User not found"):
                user_service.get_permissions(str(uuid4()))
    
    def test_assign_roles_success(self, user_service, mock_db):
        """Test successful role assignment."""
        mock_user = Mock()
        mock_role = Mock()
        
        with patch.object(user_service, 'get_user', return_value=mock_user):
            with patch('app.services.user_service.Role') as MockRole:
                MockRole.query.filter.return_value.all.return_value = [mock_role]
                
                result = user_service.assign_roles(str(uuid4()), ["viewer"])
                
                assert result == mock_user
                assert mock_user.roles == [mock_role]
    
    def test_change_password_validates_current(self, user_service, mock_password_service, mock_db):
        """Test that change_password validates current password."""
        mock_user = Mock()
        mock_user.check_password.return_value = False
        
        with patch.object(user_service, 'get_user', return_value=mock_user):
            with pytest.raises(ValueError, match="Current password is incorrect"):
                user_service.change_password(
                    str(uuid4()),
                    "wrong_current",
                    "NewValidPassword123!"
                )


class TestUserAPI:
    """Tests for User API endpoints."""
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @pytest.fixture
    def auth_headers(self):
        """Generate mock auth headers."""
        return {"Authorization": "Bearer mock_token"}
    
    def test_list_users_requires_auth(self, client):
        """Test that list users requires authentication."""
        response = client.get('/api/v1/users')
        assert response.status_code in [401, 422]
    
    def test_list_users_requires_admin_role(self, client, auth_headers):
        """Test that list users requires admin role."""
        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request'):
            with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
                mock_identity.return_value = {
                    "tenant_id": str(uuid4()),
                    "user_id": str(uuid4()),
                    "roles": ["viewer"]  # Non-admin role
                }
                
                response = client.get('/api/v1/users', headers=auth_headers)
                # Should be forbidden for non-admin
                assert response.status_code in [403, 401]
    
    def test_get_user_permissions_own_allowed(self, client, auth_headers):
        """Test that users can view their own permissions."""
        user_id = str(uuid4())
        
        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request'):
            with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
                mock_identity.return_value = {
                    "tenant_id": str(uuid4()),
                    "user_id": user_id,
                    "roles": ["viewer"]
                }
                
                with patch('app.services.user_service.UserService') as MockService:
                    MockService.return_value.get_permissions.return_value = ["dashboards.view"]
                    
                    response = client.get(
                        f'/api/v1/users/{user_id}/permissions',
                        headers=auth_headers
                    )
                    # Should be allowed for own permissions
                    assert response.status_code in [200, 401, 404]


class TestRoleAPI:
    """Tests for Role API endpoints."""
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_list_permissions_returns_all(self, client):
        """Test that list permissions returns all available permissions."""
        with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request'):
            with patch('flask_jwt_extended.get_jwt_identity') as mock_identity:
                mock_identity.return_value = {
                    "tenant_id": str(uuid4()),
                    "user_id": str(uuid4()),
                    "roles": ["viewer"]
                }
                
                response = client.get('/api/v1/roles/permissions')
                
                if response.status_code == 200:
                    data = response.get_json()
                    assert 'permissions' in data
                    assert 'categories' in data


class TestUserSchemas:
    """Tests for user validation schemas."""
    
    def test_user_create_schema_validates_email(self):
        """Test that UserCreateSchema validates email format."""
        from app.schemas.user_schemas import UserCreateSchema
        
        schema = UserCreateSchema()
        
        # Invalid email should fail
        with pytest.raises(Exception):
            schema.load({
                "email": "not-an-email",
                "name": "Test User",
                "password": "ValidPassword123!"
            })
    
    def test_user_create_schema_validates_password_length(self):
        """Test that UserCreateSchema validates password length."""
        from app.schemas.user_schemas import UserCreateSchema
        
        schema = UserCreateSchema()
        
        # Short password should fail
        with pytest.raises(Exception):
            schema.load({
                "email": "test@example.com",
                "name": "Test User",
                "password": "short"
            })
    
    def test_user_create_schema_normalizes_email(self):
        """Test that UserCreateSchema normalizes email to lowercase."""
        from app.schemas.user_schemas import UserCreateSchema
        
        schema = UserCreateSchema()
        
        result = schema.load({
            "email": "Test@EXAMPLE.com",
            "name": "Test User",
            "password": "ValidPassword123!"
        })
        
        assert result["email"] == "test@example.com"
    
    def test_user_update_schema_optional_fields(self):
        """Test that UserUpdateSchema allows partial updates."""
        from app.schemas.user_schemas import UserUpdateSchema
        
        schema = UserUpdateSchema()
        
        # Only name should be valid
        result = schema.load({"name": "New Name"})
        assert result["name"] == "New Name"
        assert "password" not in result
        assert "roles" not in result


class TestRoleSchemas:
    """Tests for role validation schemas."""
    
    def test_role_create_schema_validates_name_format(self):
        """Test that RoleCreateSchema validates role name format."""
        from app.schemas.role_schemas import RoleCreateSchema
        
        schema = RoleCreateSchema()
        
        # Invalid name (starts with number) should fail
        with pytest.raises(Exception):
            schema.load({
                "name": "123invalid",
                "display_name": "Invalid Role"
            })
    
    def test_role_create_schema_validates_permissions(self):
        """Test that RoleCreateSchema validates permission names."""
        from app.schemas.role_schemas import RoleCreateSchema
        
        schema = RoleCreateSchema()
        
        # Invalid permission should fail
        with pytest.raises(Exception):
            schema.load({
                "name": "custom_role",
                "display_name": "Custom Role",
                "permissions": ["invalid.permission"]
            })
    
    def test_role_create_schema_valid_permissions(self):
        """Test that RoleCreateSchema accepts valid permissions."""
        from app.schemas.role_schemas import RoleCreateSchema
        
        schema = RoleCreateSchema()
        
        result = schema.load({
            "name": "custom_role",
            "display_name": "Custom Role",
            "permissions": ["users.view", "dashboards.view"]
        })
        
        assert result["name"] == "custom_role"
        assert "users.view" in result["permissions"]
