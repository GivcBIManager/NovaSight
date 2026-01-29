# NovaSight API Documentation

This directory contains the NovaSight API documentation.

## Contents

- [index.html](index.html) - Interactive Redoc documentation
- [openapi.yaml](openapi.yaml) - OpenAPI 3.0 specification (generated)
- [examples/](examples/) - API usage examples

## Generating Documentation

### Export OpenAPI Specification

```bash
cd backend
flask docs export-openapi
```

Options:
- `--format json|yaml` - Output format (default: yaml)
- `--output FILE` - Output path (default: docs/api/openapi.yaml)

### Generate Static HTML

```bash
flask docs generate-redoc
```

### Serve Documentation Locally

```bash
flask docs serve --port 8080
```

Then open http://localhost:8080 in your browser.

## Swagger UI

When the application is running, Swagger UI is available at:

```
http://localhost:5000/api/v1/docs
```

## API Overview

### Authentication

All endpoints except `/auth/login` and `/auth/register` require a JWT token.

```bash
# Login to get token
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your-password"}'

# Use token in subsequent requests
curl http://localhost:5000/api/v1/connections \
  -H "Authorization: Bearer <your-token>"
```

### Endpoints

| Category | Path | Description |
|----------|------|-------------|
| Auth | `/api/v1/auth/*` | Authentication & authorization |
| Connections | `/api/v1/connections/*` | Data source management |
| Semantic | `/api/v1/semantic/*` | Semantic layer models |
| Dashboards | `/api/v1/dashboards/*` | Dashboard & widget management |
| Assistant | `/api/v1/assistant/*` | AI-powered analytics |
| Admin | `/api/v1/admin/*` | Platform administration |

See the OpenAPI specification for complete endpoint documentation.
