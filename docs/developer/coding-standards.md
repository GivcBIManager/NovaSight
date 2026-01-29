# Coding Standards

This document defines the coding standards and conventions for the NovaSight codebase.

## General Principles

1. **Readability First**: Code is read more often than it's written
2. **Consistency**: Follow established patterns in the codebase
3. **Simplicity**: Prefer simple solutions over clever ones
4. **Documentation**: Document the "why", not the "what"
5. **Testability**: Write code that is easy to test

## Python Standards

### Style Guide

We follow [PEP 8](https://pep8.org/) with the following specifics:

| Rule | Value |
|------|-------|
| Line length | 100 characters (relaxed from 79) |
| Indentation | 4 spaces |
| Quotes | Double quotes for strings |
| Formatter | Black |
| Linter | Ruff |
| Type checker | mypy |

### Imports

Order imports as follows:
1. Standard library
2. Third-party packages
3. Local application imports

```python
# Standard library
import os
import sys
from datetime import datetime
from typing import Optional, List

# Third-party packages
from flask import Flask, request
from sqlalchemy import Column, String
import click

# Local imports
from app.models import User
from app.services import AuthService
from app.utils import validate_email
```

### Type Hints

Always use type hints for function signatures:

```python
from typing import Optional, List, Dict, Any

def get_user_by_email(email: str) -> Optional[User]:
    """Retrieve a user by email address."""
    return User.query.filter_by(email=email).first()


def process_items(
    items: List[Dict[str, Any]],
    filter_key: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Process a list of items with optional filtering.
    
    Args:
        items: List of item dictionaries to process.
        filter_key: Optional key to filter items by.
        limit: Maximum number of items to return.
        
    Returns:
        Filtered and limited list of items.
    """
    if filter_key:
        items = [item for item in items if filter_key in item]
    return items[:limit]
```

### Docstrings

Use Google-style docstrings:

```python
def create_dashboard(
    tenant_id: str,
    title: str,
    layout: Dict[str, Any],
    description: Optional[str] = None,
) -> Dashboard:
    """
    Create a new dashboard for a tenant.
    
    Args:
        tenant_id: The UUID of the tenant.
        title: Dashboard title (1-200 characters).
        layout: Dashboard layout configuration.
        description: Optional description.
        
    Returns:
        The newly created Dashboard instance.
        
    Raises:
        ValidationError: If title is empty or too long.
        NotFoundError: If tenant does not exist.
        
    Example:
        >>> dashboard = create_dashboard(
        ...     tenant_id="abc-123",
        ...     title="Sales Dashboard",
        ...     layout={"widgets": []},
        ... )
    """
    pass
```

### Class Structure

Order class members consistently:

```python
class DashboardService:
    """Service for managing dashboards."""
    
    # Class constants
    MAX_DASHBOARDS_PER_TENANT = 100
    DEFAULT_LAYOUT = {"widgets": [], "gridSize": 12}
    
    def __init__(self, db_session: Session, cache: Redis) -> None:
        """Initialize the service with dependencies."""
        self._db = db_session
        self._cache = cache
    
    # Properties
    @property
    def tenant_id(self) -> str:
        """Get the current tenant ID."""
        return self._tenant_id
    
    # Public methods
    def create(self, title: str, layout: Dict) -> Dashboard:
        """Create a new dashboard."""
        pass
    
    def get_by_id(self, dashboard_id: str) -> Optional[Dashboard]:
        """Retrieve a dashboard by ID."""
        pass
    
    # Private methods
    def _validate_layout(self, layout: Dict) -> bool:
        """Validate dashboard layout configuration."""
        pass
```

### Error Handling

Use custom exceptions with clear messages:

```python
# app/errors.py
class NovaSightError(Exception):
    """Base exception for all NovaSight errors."""
    
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class ValidationError(NovaSightError):
    """Raised when input validation fails."""
    
    def __init__(self, message: str, field: Optional[str] = None) -> None:
        self.field = field
        super().__init__(message, code="VALIDATION_ERROR")


class NotFoundError(NovaSightError):
    """Raised when a resource is not found."""
    
    def __init__(self, resource: str, identifier: str) -> None:
        message = f"{resource} with id '{identifier}' not found"
        super().__init__(message, code="NOT_FOUND")
```

Usage:

```python
def get_dashboard(dashboard_id: str) -> Dashboard:
    """Get a dashboard by ID."""
    dashboard = Dashboard.query.get(dashboard_id)
    if not dashboard:
        raise NotFoundError("Dashboard", dashboard_id)
    return dashboard
```

### SQLAlchemy Models

```python
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.extensions import db


class Dashboard(db.Model):
    """Dashboard model for storing user dashboards."""
    
    __tablename__ = "dashboards"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Fields
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    layout = Column(db.JSON, nullable=False, default=dict)
    is_public = Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="dashboards")
    created_by = relationship("User", back_populates="dashboards")
    widgets = relationship(
        "Widget",
        back_populates="dashboard",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Dashboard {self.title}>"
    
    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "layout": self.layout,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
```

### API Endpoints

```python
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from pydantic import BaseModel, Field

from app.services import DashboardService
from app.errors import ValidationError

api = Blueprint("dashboards", __name__)


class CreateDashboardRequest(BaseModel):
    """Request model for creating a dashboard."""
    
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(max_length=1000, default=None)
    layout: dict = Field(default_factory=dict)


class DashboardResponse(BaseModel):
    """Response model for dashboard data."""
    
    id: str
    title: str
    description: str | None
    layout: dict
    created_at: str
    updated_at: str


@api.route("/dashboards", methods=["POST"])
@jwt_required()
def create_dashboard():
    """
    Create a new dashboard.
    
    ---
    tags:
      - Dashboards
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateDashboardRequest'
    responses:
      201:
        description: Dashboard created successfully
      400:
        description: Validation error
      401:
        description: Unauthorized
    """
    data = CreateDashboardRequest(**request.json)
    user_id = get_jwt_identity()
    
    service = DashboardService()
    dashboard = service.create(
        user_id=user_id,
        title=data.title,
        description=data.description,
        layout=data.layout,
    )
    
    return DashboardResponse(**dashboard.to_dict()).dict(), 201
```

## TypeScript Standards

### Style Guide

| Rule | Value |
|------|-------|
| Line length | 100 characters |
| Indentation | 2 spaces |
| Quotes | Single quotes |
| Semicolons | Required |
| Formatter | Prettier |
| Linter | ESLint |

### File Organization

```typescript
// 1. Imports (grouped and ordered)
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { Dashboard, Widget } from '@/types';
import { dashboardApi } from '@/api';
import { useDashboardStore } from '@/stores';

// 2. Types/Interfaces
interface DashboardPageProps {
  dashboardId: string;
  isEditable?: boolean;
}

interface WidgetState {
  isLoading: boolean;
  error: string | null;
}

// 3. Component
export function DashboardPage({ dashboardId, isEditable = false }: DashboardPageProps) {
  // Hooks first
  const [widgetState, setWidgetState] = useState<WidgetState>({
    isLoading: false,
    error: null,
  });
  
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => dashboardApi.getById(dashboardId),
  });
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dashboardId]);
  
  // Callbacks
  const handleWidgetAdd = useCallback((widget: Widget) => {
    // Handler logic
  }, []);
  
  // Render helpers
  const renderWidgets = () => {
    if (!dashboard?.widgets) return null;
    return dashboard.widgets.map((widget) => (
      <WidgetCard key={widget.id} widget={widget} />
    ));
  };
  
  // Early returns
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Main render
  return (
    <div className="dashboard-page">
      <DashboardHeader title={dashboard?.title} isEditable={isEditable} />
      <div className="dashboard-grid">{renderWidgets()}</div>
    </div>
  );
}
```

### Types and Interfaces

Prefer `interface` for object shapes, `type` for unions/aliases:

```typescript
// Object shapes: use interface
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

// Unions and aliases: use type
type UserRole = 'admin' | 'editor' | 'viewer';

type ApiResponse<T> = {
  data: T;
  status: 'success' | 'error';
  message?: string;
};

type Nullable<T> = T | null;
```

### React Components

Use functional components with proper typing:

```typescript
import { ReactNode, forwardRef } from 'react';

// Simple component
interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`, `btn-${size}`)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Component with ref forwarding
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="input-wrapper">
        {label && <label className="input-label">{label}</label>}
        <input
          ref={ref}
          className={cn('input', error && 'input-error', className)}
          {...props}
        />
        {error && <span className="input-error-message">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### Custom Hooks

```typescript
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Dashboard, CreateDashboardRequest } from '@/types';
import { dashboardApi } from '@/api';

interface UseDashboardResult {
  dashboard: Dashboard | undefined;
  isLoading: boolean;
  error: Error | null;
  updateTitle: (title: string) => Promise<void>;
  addWidget: (widget: WidgetConfig) => Promise<void>;
}

export function useDashboard(dashboardId: string): UseDashboardResult {
  const queryClient = useQueryClient();
  
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => dashboardApi.getById(dashboardId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Dashboard>) =>
      dashboardApi.update(dashboardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
    },
  });
  
  const updateTitle = useCallback(
    async (title: string) => {
      await updateMutation.mutateAsync({ title });
    },
    [updateMutation]
  );
  
  const addWidget = useCallback(
    async (widget: WidgetConfig) => {
      await updateMutation.mutateAsync({
        widgets: [...(dashboard?.widgets || []), widget],
      });
    },
    [dashboard?.widgets, updateMutation]
  );
  
  return {
    dashboard,
    isLoading,
    error,
    updateTitle,
    addWidget,
  };
}
```

### API Client

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

class ApiClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
        }
        return Promise.reject(error);
      }
    );
  }
  
  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<T>(url);
    return response.data;
  }
  
  async post<T, D>(url: string, data: D): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }
  
  // ... other methods
}

export const apiClient = new ApiClient();
```

## SQL Standards

### General Rules

- Use uppercase for SQL keywords
- Use lowercase for identifiers
- Use snake_case for table and column names
- Always specify column names in INSERT statements
- Use explicit JOINs (never comma-separated FROM)

### Examples

```sql
-- Good
SELECT
    u.id,
    u.email,
    u.created_at,
    COUNT(d.id) AS dashboard_count
FROM users u
LEFT JOIN dashboards d ON d.created_by_id = u.id
WHERE u.tenant_id = :tenant_id
    AND u.is_active = TRUE
GROUP BY u.id, u.email, u.created_at
ORDER BY dashboard_count DESC
LIMIT 10;

-- Bad
select * from users, dashboards 
where users.id = dashboards.created_by_id
```

### dbt Models

```sql
-- models/marts/dim_customers.sql
{{
    config(
        materialized='incremental',
        unique_key='customer_id',
        incremental_strategy='merge'
    )
}}

WITH source_data AS (
    SELECT
        id AS customer_id,
        name AS customer_name,
        email,
        created_at,
        updated_at
    FROM {{ ref('stg_customers') }}
    
    {% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
    {% endif %}
),

enriched AS (
    SELECT
        sd.*,
        COALESCE(o.total_orders, 0) AS total_orders,
        COALESCE(o.total_revenue, 0) AS total_revenue
    FROM source_data sd
    LEFT JOIN {{ ref('fct_customer_orders') }} o
        ON o.customer_id = sd.customer_id
)

SELECT * FROM enriched
```

## Git Commit Standards

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Examples

```bash
# Feature
feat(dashboard): add drag-and-drop widget reordering

# Bug fix
fix(auth): handle expired refresh tokens correctly

Closes #123

# Breaking change
feat(api)!: change dashboard response format

BREAKING CHANGE: The widgets array is now nested under layout.widgets

# Documentation
docs(readme): add installation instructions for Windows
```

## Naming Conventions

### Python

| Element | Convention | Example |
|---------|------------|---------|
| Variables | snake_case | `user_count`, `is_active` |
| Functions | snake_case | `get_user_by_id()` |
| Classes | PascalCase | `DashboardService` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Private | Leading underscore | `_internal_method()` |
| Modules | snake_case | `dashboard_service.py` |

### TypeScript

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `userCount`, `isActive` |
| Functions | camelCase | `getUserById()` |
| Classes | PascalCase | `DashboardService` |
| Interfaces | PascalCase | `UserProfile` |
| Types | PascalCase | `ApiResponse` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Components | PascalCase | `DashboardPage.tsx` |
| Hooks | camelCase (use prefix) | `useDashboard()` |

### Files and Directories

| Element | Convention | Example |
|---------|------------|---------|
| Python modules | snake_case | `dashboard_service.py` |
| TypeScript files | kebab-case or PascalCase | `use-dashboard.ts`, `Dashboard.tsx` |
| Test files | Same as source + suffix | `dashboard_service_test.py`, `Dashboard.test.tsx` |
| Directories | kebab-case | `data-sources/`, `api-client/` |

---

*Last updated: January 2026*
