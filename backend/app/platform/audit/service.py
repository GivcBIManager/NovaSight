"""
NovaSight Platform – Audit
===========================

Re-exports the audit service and decorator from their original
locations.  A full migration into this module is planned for a
future phase; for now this acts as the canonical import path.
"""

from app.services.audit_service import AuditService   # noqa: F401
from app.middleware.audit import audited               # noqa: F401
