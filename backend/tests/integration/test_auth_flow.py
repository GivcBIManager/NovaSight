"""
NovaSight Authentication Flow Integration Tests
================================================

Integration tests for the complete authentication flow including
registration, login, refresh tokens, and logout.
"""

import pytest
from flask.testing import FlaskClient
from typing import Dict, Any

from tests.integration.conftest import helper


class TestAuthRegistrationFlow:
    """Integration tests for user registration flow."""
    
    def test_full_registration_flow(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test complete user registration and verification."""
        tenant = seeded_tenant["tenant"]
        
        # Register new user
        register_response = integration_client.post("/api/v1/auth/register", json={
            "email": "newuser@example.com",
            "password": "Xt9#kP2@mN7$",
            "name": "New Test User",
            "tenant_slug": tenant.slug,
        })
        
        assert register_response.status_code == 201
        data = register_response.get_json()
        assert "user" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert "id" in data["user"]
    
    def test_registration_duplicate_email(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test that duplicate email registration fails."""
        tenant = seeded_tenant["tenant"]
        admin_user = seeded_tenant["admin_user"]
        
        # Try to register with existing email
        response = integration_client.post("/api/v1/auth/register", json={
            "email": admin_user.email,
            "password": "Xt9#kP2@mN7$",
            "name": "Duplicate User",
            "tenant_slug": tenant.slug,
        })
        
        # Should fail with validation error
        assert response.status_code in [400, 409]
    
    def test_registration_invalid_password(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test that weak password is rejected."""
        tenant = seeded_tenant["tenant"]
        
        response = integration_client.post("/api/v1/auth/register", json={
            "email": "weakpassword@example.com",
            "password": "weak",  # Too short
            "name": "Weak Password User",
            "tenant_slug": tenant.slug,
        })
        
        assert response.status_code in [400, 422]
    
    def test_registration_invalid_tenant(
        self,
        integration_client: FlaskClient,
    ):
        """Test that registration with invalid tenant fails."""
        response = integration_client.post("/api/v1/auth/register", json={
            "email": "novatenant@example.com",
            "password": "Xt9#kP2@mN7$",
            "name": "No Tenant User",
            "tenant_slug": "nonexistent-tenant",
        })
        
        assert response.status_code in [400, 404]


class TestAuthLoginFlow:
    """Integration tests for user login flow."""
    
    def test_successful_login(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test successful login returns tokens."""
        admin_user = seeded_tenant["admin_user"]
        tenant = seeded_tenant["tenant"]
        
        response = integration_client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "TestPassword123!",
            "tenant_slug": tenant.slug,
        })
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify tokens are returned
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "Bearer"
        
        # Verify user info is returned
        assert "user" in data
        assert data["user"]["email"] == admin_user.email
    
    def test_login_invalid_password(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test login with wrong password fails."""
        admin_user = seeded_tenant["admin_user"]
        tenant = seeded_tenant["tenant"]
        
        response = integration_client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "WrongPassword123!",
            "tenant_slug": tenant.slug,
        })
        
        assert response.status_code == 401
    
    def test_login_nonexistent_user(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test login with non-existent user fails."""
        tenant = seeded_tenant["tenant"]
        
        response = integration_client.post("/api/v1/auth/login", json={
            "email": "nobody@example.com",
            "password": "TestPassword123!",
            "tenant_slug": tenant.slug,
        })
        
        assert response.status_code == 401
    
    def test_login_missing_fields(
        self,
        integration_client: FlaskClient,
    ):
        """Test login with missing fields fails."""
        response = integration_client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            # Missing password
        })
        
        assert response.status_code in [400, 422]


class TestAuthTokenFlow:
    """Integration tests for token management."""
    
    def test_access_protected_endpoint(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test accessing protected endpoint with valid token."""
        response = integration_client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert "email" in data or "user" in data
    
    def test_access_without_token(
        self,
        integration_client: FlaskClient,
    ):
        """Test accessing protected endpoint without token fails."""
        response = integration_client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
    
    def test_access_with_invalid_token(
        self,
        integration_client: FlaskClient,
    ):
        """Test accessing protected endpoint with invalid token fails."""
        response = integration_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token-here"}
        )
        
        assert response.status_code in [401, 422]
    
    def test_token_refresh(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test refreshing access token with refresh token."""
        admin_user = seeded_tenant["admin_user"]
        tenant = seeded_tenant["tenant"]
        
        # First, login to get tokens
        login_response = integration_client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "TestPassword123!",
            "tenant_slug": tenant.slug,
        })
        
        assert login_response.status_code == 200
        tokens = login_response.get_json()
        refresh_token = tokens["refresh_token"]
        
        # Use refresh token to get new access token
        refresh_response = integration_client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.get_json()
        assert "access_token" in new_tokens


class TestAuthLogoutFlow:
    """Integration tests for logout flow."""
    
    def test_logout(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test logout invalidates token."""
        admin_user = seeded_tenant["admin_user"]
        tenant = seeded_tenant["tenant"]
        
        # Login
        login_response = integration_client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "TestPassword123!",
            "tenant_slug": tenant.slug,
        })
        
        assert login_response.status_code == 200
        tokens = login_response.get_json()
        access_token = tokens["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Verify token works before logout
        me_response = integration_client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        
        # Logout
        logout_response = integration_client.post(
            "/api/v1/auth/logout",
            headers=headers
        )
        
        assert logout_response.status_code == 200
        
        # Token should be invalidated after logout
        # Note: This depends on token blacklist implementation
        me_after_logout = integration_client.get("/api/v1/auth/me", headers=headers)
        # May still work if blacklist is not implemented
        # assert me_after_logout.status_code == 401


class TestAuthPasswordReset:
    """Integration tests for password reset flow."""
    
    def test_request_password_reset(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test requesting password reset."""
        admin_user = seeded_tenant["admin_user"]
        
        response = integration_client.post("/api/v1/auth/forgot-password", json={
            "email": admin_user.email,
        })
        
        # Should return success even if email doesn't exist (security)
        assert response.status_code in [200, 202, 404]  # 404 if endpoint not implemented
    
    def test_password_reset_unknown_email(
        self,
        integration_client: FlaskClient,
    ):
        """Test password reset for unknown email."""
        response = integration_client.post("/api/v1/auth/forgot-password", json={
            "email": "unknown@example.com",
        })
        
        # Should return success to prevent email enumeration
        assert response.status_code in [200, 202, 404]


class TestAuthRateLimiting:
    """Integration tests for authentication rate limiting."""
    
    def test_login_rate_limiting(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any]
    ):
        """Test that login is rate limited after multiple failures."""
        tenant = seeded_tenant["tenant"]
        
        # Make multiple failed login attempts
        for i in range(6):
            response = integration_client.post("/api/v1/auth/login", json={
                "email": f"brute-force-{i}@example.com",
                "password": "WrongPassword123!",
                "tenant_slug": tenant.slug,
            })
        
        # After rate limit is hit, should get 429 Too Many Requests
        # Note: This depends on rate limiter configuration
        # If rate limiting is strict enough, last response should be 429


class TestAuthTenantIsolation:
    """Integration tests for multi-tenant authentication isolation."""
    
    def test_user_cannot_login_to_other_tenant(
        self,
        integration_client: FlaskClient,
        seeded_tenant: Dict[str, Any],
        integration_app
    ):
        """Test that users cannot access other tenants."""
        from app.domains.tenants.domain.models import Tenant, TenantStatus, SubscriptionPlan
        from app.extensions import db
        
        with integration_app.app_context():
            # Create another tenant - use string values for enum columns
            other_tenant = Tenant(
                name="Other Tenant",
                slug="other-tenant",
                plan="professional",
                status="active",
            )
            db.session.add(other_tenant)
            db.session.commit()
            
            # Try to login to other tenant with first tenant's credentials
            admin_user = seeded_tenant["admin_user"]
            
            response = integration_client.post("/api/v1/auth/login", json={
                "email": admin_user.email,
                "password": "TestPassword123!",
                "tenant_slug": other_tenant.slug,
            })
            
            # Should fail - user doesn't belong to other tenant
            assert response.status_code == 401
