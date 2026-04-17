"""
NovaSight Platform – Tenant Context
=====================================

Middleware that resolves the current tenant from the JWT, validates
its status, sets the PostgreSQL ``search_path`` for schema isolation,
and populates ``flask.g`` with request-scoped tenant / user metadata.

Canonical location – all other modules should import from here.
"""

import logging
from functools import wraps
from typing import Optional, List

from flask import Flask, g, request, abort
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from sqlalchemy import text

from app.platform.auth.constants import PUBLIC_ENDPOINTS, PUBLIC_PATH_PREFIXES

logger = logging.getLogger(__name__)


class TenantContextMiddleware:
    """
    WSGI-layer middleware registered via ``before_request`` /
    ``teardown_request``.

    Responsibilities
    ----------------
    1. Extract ``tenant_id`` from JWT claims.
    2. Load & validate the ``Tenant`` record (must be ACTIVE).
    3. Set ``search_path`` for schema-based isolation.
    4. Store tenant / user context on ``flask.g``.
    """

    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        app.before_request(self._init_tenant_context)
        app.teardown_request(self._cleanup_tenant_context)

    # ── before_request ─────────────────────────────────────────────

    def _init_tenant_context(self) -> None:
        # Sensible defaults
        g.tenant = None
        g.tenant_id = None
        g.tenant_schema = "public"
        g.current_user_id = None
        g.current_user = None
        g.user_roles = []
        g.user_permissions = []

        if self._is_public_endpoint():
            return

        try:
            verify_jwt_in_request()
            claims = get_jwt()

            from app.platform.auth.jwt_handler import get_jwt_identity_dict
            identity = get_jwt_identity_dict()

            tenant_id = (
                identity.get("tenant_id")
                if isinstance(identity, dict)
                else claims.get("tenant_id")
            )
            if not tenant_id:
                logger.warning("Missing tenant_id in JWT claims")
                abort(401, description="Missing tenant context")

            # ── Validate tenant ───────────────────────────────────
            from app.domains.tenants.domain.models import Tenant, TenantStatus
            from app.extensions import db

            tenant = db.session.get(Tenant, tenant_id)
            if not tenant:
                logger.warning("Tenant not found: %s", tenant_id)
                abort(401, description="Invalid tenant")

            if tenant.status not in (TenantStatus.ACTIVE.value, TenantStatus.ACTIVE):
                logger.warning("Inactive tenant access attempt: %s", tenant.slug)
                abort(401, description="Tenant is not active")

            # ── Populate g ────────────────────────────────────────
            from app.platform.tenant.schema import get_tenant_schema_name

            g.tenant = tenant
            g.tenant_id = str(tenant.id)
            g.tenant_schema = get_tenant_schema_name(tenant.slug)

            if isinstance(identity, dict):
                g.current_user_id = identity.get("user_id")
                g.user_roles = identity.get("roles", [])
                if g.current_user_id:
                    from app.domains.identity.domain.models import User
                    g.current_user = db.session.get(User, g.current_user_id)

            g.user_permissions = claims.get("permissions", [])

            self._set_search_path(g.tenant_schema)
            logger.debug("Tenant context set: %s (schema: %s)", tenant.slug, g.tenant_schema)

        except Exception as e:
            if hasattr(e, "code") and e.code in (401, 403):
                raise
            error_type = type(e).__name__
            logger.error("Error initializing tenant context (%s): %s", error_type, e)
            logger.debug(
                "Request path: %s, Authorization header present: %s",
                request.path,
                "Authorization" in request.headers,
            )
            abort(401, description="Authentication required")

    # ── search_path management ─────────────────────────────────────

    @staticmethod
    def _set_search_path(tenant_schema: str) -> None:
        """Set ``search_path`` using parameterised identifier validation."""
        if not tenant_schema.replace("_", "").isalnum():
            raise ValueError(f"Invalid schema name: {tenant_schema}")
        from app.extensions import db
        db.session.execute(
            text(f"SET search_path TO {tenant_schema}, public")
        )
        logger.debug("Search path set to: %s, public", tenant_schema)

    # ── helpers ────────────────────────────────────────────────────

    @staticmethod
    def _is_public_endpoint() -> bool:
        if request.method == "OPTIONS":
            return True
        if request.endpoint in PUBLIC_ENDPOINTS:
            return True
        return request.path.startswith(PUBLIC_PATH_PREFIXES)

    # ── teardown ───────────────────────────────────────────────────

    @staticmethod
    def _cleanup_tenant_context(exception=None) -> None:
        try:
            if g.get("tenant_schema") and g.tenant_schema != "public":
                from app.extensions import db
                db.session.execute(text("SET search_path TO public"))
        except Exception:
            pass
        for attr in (
            "tenant", "tenant_id", "tenant_schema",
            "current_user_id", "current_user", "user_roles", "user_permissions",
        ):
            g.pop(attr, None)


# ─── Convenience helpers ────────────────────────────────────────────

def require_tenant(f):
    """Decorator: abort 401 unless a valid tenant is on ``g``."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not getattr(g, "tenant", None):
            abort(401, description="Tenant context required")
        return f(*args, **kwargs)
    return decorated


def get_current_tenant():
    """Return the current ``Tenant`` model (or ``None``)."""
    return getattr(g, "tenant", None)


def get_current_tenant_id() -> Optional[str]:
    return getattr(g, "tenant_id", None)


def get_current_user_id() -> Optional[str]:
    return getattr(g, "current_user_id", None)


def get_user_roles() -> List[str]:
    return getattr(g, "user_roles", [])


def get_user_permissions() -> List[str]:
    return getattr(g, "user_permissions", [])
