"""
Security Test Configuration
============================

Fixtures and configuration specific to security testing.
"""

import pytest
from datetime import timedelta


@pytest.fixture
def other_tenant(db_session):
    """Create a second tenant for isolation testing."""
    from app.models import Tenant
    from app.models.tenant import TenantStatus
    
    tenant = Tenant(
        name="Other Tenant",
        slug="other-tenant",
        plan="starter",
        status=TenantStatus.ACTIVE,
        settings={"timezone": "UTC"}
    )
    db_session.add(tenant)
    db_session.commit()
    return tenant


@pytest.fixture
def other_tenant_user(db_session, other_tenant):
    """Create a user in the other tenant for isolation testing."""
    from app.models import User
    from app.models.user import UserStatus
    from app.services.password_service import password_service
    
    user = User(
        tenant_id=other_tenant.id,
        email="other@example.com",
        name="Other User",
        status=UserStatus.ACTIVE,
        password_hash=password_service.hash("TestPassword123!")
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def security_test_headers(client, sample_user, sample_tenant):
    """Get authentication headers for security tests."""
    response = client.post("/api/v1/auth/login", json={
        "email": sample_user.email,
        "password": "TestPassword123!",
        "tenant_slug": sample_tenant.slug
    })
    
    if response.status_code == 200:
        data = response.json
        return {"Authorization": f"Bearer {data.get('access_token')}"}
    
    # Fallback to JWT fixture if login endpoint not implemented
    return None


@pytest.fixture
def expired_token(app, sample_user, sample_tenant):
    """Generate an expired JWT token for testing."""
    from flask_jwt_extended import create_access_token
    
    with app.app_context():
        token = create_access_token(
            identity=str(sample_user.id),
            additional_claims={
                'tenant_id': str(sample_tenant.id),
                'roles': ['user'],
            },
            expires_delta=timedelta(seconds=-1)  # Already expired
        )
        return token


@pytest.fixture
def manipulated_token(app, sample_user, sample_tenant):
    """Generate a valid-looking but manipulated JWT token."""
    from flask_jwt_extended import create_access_token
    
    with app.app_context():
        # Create token with tampered claims
        token = create_access_token(
            identity=str(sample_user.id),
            additional_claims={
                'tenant_id': 'manipulated-tenant-id',  # Tampered
                'roles': ['super_admin'],  # Privilege escalation attempt
            }
        )
        return token


# SQL Injection payloads for parameterized tests
SQL_INJECTION_PAYLOADS = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1; DELETE FROM tenants WHERE 1=1; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "1' AND SLEEP(5) --",
    "1; EXEC xp_cmdshell('dir'); --",
    "'; WAITFOR DELAY '0:0:5'; --",
    "' OR 1=1 --",
    "\" OR \"\"=\"",
    "1'; DROP TABLE users--",
    "1' AND '1'='1",
    "-1 UNION SELECT 1,2,3--",
    "1' ORDER BY 1--",
    "1' HAVING 1=1--",
]

# XSS payloads for parameterized tests
XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg onload=alert('XSS')>",
    "'-alert('XSS')-'",
    "<body onload=alert('XSS')>",
    "<iframe src='javascript:alert(1)'>",
    "<input onfocus=alert('XSS') autofocus>",
    "'\"><script>alert('XSS')</script>",
    "<a href=\"javascript:alert('XSS')\">click</a>",
    "<div style=\"background:url(javascript:alert('XSS'))\">",
    "{{constructor.constructor('alert(1)')()}}",  # Angular template injection
    "${alert('XSS')}",  # Template literal injection
]

# Path traversal payloads
PATH_TRAVERSAL_PAYLOADS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd",
    "..%c0%af..%c0%af..%c0%afetc/passwd",
]

# Command injection payloads
COMMAND_INJECTION_PAYLOADS = [
    "; ls -la",
    "| cat /etc/passwd",
    "& dir",
    "$(whoami)",
    "`id`",
    "|| ping -c 10 127.0.0.1",
]
