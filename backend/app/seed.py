"""
NovaSight Seed Data
====================

Default test users, tenant, and roles seeded on first deploy.

Each canonical role gets a corresponding test user so that every
persona can be exercised immediately after ``docker-compose up``.

IMPORTANT:
    These credentials are for **development / demo** only.
    Production deployments MUST set ``SEED_USERS=false`` or
    override the passwords via environment variables.
"""

import logging
import uuid

from flask.cli import AppGroup, with_appcontext
import click

from app.extensions import db

logger = logging.getLogger(__name__)

seed_cli = AppGroup("seed", help="Database seeding commands")

# ─────────────────────────────────────────────────────────
# Default test tenant
# ─────────────────────────────────────────────────────────
DEFAULT_TENANT = {
    "name": "NovaSight Demo",
    "slug": "novasight-demo",
    "plan": "enterprise",
    "status": "active",
    "settings": {
        "max_users": 100,
        "max_connections": 50,
        "max_dashboards": 200,
        "features": {
            "ai_assistant": True,
            "dbt_operations": True,
            "data_pipelines": True,
        },
    },
}

# ─────────────────────────────────────────────────────────
# Default test users — one per role
# ─────────────────────────────────────────────────────────
# Password policy: ≥12 chars, upper + lower + digit + special
DEFAULT_PASSWORD = "NovaSight@2026"

TEST_USERS = [
    {
        "email": "superadmin@novasight.dev",
        "name": "Super Admin",
        "role": "super_admin",
        "status": "active",
    },
    {
        "email": "tenantadmin@novasight.dev",
        "name": "Tenant Admin",
        "role": "tenant_admin",
        "status": "active",
    },
    {
        "email": "engineer@novasight.dev",
        "name": "Data Engineer",
        "role": "data_engineer",
        "status": "active",
    },
    {
        "email": "bideveloper@novasight.dev",
        "name": "BI Developer",
        "role": "bi_developer",
        "status": "active",
    },
    {
        "email": "analyst@novasight.dev",
        "name": "Analyst",
        "role": "analyst",
        "status": "active",
    },
    {
        "email": "viewer@novasight.dev",
        "name": "Viewer",
        "role": "viewer",
        "status": "active",
    },
    {
        "email": "auditor@novasight.dev",
        "name": "Auditor",
        "role": "auditor",
        "status": "active",
    },
]


def _get_or_create_tenant():
    """Get or create the default demo tenant with full provisioning."""
    from app.domains.tenants.domain.models import Tenant
    from app.domains.tenants.infrastructure.provisioning import ProvisioningService

    tenant = Tenant.query.filter_by(slug=DEFAULT_TENANT["slug"]).first()
    if tenant:
        logger.info("Demo tenant already exists: %s", tenant.slug)
        return tenant, False

    tenant = Tenant(
        name=DEFAULT_TENANT["name"],
        slug=DEFAULT_TENANT["slug"],
        plan=DEFAULT_TENANT["plan"],
        status=DEFAULT_TENANT["status"],
        settings=DEFAULT_TENANT["settings"],
    )
    db.session.add(tenant)
    db.session.flush()  # get the id without committing
    logger.info("Created demo tenant: %s (id=%s)", tenant.slug, tenant.id)

    # Provision PostgreSQL schema + ClickHouse database for the new tenant
    try:
        provisioning = ProvisioningService()
        provisioning.provision(tenant)
        logger.info("Provisioned resources for demo tenant: %s", tenant.slug)
    except Exception as exc:
        logger.warning(
            "Failed to provision resources for demo tenant (may already exist or service unavailable): %s",
            exc,
        )

    return tenant, True


def _ensure_roles(tenant_id):
    """
    Ensure all system roles exist (global super_admin + per-tenant roles).

    The ``roles`` table has a **global** unique index on ``name``
    (``ix_roles_name``), so we must look up by name alone, not by
    (name, tenant_id).  If a role already exists we reuse it; if not,
    we create it scoped to the given tenant.

    Returns a dict mapping role_name → Role instance.
    """
    from app.domains.identity.domain.models import Role
    from app.domains.identity.application.rbac_service import RBACService

    role_map = {}

    # ── Helper: get-or-create a role by name (globally unique) ──
    def _get_or_create_role(name, display_name, description, permissions,
                            is_system=True, is_default=False, role_tenant_id=None):
        existing = Role.query.filter_by(name=name).first()
        if existing:
            role_map[name] = existing
            return existing
        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            permissions=permissions,
            is_system=is_system,
            is_default=is_default,
            tenant_id=role_tenant_id,
        )
        db.session.add(role)
        db.session.flush()
        logger.info("Created role: %s", name)
        role_map[name] = role
        return role

    # ── Global super_admin role ──
    sa_config = RBACService.DEFAULT_ROLES["super_admin"]
    _get_or_create_role(
        name="super_admin",
        display_name=sa_config["display_name"],
        description=sa_config["description"],
        permissions=["*"],
        is_system=True,
        is_default=False,
        role_tenant_id=None,
    )

    # ── Per-tenant roles ──
    for role_name, config in RBACService.DEFAULT_ROLES.items():
        if role_name == "super_admin":
            continue
        permissions_dict = RBACService._expand_permission_patterns(
            config["permissions"]
        )
        _get_or_create_role(
            name=role_name,
            display_name=config["display_name"],
            description=config["description"],
            permissions=permissions_dict,
            is_system=config.get("is_system", True),
            is_default=config.get("is_default", False),
            role_tenant_id=tenant_id,
        )

    # ── Auditor role (if not in DEFAULT_ROLES) ──
    if "auditor" not in role_map:
        _get_or_create_role(
            name="auditor",
            display_name="Auditor",
            description="Read-only access to audit logs and compliance data",
            permissions={
                "admin": ["admin.audit.view"],
                "dashboards": ["dashboards.view"],
                "analytics": ["analytics.query"],
            },
            is_system=True,
            is_default=False,
            role_tenant_id=tenant_id,
        )

    return role_map


def _create_user(user_cfg, tenant_id, role, password):
    """Create a single user and assign a role. Skips if email already exists."""
    from app.domains.identity.domain.models import User

    existing = User.query.filter_by(
        email=user_cfg["email"], tenant_id=tenant_id
    ).first()
    if existing:
        logger.info("User already exists: %s", user_cfg["email"])
        return existing, False

    user = User(
        email=user_cfg["email"],
        name=user_cfg["name"],
        status=user_cfg["status"],
        tenant_id=tenant_id,
        preferences={},
    )
    user.set_password(password)
    user.roles.append(role)
    db.session.add(user)
    db.session.flush()
    logger.info(
        "Created user: %s  role=%s  tenant=%s",
        user.email,
        role.name,
        tenant_id,
    )
    return user, True


def seed_default_data(password: str | None = None):
    """
    Seed demo tenant, system roles, and one test user per role.

    Safe to call multiple times — existing records are skipped.
    Returns a summary dict.
    """
    import os

    password = password or os.getenv("SEED_PASSWORD", DEFAULT_PASSWORD)

    summary = {
        "tenant_created": False,
        "roles_created": [],
        "users_created": [],
        "users_skipped": [],
    }

    # 1. Tenant
    tenant, created = _get_or_create_tenant()
    summary["tenant_created"] = created

    # 2. Initialize system permissions
    from app.domains.identity.application.rbac_service import RBACService

    try:
        RBACService.initialize_permissions()
    except Exception as exc:
        logger.warning("Could not initialize permissions (may already exist): %s", exc)

    # 3. Roles
    role_map = _ensure_roles(tenant.id)

    # 4. Users
    for user_cfg in TEST_USERS:
        role = role_map.get(user_cfg["role"])
        if not role:
            logger.warning(
                "Role '%s' not found, skipping user %s",
                user_cfg["role"],
                user_cfg["email"],
            )
            continue
        _user, created = _create_user(user_cfg, tenant.id, role, password)
        if created:
            summary["users_created"].append(user_cfg["email"])
        else:
            summary["users_skipped"].append(user_cfg["email"])

    db.session.commit()
    return summary


# ─────────────────────────────────────────────────────────
# CLI command: flask seed users
# ─────────────────────────────────────────────────────────

@seed_cli.command("users")
@click.option(
    "--password",
    default=None,
    help=f"Password for all test users (default: {DEFAULT_PASSWORD})",
)
@with_appcontext
def seed_users_cmd(password):
    """
    Seed the database with a demo tenant and one test user per role.

    Safe to run multiple times — existing records are skipped.

    Examples:
        flask seed users
        flask seed users --password "MyCustomP@ss123"
    """
    click.echo("Seeding default users...")

    summary = seed_default_data(password=password)

    if summary["tenant_created"]:
        click.echo(click.style("  ✓ Created demo tenant: novasight-demo", fg="green"))
    else:
        click.echo("  • Demo tenant already exists")

    for email in summary["users_created"]:
        click.echo(click.style(f"  ✓ Created user: {email}", fg="green"))

    for email in summary["users_skipped"]:
        click.echo(f"  • Skipped (exists): {email}")

    pw = password or DEFAULT_PASSWORD
    click.echo("")
    click.echo(click.style("═" * 55, fg="cyan"))
    click.echo(click.style("  Test User Credentials", fg="cyan", bold=True))
    click.echo(click.style("═" * 55, fg="cyan"))
    click.echo(f"  Password (all users):  {pw}")
    click.echo(click.style("─" * 55, fg="cyan"))
    for u in TEST_USERS:
        click.echo(f"  {u['role']:<18}  {u['email']}")
    click.echo(click.style("═" * 55, fg="cyan"))
    click.echo("")
    click.echo(
        click.style(
            "⚠  These are DEV/DEMO credentials. Do NOT use in production.",
            fg="yellow",
        )
    )
