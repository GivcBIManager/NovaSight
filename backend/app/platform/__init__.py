"""
NovaSight Platform Kernel
=========================

Shared infrastructure modules providing cross-cutting concerns:
- Auth: JWT handling, identity resolution, decorators
- Tenant: Context resolution, schema isolation
- Security: Encryption, credentials, password hashing
- Audit: Immutable audit logging
- Observability: Structured logging, metrics, request tracing
- Errors: Exception hierarchy, error handlers
- Validation: Input validation, pagination, naming
"""

__all__ = [
    'auth',
    'tenant',
    'security',
    'audit',
    'observability',
    'errors',
    'validation',
]
