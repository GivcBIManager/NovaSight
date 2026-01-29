# NovaSight Integration Tests

This directory contains integration tests that verify end-to-end functionality across services.

## Overview

Integration tests differ from unit tests in that they:
- Test complete API request/response cycles
- Verify cross-service interactions
- Use real (or containerized) databases
- Test authentication and authorization flows
- Verify tenant isolation

## Test Structure

```
backend/tests/integration/
├── __init__.py
├── conftest.py              # Shared fixtures and configuration
├── test_auth_flow.py        # Authentication flow tests
├── test_datasource_flow.py  # Data source/connection tests
├── test_semantic_flow.py    # Semantic layer tests
├── test_dashboard_flow.py   # Dashboard and widget tests
├── test_query_flow.py       # Query execution tests
└── test_admin_flow.py       # Admin functionality tests
```

## Running Integration Tests

### Basic Usage

```bash
# Run all integration tests
pytest backend/tests/integration/ -v

# Run specific test file
pytest backend/tests/integration/test_auth_flow.py -v

# Run specific test class
pytest backend/tests/integration/test_auth_flow.py::TestAuthLoginFlow -v

# Run specific test
pytest backend/tests/integration/test_auth_flow.py::TestAuthLoginFlow::test_successful_login -v
```

### With Markers

```bash
# Run only integration tests (from any directory)
pytest -m integration

# Run integration tests with coverage
pytest backend/tests/integration/ --cov=app --cov-report=html

# Run integration tests in parallel (requires pytest-xdist)
pytest backend/tests/integration/ -n auto
```

### With Test Containers (Docker Required)

For realistic database testing with Docker containers:

```bash
# Install testcontainers
pip install testcontainers docker

# Run tests with containers
pytest backend/tests/integration/ -m container

# Note: Docker must be running
```

## Test Fixtures

### Core Fixtures

| Fixture | Scope | Description |
|---------|-------|-------------|
| `integration_app` | session | Flask application instance |
| `integration_client` | function | Test client for API calls |
| `integration_db` | function | Database session with transaction rollback |

### Seeded Data Fixtures

| Fixture | Description |
|---------|-------------|
| `seeded_tenant` | Tenant with admin and viewer users |
| `seeded_connection` | Tenant with data connection |
| `seeded_semantic_layer` | Tenant with semantic models, dimensions, measures |
| `seeded_dashboard` | Tenant with dashboard and widgets |

### Authentication Fixtures

| Fixture | Description |
|---------|-------------|
| `auth_headers` | JWT headers for admin user |
| `viewer_auth_headers` | JWT headers for viewer user |

## Writing Integration Tests

### Basic Test Structure

```python
import pytest
from flask.testing import FlaskClient
from typing import Dict, Any

class TestFeatureFlow:
    """Integration tests for feature."""
    
    def test_happy_path(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test the happy path scenario."""
        response = integration_client.post(
            "/api/v1/resource",
            json={"field": "value"},
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert "id" in data
    
    def test_validation_error(
        self,
        integration_client: FlaskClient,
        auth_headers: Dict[str, str]
    ):
        """Test validation error handling."""
        response = integration_client.post(
            "/api/v1/resource",
            json={},  # Missing required fields
            headers=auth_headers
        )
        
        assert response.status_code == 400
```

### Testing with Mocks

```python
def test_external_service(
    self,
    integration_client: FlaskClient,
    auth_headers: Dict[str, str],
    mocker
):
    """Test with mocked external service."""
    # Mock ClickHouse
    mocker.patch(
        'app.services.clickhouse_client.ClickHouseClient.query',
        return_value={"data": [{"value": 100}], "rows": 1}
    )
    
    response = integration_client.post(
        "/api/v1/query",
        json={"measure": "value"},
        headers=auth_headers
    )
    
    assert response.status_code == 200
```

### Testing Tenant Isolation

```python
def test_tenant_isolation(
    self,
    integration_client: FlaskClient,
    seeded_data: Dict[str, Any],
    integration_app
):
    """Test resource isolation between tenants."""
    from app.models.tenant import Tenant
    from flask_jwt_extended import create_access_token
    
    with integration_app.app_context():
        # Create another tenant...
        other_token = create_access_token(
            identity={"tenant_id": str(other_tenant.id), ...}
        )
        
        # Try to access first tenant's resource
        response = integration_client.get(
            f"/api/v1/resource/{resource_id}",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        
        assert response.status_code in [403, 404]
```

## Test Categories

### Authentication Tests (`test_auth_flow.py`)
- User registration
- Login/logout
- Token refresh
- Password reset
- Rate limiting
- Multi-tenant authentication

### Data Source Tests (`test_datasource_flow.py`)
- Connection CRUD operations
- Connection testing
- Schema discovery
- Credential masking
- RBAC for connections

### Semantic Layer Tests (`test_semantic_flow.py`)
- Model CRUD operations
- Dimension management
- Measure management
- Query execution
- Tenant isolation

### Dashboard Tests (`test_dashboard_flow.py`)
- Dashboard CRUD operations
- Widget management
- Layout updates
- Data queries
- Sharing and cloning
- RBAC for dashboards

### Query Tests (`test_query_flow.py`)
- Simple queries
- Aggregated queries
- Filter operations
- NL-to-SQL
- Query caching
- Result export

### Admin Tests (`test_admin_flow.py`)
- Tenant management
- User management
- Role management
- Audit logs
- System settings

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use fixtures with proper cleanup to avoid test pollution
3. **Mocking**: Mock external services (ClickHouse, Ollama) for reliability
4. **Assertions**: Include meaningful assertion messages
5. **Coverage**: Test happy paths, error cases, and edge cases
6. **Performance**: Keep integration tests under 5 minutes total

## Troubleshooting

### Database Connection Errors
```bash
# Ensure test database is configured
export DATABASE_URL="postgresql://test:test@localhost:5432/novasight_test"
```

### Docker Container Issues
```bash
# Check Docker is running
docker info

# Pull required images
docker pull postgres:15
docker pull redis:7
```

### Slow Tests
```bash
# Run with timing
pytest backend/tests/integration/ -v --durations=10

# Skip slow tests
pytest backend/tests/integration/ -m "not slow"
```

## CI/CD Integration

```yaml
# GitHub Actions example
integration-tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: test
      ports:
        - 5432:5432
    redis:
      image: redis:7
      ports:
        - 6379:6379
  steps:
    - uses: actions/checkout@v4
    - name: Run integration tests
      run: pytest backend/tests/integration/ -v --cov=app
```
