"""
Backward-compatibility shim.
Import from ``app.platform.audit.service`` instead.
"""
from app.platform.audit.service import AuditService, audit_service  # noqa: F401
