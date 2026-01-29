# Testing Guide for Developers

This guide covers testing practices, patterns, and strategies for NovaSight development.

## Testing Philosophy

1. **Test Behavior, Not Implementation**: Focus on what code does, not how it does it
2. **Fast Feedback**: Unit tests should run in milliseconds
3. **Reliable Tests**: No flaky tests - tests should pass/fail consistently
4. **Readable Tests**: Tests serve as documentation
5. **Test Pyramid**: More unit tests, fewer integration tests, even fewer E2E tests

## Test Pyramid

```
           /\
          /  \      E2E Tests (Playwright)
         /----\     - Critical user journeys
        /      \    - ~10% of test suite
       /--------\   
      /          \  Integration Tests
     /            \ - API endpoints
    /--------------\- Database operations
   /                \- ~30% of test suite
  /------------------\
 /                    \ Unit Tests
/                      \ - Services, utils, components
/------------------------\ - ~60% of test suite
```

## Backend Testing

### Test Structure

```
backend/tests/
├── conftest.py              # Shared fixtures
├── factories.py             # Test data factories
├── unit/
│   ├── services/
│   │   ├── test_auth_service.py
│   │   ├── test_dashboard_service.py
│   │   └── test_template_engine.py
│   ├── models/
│   │   └── test_user_model.py
│   └── utils/
│       └── test_validators.py
├── integration/
│   ├── api/
│   │   ├── test_auth_endpoints.py
│   │   └── test_dashboard_endpoints.py
│   └── connectors/
│       └── test_postgresql_connector.py
└── security/
    ├── test_sql_injection.py
    └── test_authentication.py
```

### Running Tests

```bash
cd backend

# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/unit/services/test_dashboard_service.py

# Specific test
pytest tests/unit/services/test_dashboard_service.py::TestDashboardService::test_create_dashboard

# By marker
pytest -m unit
pytest -m integration
pytest -m "not slow"

# Verbose output
pytest -v --tb=short

# Stop on first failure
pytest -x

# Run last failed
pytest --lf
```

### Fixtures (conftest.py)

```python
import pytest
from flask import Flask
from sqlalchemy.orm import Session

from app import create_app
from app.extensions import db as _db
from tests.factories import UserFactory, TenantFactory


@pytest.fixture(scope="session")
def app() -> Flask:
    """Create application for testing."""
    app = create_app("testing")
    return app


@pytest.fixture(scope="function")
def db(app: Flask):
    """Create database tables for each test."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.rollback()
        _db.drop_all()


@pytest.fixture
def db_session(db) -> Session:
    """Get a database session."""
    return db.session


@pytest.fixture
def client(app: Flask):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def auth_client(client, user):
    """Create an authenticated test client."""
    # Login and get token
    response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": "testpassword123",
    })
    token = response.json["access_token"]
    
    # Set authorization header
    client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return client


@pytest.fixture
def tenant(db_session):
    """Create a test tenant."""
    return TenantFactory.create()


@pytest.fixture
def user(db_session, tenant):
    """Create a test user."""
    return UserFactory.create(tenant=tenant)
```

### Factories (factories.py)

```python
import factory
from factory.alchemy import SQLAlchemyModelFactory

from app.extensions import db
from app.models import User, Tenant, Dashboard


class BaseFactory(SQLAlchemyModelFactory):
    """Base factory for all models."""
    
    class Meta:
        abstract = True
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = "commit"


class TenantFactory(BaseFactory):
    """Factory for creating test tenants."""
    
    class Meta:
        model = Tenant
    
    id = factory.Faker("uuid4")
    name = factory.Faker("company")
    slug = factory.LazyAttribute(lambda o: o.name.lower().replace(" ", "-"))
    is_active = True


class UserFactory(BaseFactory):
    """Factory for creating test users."""
    
    class Meta:
        model = User
    
    id = factory.Faker("uuid4")
    email = factory.Faker("email")
    name = factory.Faker("name")
    password_hash = factory.LazyFunction(lambda: hash_password("testpassword123"))
    tenant = factory.SubFactory(TenantFactory)
    is_active = True


class DashboardFactory(BaseFactory):
    """Factory for creating test dashboards."""
    
    class Meta:
        model = Dashboard
    
    id = factory.Faker("uuid4")
    title = factory.Faker("sentence", nb_words=3)
    description = factory.Faker("paragraph")
    layout = {"widgets": [], "gridSize": 12}
    tenant = factory.SubFactory(TenantFactory)
    created_by = factory.SubFactory(UserFactory)
```

### Unit Test Examples

```python
# tests/unit/services/test_dashboard_service.py
import pytest
from unittest.mock import Mock, patch

from app.services.dashboard_service import DashboardService
from app.errors import ValidationError, NotFoundError
from tests.factories import DashboardFactory, TenantFactory, UserFactory


class TestDashboardService:
    """Unit tests for DashboardService."""
    
    @pytest.fixture
    def service(self, db_session):
        """Create service instance."""
        return DashboardService(db_session)
    
    @pytest.fixture
    def tenant(self, db_session):
        """Create test tenant."""
        return TenantFactory.create()
    
    @pytest.fixture
    def user(self, db_session, tenant):
        """Create test user."""
        return UserFactory.create(tenant=tenant)
    
    # --- CREATE TESTS ---
    
    def test_create_dashboard_success(self, service, tenant, user):
        """Should create a dashboard with valid input."""
        result = service.create(
            tenant_id=str(tenant.id),
            user_id=str(user.id),
            title="Sales Dashboard",
            layout={"widgets": []},
        )
        
        assert result.id is not None
        assert result.title == "Sales Dashboard"
        assert result.tenant_id == tenant.id
        assert result.created_by_id == user.id
    
    def test_create_dashboard_empty_title_raises_error(self, service, tenant, user):
        """Should raise ValidationError for empty title."""
        with pytest.raises(ValidationError) as exc_info:
            service.create(
                tenant_id=str(tenant.id),
                user_id=str(user.id),
                title="",
                layout={},
            )
        
        assert exc_info.value.field == "title"
    
    def test_create_dashboard_title_too_long_raises_error(self, service, tenant, user):
        """Should raise ValidationError for title over 200 characters."""
        with pytest.raises(ValidationError):
            service.create(
                tenant_id=str(tenant.id),
                user_id=str(user.id),
                title="x" * 201,
                layout={},
            )
    
    # --- GET TESTS ---
    
    def test_get_by_id_existing_dashboard(self, service, tenant):
        """Should return dashboard when it exists."""
        dashboard = DashboardFactory.create(tenant=tenant)
        
        result = service.get_by_id(
            tenant_id=str(tenant.id),
            dashboard_id=str(dashboard.id),
        )
        
        assert result is not None
        assert result.id == dashboard.id
    
    def test_get_by_id_not_found_raises_error(self, service, tenant):
        """Should raise NotFoundError when dashboard doesn't exist."""
        with pytest.raises(NotFoundError):
            service.get_by_id(
                tenant_id=str(tenant.id),
                dashboard_id="non-existent-id",
            )
    
    def test_get_by_id_different_tenant_raises_error(self, service, tenant):
        """Should raise NotFoundError when accessing another tenant's dashboard."""
        other_tenant = TenantFactory.create()
        dashboard = DashboardFactory.create(tenant=other_tenant)
        
        with pytest.raises(NotFoundError):
            service.get_by_id(
                tenant_id=str(tenant.id),
                dashboard_id=str(dashboard.id),
            )
    
    # --- LIST TESTS ---
    
    def test_list_dashboards_returns_tenant_dashboards(self, service, tenant):
        """Should return only dashboards for the specified tenant."""
        DashboardFactory.create_batch(3, tenant=tenant)
        other_tenant = TenantFactory.create()
        DashboardFactory.create_batch(2, tenant=other_tenant)
        
        result = service.list(tenant_id=str(tenant.id))
        
        assert len(result) == 3
        assert all(d.tenant_id == tenant.id for d in result)
    
    def test_list_dashboards_with_pagination(self, service, tenant):
        """Should support pagination."""
        DashboardFactory.create_batch(10, tenant=tenant)
        
        result = service.list(
            tenant_id=str(tenant.id),
            page=1,
            per_page=5,
        )
        
        assert len(result.items) == 5
        assert result.total == 10
        assert result.pages == 2
```

### Integration Test Examples

```python
# tests/integration/api/test_dashboard_endpoints.py
import pytest
from flask.testing import FlaskClient

from tests.factories import DashboardFactory, TenantFactory, UserFactory


class TestDashboardEndpoints:
    """Integration tests for dashboard API endpoints."""
    
    # --- POST /dashboards ---
    
    def test_create_dashboard_returns_201(self, auth_client: FlaskClient, tenant):
        """POST /dashboards should return 201 with created dashboard."""
        response = auth_client.post("/api/v1/dashboards", json={
            "title": "New Dashboard",
            "description": "Test description",
            "layout": {"widgets": []},
        })
        
        assert response.status_code == 201
        data = response.json
        assert data["title"] == "New Dashboard"
        assert "id" in data
    
    def test_create_dashboard_without_auth_returns_401(self, client: FlaskClient):
        """POST /dashboards without auth should return 401."""
        response = client.post("/api/v1/dashboards", json={
            "title": "New Dashboard",
        })
        
        assert response.status_code == 401
    
    def test_create_dashboard_invalid_data_returns_400(self, auth_client: FlaskClient):
        """POST /dashboards with invalid data should return 400."""
        response = auth_client.post("/api/v1/dashboards", json={
            "title": "",  # Empty title is invalid
        })
        
        assert response.status_code == 400
        assert "title" in response.json["errors"]
    
    # --- GET /dashboards ---
    
    def test_list_dashboards_returns_200(self, auth_client: FlaskClient, tenant):
        """GET /dashboards should return 200 with list."""
        DashboardFactory.create_batch(3, tenant=tenant)
        
        response = auth_client.get("/api/v1/dashboards")
        
        assert response.status_code == 200
        data = response.json
        assert len(data["items"]) == 3
    
    def test_list_dashboards_with_pagination(self, auth_client: FlaskClient, tenant):
        """GET /dashboards should support pagination."""
        DashboardFactory.create_batch(15, tenant=tenant)
        
        response = auth_client.get("/api/v1/dashboards?page=2&per_page=10")
        
        assert response.status_code == 200
        data = response.json
        assert len(data["items"]) == 5
        assert data["page"] == 2
        assert data["total"] == 15
    
    # --- GET /dashboards/:id ---
    
    def test_get_dashboard_returns_200(self, auth_client: FlaskClient, tenant):
        """GET /dashboards/:id should return 200 with dashboard."""
        dashboard = DashboardFactory.create(tenant=tenant)
        
        response = auth_client.get(f"/api/v1/dashboards/{dashboard.id}")
        
        assert response.status_code == 200
        assert response.json["id"] == str(dashboard.id)
    
    def test_get_dashboard_not_found_returns_404(self, auth_client: FlaskClient):
        """GET /dashboards/:id with invalid id should return 404."""
        response = auth_client.get("/api/v1/dashboards/invalid-uuid")
        
        assert response.status_code == 404
```

## Frontend Testing

### Test Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   └── Dashboard.test.tsx
│   │   └── Button/
│   │       ├── Button.tsx
│   │       └── Button.test.tsx
│   ├── hooks/
│   │   ├── useDashboard.ts
│   │   └── useDashboard.test.ts
│   └── utils/
│       ├── format.ts
│       └── format.test.ts
└── e2e/
    ├── auth.spec.ts
    └── dashboard.spec.ts
```

### Running Frontend Tests

```bash
cd frontend

# Unit tests with Vitest
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
npm run test:ui        # Vitest UI

# E2E tests with Playwright
npm run e2e            # Run all E2E tests
npm run e2e:ui         # With Playwright UI
npm run e2e:headed     # Run in headed browser
npm run e2e:debug      # Debug mode
```

### Component Testing

```typescript
// src/components/Dashboard/Dashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { Dashboard } from './Dashboard';
import * as dashboardApi from '@/api/dashboards';

// Mock the API module
vi.mock('@/api/dashboards');

const mockDashboard = {
  id: '1',
  title: 'Sales Dashboard',
  description: 'Monthly sales overview',
  widgets: [
    { id: 'w1', type: 'chart', title: 'Revenue' },
    { id: 'w2', type: 'metric', title: 'Total Sales' },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders dashboard title', async () => {
    vi.mocked(dashboardApi.getById).mockResolvedValue(mockDashboard);
    
    render(<Dashboard dashboardId="1" />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
    });
  });

  it('renders all widgets', async () => {
    vi.mocked(dashboardApi.getById).mockResolvedValue(mockDashboard);
    
    render(<Dashboard dashboardId="1" />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    vi.mocked(dashboardApi.getById).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );
    
    render(<Dashboard dashboardId="1" />, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    vi.mocked(dashboardApi.getById).mockRejectedValue(new Error('Failed to load'));
    
    render(<Dashboard dashboardId="1" />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('calls onWidgetClick when widget is clicked', async () => {
    const onWidgetClick = vi.fn();
    vi.mocked(dashboardApi.getById).mockResolvedValue(mockDashboard);
    
    render(
      <Dashboard dashboardId="1" onWidgetClick={onWidgetClick} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });
    
    await userEvent.click(screen.getByText('Revenue'));
    
    expect(onWidgetClick).toHaveBeenCalledWith('w1');
  });
});
```

### Hook Testing

```typescript
// src/hooks/useDashboard.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useDashboard } from './useDashboard';
import * as dashboardApi from '@/api/dashboards';

vi.mock('@/api/dashboards');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDashboard', () => {
  const mockDashboard = {
    id: '1',
    title: 'Test Dashboard',
    widgets: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches dashboard data', async () => {
    vi.mocked(dashboardApi.getById).mockResolvedValue(mockDashboard);
    
    const { result } = renderHook(() => useDashboard('1'), {
      wrapper: createWrapper(),
    });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.dashboard).toEqual(mockDashboard);
    expect(dashboardApi.getById).toHaveBeenCalledWith('1');
  });

  it('updates title successfully', async () => {
    vi.mocked(dashboardApi.getById).mockResolvedValue(mockDashboard);
    vi.mocked(dashboardApi.update).mockResolvedValue({
      ...mockDashboard,
      title: 'Updated Title',
    });
    
    const { result } = renderHook(() => useDashboard('1'), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    await result.current.updateTitle('Updated Title');
    
    expect(dashboardApi.update).toHaveBeenCalledWith('1', {
      title: 'Updated Title',
    });
  });
});
```

### E2E Testing with Playwright

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboards');
  });

  test('can create a new dashboard', async ({ page }) => {
    await page.click('button:has-text("New Dashboard")');
    
    await page.fill('[name="title"]', 'E2E Test Dashboard');
    await page.fill('[name="description"]', 'Created by E2E test');
    await page.click('button:has-text("Create")');
    
    await expect(page).toHaveURL(/\/dashboards\/[\w-]+/);
    await expect(page.locator('h1')).toHaveText('E2E Test Dashboard');
  });

  test('can add a widget to dashboard', async ({ page }) => {
    // Navigate to existing dashboard
    await page.click('[data-testid="dashboard-card"]');
    
    // Add widget
    await page.click('button:has-text("Add Widget")');
    await page.click('[data-testid="widget-type-chart"]');
    
    await page.fill('[name="widgetTitle"]', 'Revenue Chart');
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('[data-testid="widget-card"]')).toContainText(
      'Revenue Chart'
    );
  });

  test('can delete a dashboard', async ({ page }) => {
    await page.click('[data-testid="dashboard-card"]');
    
    await page.click('[data-testid="dashboard-menu"]');
    await page.click('text=Delete');
    
    // Confirm deletion
    await page.click('button:has-text("Delete")');
    
    await expect(page).toHaveURL('/dashboards');
    await expect(
      page.locator('[data-testid="dashboard-card"]')
    ).toHaveCount(0);
  });
});
```

## Test Data Management

### Using Fixtures

```python
# tests/fixtures/dashboards.json
{
  "sales_dashboard": {
    "title": "Sales Dashboard",
    "description": "Monthly sales overview",
    "layout": {
      "gridSize": 12,
      "widgets": [
        {"id": "w1", "type": "chart", "x": 0, "y": 0, "w": 6, "h": 4},
        {"id": "w2", "type": "metric", "x": 6, "y": 0, "w": 3, "h": 2}
      ]
    }
  }
}
```

```python
# tests/conftest.py
import json
from pathlib import Path

@pytest.fixture
def dashboard_fixtures():
    """Load dashboard fixtures."""
    fixtures_path = Path(__file__).parent / "fixtures" / "dashboards.json"
    with open(fixtures_path) as f:
        return json.load(f)
```

### Database Seeding for Tests

```python
# tests/seed.py
from tests.factories import TenantFactory, UserFactory, DashboardFactory

def seed_test_data():
    """Seed test data for integration tests."""
    tenant = TenantFactory.create(name="Test Company", slug="test-company")
    
    admin = UserFactory.create(
        tenant=tenant,
        email="admin@test.com",
        role="admin",
    )
    
    editor = UserFactory.create(
        tenant=tenant,
        email="editor@test.com",
        role="editor",
    )
    
    DashboardFactory.create_batch(5, tenant=tenant, created_by=admin)
    
    return {
        "tenant": tenant,
        "admin": admin,
        "editor": editor,
    }
```

## Mocking Strategies

### Mocking External Services

```python
# tests/unit/services/test_ai_service.py
from unittest.mock import Mock, patch

class TestAIService:
    @patch("app.services.ai_service.OllamaClient")
    def test_generate_sql_from_natural_language(self, mock_ollama):
        """Should generate SQL from natural language question."""
        mock_ollama.return_value.generate.return_value = {
            "response": "SELECT product_name, SUM(revenue) FROM sales GROUP BY product_name"
        }
        
        service = AIService()
        result = service.generate_sql("What are the top products by revenue?")
        
        assert "SELECT" in result
        assert "product_name" in result
```

### Mocking Database

```python
@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = Mock()
    session.query.return_value.filter_by.return_value.first.return_value = None
    return session
```

## Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| Services | 90% |
| API endpoints | 85% |
| Models | 80% |
| Utilities | 95% |
| UI Components | 80% |
| Critical paths | 100% |

### Generating Coverage Reports

```bash
# Backend
cd backend
pytest --cov=app --cov-report=html --cov-report=term-missing
open htmlcov/index.html

# Frontend
cd frontend
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests run automatically on every PR. See `.github/workflows/test.yml` for the full configuration.

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pytest --cov=app --cov-fail-under=80

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run e2e
```

---

*Last updated: January 2026*
