"""
NovaSight Platform – Tenant Schema Utilities
==============================================

PostgreSQL schema management for multi-tenant isolation.

Canonical location – all other modules should import from here.
"""

import logging
import re
from typing import Optional, List

from flask import g, has_request_context
from sqlalchemy import text

logger = logging.getLogger(__name__)

# ── Compiled patterns (avoid re-compiling on every call) ───────────
_SLUG_RE = re.compile(r"[^a-z0-9_]")
_SCHEMA_RE = re.compile(r"^tenant_[a-z0-9_]+$")
_IDENT_RE = re.compile(r"^[a-z][a-z0-9_]*$")


def get_tenant_schema_name(tenant_slug: str) -> str:
    """Return ``tenant_{slug}`` with sanitised slug."""
    clean = _SLUG_RE.sub("_", tenant_slug.lower())
    return f"tenant_{clean}"


# ── Schema DDL ──────────────────────────────────────────────────────

def create_tenant_schema(tenant_slug: str) -> bool:
    """Create a PostgreSQL schema for *tenant_slug*.  Returns ``True`` on success."""
    from app.extensions import db
    schema = get_tenant_schema_name(tenant_slug)
    if not _SCHEMA_RE.match(schema):
        raise ValueError(f"Invalid schema name: {schema}")
    try:
        db.session.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
        db.session.commit()
        logger.info("Created schema: %s", schema)
        return True
    except Exception as e:
        logger.error("Failed to create schema %s: %s", schema, e)
        db.session.rollback()
        return False


def drop_tenant_schema(tenant_slug: str, cascade: bool = False) -> bool:
    """Drop a tenant schema.  **WARNING**: permanently deletes all data!"""
    from app.extensions import db
    schema = get_tenant_schema_name(tenant_slug)
    cascade_sql = "CASCADE" if cascade else "RESTRICT"
    try:
        db.session.execute(text(f"DROP SCHEMA IF EXISTS {schema} {cascade_sql}"))
        db.session.commit()
        logger.info("Dropped schema: %s", schema)
        return True
    except Exception as e:
        logger.error("Failed to drop schema %s: %s", schema, e)
        db.session.rollback()
        return False


def schema_exists(schema_name: str) -> bool:
    """Return ``True`` if *schema_name* exists in the database."""
    from app.extensions import db
    try:
        result = db.session.execute(
            text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :name"),
            {"name": schema_name},
        )
        return result.fetchone() is not None
    except Exception as e:
        logger.error("Error checking schema existence: %s", e)
        return False


def list_tenant_schemas() -> List[str]:
    """Return sorted list of all ``tenant_*`` schema names."""
    from app.extensions import db
    try:
        result = db.session.execute(
            text(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name"
            )
        )
        return [row[0] for row in result.fetchall()]
    except Exception as e:
        logger.error("Error listing tenant schemas: %s", e)
        return []


# ── Search-path helpers ─────────────────────────────────────────────

def set_search_path(schema_name: str) -> None:
    """Set ``search_path`` — validates *schema_name* first."""
    from app.extensions import db
    if not _IDENT_RE.match(schema_name):
        raise ValueError(f"Invalid schema name: {schema_name}")
    db.session.execute(text(f"SET search_path TO {schema_name}, public"))


def reset_search_path() -> None:
    from app.extensions import db
    db.session.execute(text("SET search_path TO public"))


def execute_in_tenant_context(tenant_slug: str, func, *args, **kwargs):
    """Run *func* with ``search_path`` pointed at *tenant_slug*'s schema."""
    schema = get_tenant_schema_name(tenant_slug)
    try:
        set_search_path(schema)
        return func(*args, **kwargs)
    finally:
        reset_search_path()


# ── Request-context queries ─────────────────────────────────────────

def get_current_tenant_schema() -> Optional[str]:
    if has_request_context() and hasattr(g, "tenant_schema"):
        return g.tenant_schema
    return None


def validate_tenant_access(tenant_id: str) -> bool:
    """Return ``True`` if the current user may access *tenant_id*."""
    if not has_request_context():
        return False
    current = getattr(g, "tenant_id", None)
    if not current:
        return False
    return str(current) == str(tenant_id)


# ── Context manager ────────────────────────────────────────────────

class TenantSchemaContext:
    """
    Context manager for executing queries within a tenant's schema.

    Usage::

        with TenantSchemaContext("acme-corp"):
            data = SomeModel.query.all()
    """

    def __init__(self, tenant_slug: str):
        self.schema_name = get_tenant_schema_name(tenant_slug)
        self._original: Optional[str] = None

    def __enter__(self):
        from app.extensions import db
        try:
            result = db.session.execute(text("SHOW search_path"))
            self._original = result.scalar()
        except Exception:
            self._original = "public"
        set_search_path(self.schema_name)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        from app.extensions import db
        if self._original:
            db.session.execute(text(f"SET search_path TO {self._original}"))
        else:
            reset_search_path()
        return False
