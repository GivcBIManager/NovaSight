"""
NovaSight Flask-RESTX API Configuration
=========================================

OpenAPI/Swagger documentation using Flask-RESTX.
This module provides auto-generated API documentation at /api/v1/docs.

The Flask-RESTX API wraps the existing Flask blueprints to provide:
- Interactive Swagger UI documentation
- OpenAPI 3.0 specification export
- Request/response model validation
- Authentication documentation
"""

from flask import Blueprint
from flask_restx import Api
from app.api.v1.models import register_models

# Create documented API blueprint
api_docs_bp = Blueprint('api_docs', __name__, url_prefix='/api/v1')

# Authorization configuration for Swagger UI
authorizations = {
    'Bearer': {
        'type': 'apiKey',
        'in': 'header',
        'name': 'Authorization',
        'description': '''JWT Authorization header using the Bearer scheme.
        
**Format**: `Bearer <token>`

**Example**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

To obtain a token, use the `/auth/login` endpoint with valid credentials.
'''
    }
}

api = Api(
    api_docs_bp,
    version='1.0',
    title='NovaSight API',
    description='''
# Self-Service Business Intelligence Platform API

NovaSight provides a comprehensive REST API for building self-service BI solutions.

## Overview

The NovaSight API enables you to:
- **Manage Data Sources**: Connect and configure database connections
- **Build Semantic Layer**: Define dimensions, measures, and relationships
- **Create Dashboards**: Build and share interactive dashboards
- **Execute Queries**: Run natural language and structured queries
- **Administer Platform**: Manage tenants, users, and permissions

## Authentication

All endpoints except `/auth/login` and `/auth/register` require a JWT token.

### Getting a Token

```bash
curl -X POST /api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "your-password"}'
```

### Using the Token

Include the token in the Authorization header:

```bash
curl -X GET /api/v1/connections \\
  -H "Authorization: Bearer <your-token>"
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to get a new access token:

```bash
curl -X POST /api/v1/auth/refresh \\
  -H "Authorization: Bearer <refresh-token>"
```

## Multi-Tenancy

NovaSight is a multi-tenant platform. All data operations are automatically scoped 
to the authenticated user's tenant. Cross-tenant access is not permitted.

The tenant context is embedded in the JWT token and applied automatically to all 
queries and operations.

## Rate Limiting

API requests are rate-limited per user to ensure fair usage:

| Endpoint Category | Limit |
|------------------|-------|
| Standard endpoints | 100 requests/minute |
| Query endpoints | 20 requests/minute |
| Auth endpoints | 10 requests/minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Response Format

### Success Response

All successful responses follow this structure:

```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

For list endpoints with pagination:

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Error Response

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Versioning

The API is versioned in the URL path (`/api/v1/`). Breaking changes will result 
in a new API version. Non-breaking additions may be made to existing versions.

## SDKs & Libraries

- **Python**: `pip install novasight-sdk` (coming soon)
- **JavaScript**: `npm install @novasight/sdk` (coming soon)

## Support

For API support, contact: api-support@novasight.io
''',
    authorizations=authorizations,
    security='Bearer',
    doc='/docs',
    default='health',
    default_label='Health Check',
    validate=True,
    ordered=True,
)

# Register all models
models = register_models(api)

# Import and register namespaces
from app.api.v1.docs.auth_ns import ns as auth_ns
from app.api.v1.docs.connections_ns import ns as connections_ns
from app.api.v1.docs.semantic_ns import ns as semantic_ns
from app.api.v1.docs.dashboards_ns import ns as dashboards_ns
from app.api.v1.docs.query_ns import ns as query_ns
from app.api.v1.docs.admin_ns import ns as admin_ns

api.add_namespace(auth_ns, path='/auth')
api.add_namespace(connections_ns, path='/connections')
api.add_namespace(semantic_ns, path='/semantic')
api.add_namespace(dashboards_ns, path='/dashboards')
api.add_namespace(query_ns, path='/assistant')
api.add_namespace(admin_ns, path='/admin')


def init_api_docs(app):
    """
    Initialize API documentation with the Flask app.
    
    This registers the Flask-RESTX API blueprint which provides
    Swagger UI documentation at /api/v1/docs.
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(api_docs_bp)
    
    # Add OpenAPI JSON endpoint
    @app.route('/api/v1/openapi.json')
    def openapi_spec():
        """Return OpenAPI specification as JSON."""
        from flask import jsonify
        return jsonify(api.__schema__)
