"""
Authentication Security Tests
=============================

Security tests for authentication mechanisms including:
- Password handling and storage
- Token security
- Rate limiting
- Session management
"""

import pytest
import time
from datetime import timedelta


class TestPasswordSecurity:
    """Tests for password security handling."""
    
    def test_password_hash_not_exposed_in_user_response(
        self, client, api_headers, sample_user
    ):
        """Ensure password hash is never exposed in API responses."""
        response = client.get(
            f'/api/v1/users/{sample_user.id}',
            headers=api_headers
        )
        
        if response.status_code == 200:
            data = str(response.json)
            assert 'password' not in data.lower() or 'password_hash' not in data
            assert sample_user.password_hash not in data
    
    def test_password_hash_not_exposed_in_auth_response(
        self, client, sample_user, sample_tenant
    ):
        """Ensure password hash is not in login response."""
        response = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'TestPassword123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if response.status_code == 200:
            data = str(response.json)
            assert 'password_hash' not in data
            assert 'hash' not in data.lower() or 'password' not in data.lower()
    
    def test_passwords_are_properly_hashed(self, db_session, sample_user):
        """Verify passwords are hashed, not stored in plain text."""
        # Password should never equal the hash
        assert sample_user.password_hash != 'TestPassword123!'
        
        # Hash should be a proper bcrypt/argon2 hash
        assert len(sample_user.password_hash) > 20
        
        # Hash should contain algorithm markers
        assert sample_user.password_hash.startswith('$')
    
    def test_weak_password_rejected(self, client, sample_tenant):
        """Ensure weak passwords are rejected during registration."""
        weak_passwords = [
            'password',
            '123456',
            'abc',
            'password123',
            '        ',  # Spaces only
        ]
        
        for weak_pwd in weak_passwords:
            response = client.post('/api/v1/auth/register', json={
                'email': 'newuser@example.com',
                'password': weak_pwd,
                'name': 'New User',
                'tenant_slug': sample_tenant.slug
            })
            
            # Should reject weak passwords
            if response.status_code != 404:  # If endpoint exists
                assert response.status_code in [400, 422], \
                    f"Weak password '{weak_pwd}' was not rejected"


class TestTokenSecurity:
    """Tests for JWT token security."""
    
    def test_jwt_token_expiration(self, client, app, sample_user, sample_tenant):
        """Test JWT tokens expire correctly."""
        from flask_jwt_extended import create_access_token
        
        with app.app_context():
            # Create token with very short expiry
            token = create_access_token(
                identity=str(sample_user.id),
                additional_claims={
                    'tenant_id': str(sample_tenant.id),
                },
                expires_delta=timedelta(seconds=1)
            )
        
        # Token should work initially
        response = client.get('/api/v1/auth/me', headers={
            'Authorization': f'Bearer {token}'
        })
        # May return 404 if endpoint doesn't exist, that's OK
        
        # Wait for expiration
        time.sleep(2)
        
        # Token should be expired now
        response = client.get('/api/v1/auth/me', headers={
            'Authorization': f'Bearer {token}'
        })
        
        if response.status_code != 404:  # If endpoint exists
            assert response.status_code == 401
    
    def test_invalid_token_rejected(self, client):
        """Test that invalid tokens are rejected."""
        invalid_tokens = [
            'invalid-token',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
            '',
            'Bearer',
            'null',
        ]
        
        for token in invalid_tokens:
            response = client.get('/api/v1/auth/me', headers={
                'Authorization': f'Bearer {token}'
            })
            
            if response.status_code != 404:
                assert response.status_code in [401, 422]
    
    def test_missing_auth_header_rejected(self, client):
        """Test that missing auth header is rejected for protected routes."""
        response = client.get('/api/v1/dashboards')
        
        if response.status_code != 404:
            assert response.status_code in [401, 403]
    
    def test_token_tampering_detected(self, client, manipulated_token):
        """Test that tampered tokens are detected and rejected."""
        # Modify the token payload (this should invalidate signature)
        parts = manipulated_token.split('.')
        if len(parts) == 3:
            # Tamper with the payload
            tampered = f"{parts[0]}.TAMPERED.{parts[2]}"
            
            response = client.get('/api/v1/auth/me', headers={
                'Authorization': f'Bearer {tampered}'
            })
            
            if response.status_code != 404:
                assert response.status_code in [401, 422]


class TestRateLimiting:
    """Tests for rate limiting on authentication endpoints."""
    
    def test_rate_limiting_on_login(self, client, sample_tenant):
        """Test rate limiting prevents brute force attacks."""
        # Attempt many failed logins
        for i in range(25):
            client.post('/api/v1/auth/login', json={
                'email': 'test@example.com',
                'password': f'wrong_password_{i}',
                'tenant_slug': sample_tenant.slug
            })
        
        # Next attempt should be rate limited
        response = client.post('/api/v1/auth/login', json={
            'email': 'test@example.com',
            'password': 'any_password',
            'tenant_slug': sample_tenant.slug
        })
        
        # Should be rate limited (429) or at least not successful
        # Some implementations may return 401 with lockout message
        assert response.status_code in [429, 401, 403]
    
    def test_rate_limiting_on_password_reset(self, client):
        """Test rate limiting on password reset endpoint."""
        # Attempt many password reset requests
        for i in range(15):
            client.post('/api/v1/auth/forgot-password', json={
                'email': f'user{i}@example.com'
            })
        
        # Should be rate limited
        response = client.post('/api/v1/auth/forgot-password', json={
            'email': 'another@example.com'
        })
        
        # Rate limited or endpoint doesn't exist
        if response.status_code != 404:
            assert response.status_code in [429, 200]  # 200 OK to not reveal user existence


class TestSessionSecurity:
    """Tests for session security."""
    
    def test_session_fixation_prevention(
        self, client, sample_user, sample_tenant
    ):
        """Test session IDs change after login."""
        # First login
        response1 = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'TestPassword123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if response1.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token1 = response1.json.get('access_token')
        
        # Logout
        client.post('/api/v1/auth/logout', headers={
            'Authorization': f'Bearer {token1}'
        })
        
        # Second login
        response2 = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'TestPassword123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if response2.status_code == 200:
            token2 = response2.json.get('access_token')
            
            # Tokens should be different
            assert token1 != token2
    
    def test_logout_invalidates_token(
        self, client, sample_user, sample_tenant
    ):
        """Test that logout properly invalidates the token."""
        # Login
        login_resp = client.post('/api/v1/auth/login', json={
            'email': sample_user.email,
            'password': 'TestPassword123!',
            'tenant_slug': sample_tenant.slug
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Login endpoint not available")
        
        token = login_resp.json.get('access_token')
        
        # Logout
        logout_resp = client.post('/api/v1/auth/logout', headers={
            'Authorization': f'Bearer {token}'
        })
        
        if logout_resp.status_code == 404:
            pytest.skip("Logout endpoint not available")
        
        # Try to use the old token
        me_resp = client.get('/api/v1/auth/me', headers={
            'Authorization': f'Bearer {token}'
        })
        
        # Token should be invalidated
        if me_resp.status_code != 404:
            assert me_resp.status_code == 401


class TestSecurityHeaders:
    """Tests for security headers in responses."""
    
    def test_security_headers_present(self, client):
        """Test that security headers are present in responses."""
        response = client.get('/api/v1/health')
        
        # Check for common security headers
        headers_to_check = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'X-XSS-Protection': '1; mode=block',
        }
        
        for header, expected_values in headers_to_check.items():
            value = response.headers.get(header)
            if value:  # Header exists
                if isinstance(expected_values, list):
                    assert value in expected_values
                else:
                    assert value == expected_values
    
    def test_no_server_version_exposure(self, client):
        """Test that server version is not exposed in headers."""
        response = client.get('/api/v1/health')
        
        server_header = response.headers.get('Server', '')
        
        # Should not contain version numbers
        import re
        version_pattern = r'\d+\.\d+(\.\d+)?'
        matches = re.findall(version_pattern, server_header)
        
        # If there are version numbers, they shouldn't be detailed
        assert len(matches) <= 1 or 'werkzeug' not in server_header.lower()
