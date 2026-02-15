"""
NovaSight Identity Domain — Role Schemas
==========================================

Canonical location: ``app.domains.identity.schemas.role_schemas``

Marshmallow schemas for role and permission data validation and serialization.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, post_load


# ---------------------------------------------------------------------------
# Available permissions in the system
# ---------------------------------------------------------------------------

AVAILABLE_PERMISSIONS = {
    # Data Sources
    "datasources.view": "View data sources",
    "datasources.create": "Create data sources",
    "datasources.edit": "Edit data sources",
    "datasources.delete": "Delete data sources",
    # Connections
    "connections.view": "View connections",
    "connections.create": "Create connections",
    "connections.edit": "Edit connections",
    "connections.delete": "Delete connections",
    "connections.test": "Test connections",
    # Ingestion
    "ingestion.view": "View ingestion pipelines",
    "ingestion.create": "Create ingestion pipelines",
    "ingestion.execute": "Execute ingestion pipelines",
    "ingestion.delete": "Delete ingestion pipelines",
    # dbt Models
    "models.view": "View dbt models",
    "models.create": "Create dbt models",
    "models.edit": "Edit dbt models",
    "models.delete": "Delete dbt models",
    # DAGs
    "dags.view": "View DAGs",
    "dags.create": "Create DAGs",
    "dags.execute": "Execute DAGs",
    "dags.delete": "Delete DAGs",
    # Analytics
    "analytics.query": "Execute queries",
    "analytics.export": "Export data",
    # Dashboards
    "dashboards.view": "View dashboards",
    "dashboards.create": "Create dashboards",
    "dashboards.edit": "Edit dashboards",
    "dashboards.share": "Share dashboards",
    "dashboards.delete": "Delete dashboards",
    # Users
    "users.view": "View users",
    "users.create": "Create users",
    "users.edit": "Edit users",
    "users.delete": "Delete users",
    # Roles
    "roles.view": "View roles",
    "roles.create": "Create roles",
    "roles.edit": "Edit roles",
    "roles.delete": "Delete roles",
    # Admin
    "admin.settings": "Manage settings",
    "admin.audit": "View audit logs",
    "admin.tenant": "Manage tenant settings",
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class PermissionSchema(Schema):
    """Schema for permission data."""

    name = fields.String(required=True)
    description = fields.String()
    category = fields.String()


class RoleSchema(Schema):
    """Schema for role data serialization."""

    id = fields.UUID(dump_only=True)
    name = fields.String(required=True)
    display_name = fields.String()
    description = fields.String()
    permissions = fields.Raw()  # Can be dict or list (e.g., ["*"] for super_admin)
    is_system = fields.Boolean(dump_only=True)
    is_default = fields.Boolean()
    tenant_id = fields.UUID(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class RoleCreateSchema(Schema):
    """Schema for creating a new role."""

    name = fields.String(
        required=True,
        validate=[
            validate.Length(min=2, max=50),
            validate.Regexp(
                r"^[a-z][a-z0-9_]*$",
                error="Role name must start with a letter and contain only "
                "lowercase letters, numbers, and underscores",
            ),
        ],
        error_messages={"required": "Role name is required"},
    )
    display_name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Display name is required"},
    )
    description = fields.String(validate=validate.Length(max=500))
    permissions = fields.List(fields.String(), load_default=[])
    is_default = fields.Boolean(load_default=False)

    @validates("permissions")
    def validate_permissions(self, value):
        """Validate all permissions are valid."""
        invalid_perms = [p for p in value if p not in AVAILABLE_PERMISSIONS]
        if invalid_perms:
            raise ValidationError(
                f"Invalid permissions: {', '.join(invalid_perms)}"
            )
        return value

    @post_load
    def normalize_data(self, data, **kwargs):
        """Normalize input data."""
        data["name"] = data["name"].lower().strip()
        data["display_name"] = data["display_name"].strip()
        if data.get("description"):
            data["description"] = data["description"].strip()
        return data


class RoleUpdateSchema(Schema):
    """Schema for updating a role."""

    display_name = fields.String(validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=500))
    permissions = fields.List(fields.String())
    is_default = fields.Boolean()

    @validates("permissions")
    def validate_permissions(self, value):
        """Validate all permissions are valid."""
        if value:
            invalid_perms = [p for p in value if p not in AVAILABLE_PERMISSIONS]
            if invalid_perms:
                raise ValidationError(
                    f"Invalid permissions: {', '.join(invalid_perms)}"
                )
        return value


class RoleListSchema(Schema):
    """Schema for role list response."""

    roles = fields.List(fields.Nested(RoleSchema))
    total = fields.Integer()


class PermissionListSchema(Schema):
    """Schema for permission list response."""

    permissions = fields.List(fields.Nested(PermissionSchema))
    categories = fields.Dict(
        keys=fields.String(), values=fields.List(fields.String())
    )


# ---------------------------------------------------------------------------
# Default role templates
# ---------------------------------------------------------------------------

DEFAULT_ROLE_TEMPLATES = {
    "viewer": {
        "display_name": "Viewer",
        "description": "Can view dashboards, models, and data",
        "permissions": [
            "datasources.view",
            "connections.view",
            "ingestion.view",
            "models.view",
            "dags.view",
            "analytics.query",
            "dashboards.view",
        ],
    },
    "analyst": {
        "display_name": "Analyst",
        "description": "Can query data and create dashboards",
        "permissions": [
            "datasources.view",
            "connections.view",
            "ingestion.view",
            "models.view",
            "models.create",
            "dags.view",
            "analytics.query",
            "analytics.export",
            "dashboards.view",
            "dashboards.create",
            "dashboards.edit",
        ],
    },
    "data_engineer": {
        "display_name": "Data Engineer",
        "description": "Can create and manage data pipelines",
        "permissions": [
            "datasources.view",
            "datasources.create",
            "datasources.edit",
            "connections.view",
            "connections.create",
            "connections.edit",
            "connections.test",
            "ingestion.view",
            "ingestion.create",
            "ingestion.execute",
            "models.view",
            "models.create",
            "models.edit",
            "dags.view",
            "dags.create",
            "dags.execute",
            "analytics.query",
            "analytics.export",
            "dashboards.view",
            "dashboards.create",
            "dashboards.share",
        ],
    },
    "tenant_admin": {
        "display_name": "Tenant Administrator",
        "description": "Full access to all tenant resources",
        "permissions": list(AVAILABLE_PERMISSIONS.keys()),
    },
}
