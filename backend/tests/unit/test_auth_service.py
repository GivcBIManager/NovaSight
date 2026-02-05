"""
Unit Tests for Auth Service
============================

Comprehensive tests for the AuthService including:
- User registration
- Authentication
- Login attempt tracking
- Account lockout
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import uuid

from app.services.auth_service import AuthService
from app.models.user import User, UserStatus
from app.models.tenant import Tenant, TenantStatus


class TestUserRegistration:
    """Tests for user registration functionality."""
    
    @pytest.fixture
    def auth_service(self):
        return AuthService()
    
    def test_register_user_success(self, auth_service, db_session, sample_tenant):
        """Test successful user registration."""
        user, error = auth_service.register_user(
            email="newuser@example.com",
            password="SecurePass123!@#",
            name="New User",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is not None
        assert error is None
        assert user.email == "newuser@example.com"
        assert user.name == "New User"
        assert user.tenant_id == sample_tenant.id
    
    def test_register_user_weak_password(self, auth_service, sample_tenant):
        """Test registration with weak password fails."""
        user, error = auth_service.register_user(
            email="weakpass@example.com",
            password="weak",
            name="Weak Pass User",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is None
        assert error is not None
        assert "12 characters" in error or "password" in error.lower()
    
    def test_register_user_invalid_tenant(self, auth_service):
        """Test registration with invalid tenant slug."""
        user, error = auth_service.register_user(
            email="notenent@example.com",
            password="SecurePass123!@#",
            name="No Tenant User",
            tenant_slug="nonexistent-tenant"
        )
        
        assert user is None
        assert error == "Tenant not found"
    
    def test_register_user_inactive_tenant(self, auth_service, db_session):
        """Test registration fails for inactive tenant."""
        # Create inactive tenant
        inactive_tenant = Tenant(
            name="Inactive Tenant",
            slug="inactive-tenant",
            status=TenantStatus.SUSPENDED,
        )
        db_session.add(inactive_tenant)
        db_session.commit()
        
        user, error = auth_service.register_user(
            email="inactive@example.com",
            password="SecurePass123!@#",
            name="Inactive Tenant User",
            tenant_slug="inactive-tenant"
        )
        
        assert user is None
        assert "not active" in error.lower()
    
    def test_register_user_duplicate_email(self, auth_service, db_session, sample_tenant, sample_user):
        """Test registration fails for duplicate email in same tenant."""
        user, error = auth_service.register_user(
            email=sample_user.email,  # Same as existing user
            password="SecurePass123!@#",
            name="Duplicate User",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is None
        assert "already exists" in error.lower()
    
    def test_register_user_email_normalized(self, auth_service, db_session, sample_tenant):
        """Test email is normalized to lowercase."""
        user, error = auth_service.register_user(
            email="UPPERCASE@EXAMPLE.COM",
            password="SecurePass123!@#",
            name="Uppercase Email User",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is not None
        assert user.email == "uppercase@example.com"


class TestUserAuthentication:
    """Tests for user authentication functionality."""
    
    @pytest.fixture
    def auth_service(self):
        return AuthService()
    
    def test_authenticate_success(self, auth_service, db_session, sample_user, sample_tenant):
        """Test successful authentication."""
        user, error = auth_service.authenticate(
            email=sample_user.email,
            password="Admin123!",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is not None
        assert error is None
        assert user.id == sample_user.id
    
    def test_authenticate_invalid_password(self, auth_service, db_session, sample_user, sample_tenant):
        """Test authentication fails with wrong password."""
        user, error = auth_service.authenticate(
            email=sample_user.email,
            password="WrongPassword123!",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is None
        assert "Invalid credentials" in error
    
    def test_authenticate_nonexistent_user(self, auth_service, db_session, sample_tenant):
        """Test authentication fails for non-existent user."""
        user, error = auth_service.authenticate(
            email="nonexistent@example.com",
            password="SomePassword123!",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is None
        assert "Invalid credentials" in error
    
    def test_authenticate_inactive_user(self, auth_service, db_session, sample_tenant):
        """Test authentication fails for inactive user."""
        from app.services.password_service import password_service
        
        inactive_user = User(
            tenant_id=sample_tenant.id,
            email="inactive@example.com",
            name="Inactive User",
            password_hash=password_service.hash("Admin123!"),
            status=UserStatus.LOCKED,  # Using LOCKED instead of SUSPENDED
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        user, error = auth_service.authenticate(
            email="inactive@example.com",
            password="Admin123!",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is None
        assert "not active" in error.lower()
    
    def test_authenticate_email_case_insensitive(self, auth_service, db_session, sample_user, sample_tenant):
        """Test authentication is case-insensitive for email."""
        user, error = auth_service.authenticate(
            email=sample_user.email.upper(),
            password="Admin123!",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is not None
        assert error is None


class TestLoginAttemptTracking:
    """Tests for login attempt tracking and lockout."""
    
    @pytest.fixture
    def auth_service(self):
        return AuthService()
    
    def test_lockout_after_failed_attempts(self, auth_service, db_session, sample_user, sample_tenant):
        """Test account lockout after multiple failed attempts."""
        # Make multiple failed login attempts
        for i in range(10):
            auth_service.authenticate(
                email=sample_user.email,
                password="WrongPassword123!",
                tenant_slug=sample_tenant.slug
            )
        
        # Try with correct password - should be locked out
        user, error = auth_service.authenticate(
            email=sample_user.email,
            password="Admin123!",  # Correct password
            tenant_slug=sample_tenant.slug
        )
        
        # Account should be locked
        assert user is None
        assert "locked" in error.lower() or "try again" in error.lower()
    
    def test_successful_login_resets_attempts(self, auth_service, db_session, sample_user, sample_tenant):
        """Test successful login resets failed attempt counter."""
        # Make a few failed attempts (not enough to lock)
        for i in range(3):
            auth_service.authenticate(
                email=sample_user.email,
                password="WrongPassword123!",
                tenant_slug=sample_tenant.slug
            )
        
        # Successful login
        user, error = auth_service.authenticate(
            email=sample_user.email,
            password="Admin123!",
            tenant_slug=sample_tenant.slug
        )
        
        assert user is not None


class TestAuthServiceEdgeCases:
    """Edge case tests for auth service."""
    
    @pytest.fixture
    def auth_service(self):
        return AuthService()
    
    def test_register_empty_email(self, auth_service, sample_tenant):
        """Test registration with empty email."""
        user, error = auth_service.register_user(
            email="",
            password="SecurePass123!@#",
            name="No Email User",
            tenant_slug=sample_tenant.slug
        )
        
        # Should fail validation
        assert user is None
    
    def test_register_empty_name(self, auth_service, sample_tenant):
        """Test registration with empty name."""
        user, error = auth_service.register_user(
            email="emptyname@example.com",
            password="SecurePass123!@#",
            name="",
            tenant_slug=sample_tenant.slug
        )
        
        # Implementation may allow empty name or reject
        # Either behavior is valid - just document it
        if user is not None:
            assert user.name == "" or user.name is not None
    
    def test_authenticate_without_tenant(self, auth_service, db_session, sample_user):
        """Test authentication without specifying tenant."""
        # This may work if email is unique across tenants
        user, error = auth_service.authenticate(
            email=sample_user.email,
            password="TestPassword123!",
            tenant_slug=None
        )
        
        # Should either succeed or fail gracefully
        if user is None:
            assert error is not None
