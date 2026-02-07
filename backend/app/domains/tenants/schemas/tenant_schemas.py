"""
NovaSight Tenants Domain — Tenant Schemas
==========================================

Canonical location: ``app.domains.tenants.schemas.tenant_schemas``

Marshmallow schemas for tenant management API.
"""

import re

from marshmallow import Schema, fields, validate, validates, ValidationError


class TenantSchema(Schema):
    """Schema for tenant response."""

    id = fields.UUID(dump_only=True)
    name = fields.Str()
    slug = fields.Str()
    plan = fields.Str()
    status = fields.Str()
    settings = fields.Dict()
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class TenantCreateSchema(Schema):
    """Schema for creating a new tenant."""

    name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
        metadata={"description": "Tenant display name"},
    )
    slug = fields.Str(
        required=True,
        validate=[
            validate.Length(min=3, max=50),
            validate.Regexp(
                r"^[a-z][a-z0-9_-]*$",
                error="Slug must start with a letter and contain only "
                "lowercase letters, numbers, hyphens, and underscores",
            ),
        ],
        metadata={
            "description": "Unique tenant identifier for URLs and DB schemas"
        },
    )
    plan = fields.Str(
        load_default="basic",
        validate=validate.OneOf(["basic", "professional", "enterprise"]),
        metadata={"description": "Subscription plan"},
    )
    settings = fields.Dict(
        load_default=dict,
        metadata={"description": "Tenant-specific configuration"},
    )

    @validates("slug")
    def validate_slug(self, value):
        """Reject reserved words."""
        reserved = [
            "admin", "api", "system", "public", "internal", "root"
        ]
        if value.lower() in reserved:
            raise ValidationError(
                f"'{value}' is a reserved word and cannot be used as a slug"
            )


class TenantUpdateSchema(Schema):
    """Schema for updating an existing tenant."""

    name = fields.Str(
        validate=validate.Length(min=1, max=100),
        metadata={"description": "Tenant display name"},
    )
    plan = fields.Str(
        validate=validate.OneOf(["basic", "professional", "enterprise"]),
        metadata={"description": "Subscription plan"},
    )
    settings = fields.Dict(
        metadata={
            "description": "Tenant-specific configuration (merged)"
        },
    )
    status = fields.Str(
        validate=validate.OneOf(["active", "suspended", "pending"]),
        metadata={"description": "Tenant status (super_admin only)"},
    )


class TenantListSchema(Schema):
    """Schema for paginated tenant list response."""

    items = fields.List(fields.Nested(TenantSchema))
    total = fields.Int()
    page = fields.Int()
    per_page = fields.Int()
    pages = fields.Int()


class TenantUsageSchema(Schema):
    """Schema for tenant usage statistics."""

    storage_gb = fields.Float(
        metadata={"description": "ClickHouse storage usage in GB"}
    )
    users_count = fields.Int(
        metadata={"description": "Number of active users"}
    )
    datasources_count = fields.Int(
        metadata={"description": "Number of data connections"}
    )
    dashboards_count = fields.Int(
        metadata={"description": "Number of dashboards"}
    )
    queries_last_30d = fields.Int(
        metadata={"description": "Query count in last 30 days"}
    )
    dag_configs_count = fields.Int(
        metadata={"description": "Number of DAG configurations"}
    )


class TenantProvisioningStatusSchema(Schema):
    """Schema for tenant provisioning status."""

    tenant_id = fields.UUID()
    pg_schema_created = fields.Bool()
    ch_database_created = fields.Bool()
    default_roles_created = fields.Bool()
    provisioned_at = fields.DateTime(allow_none=True)
    status = fields.Str()
    error = fields.Str(allow_none=True)
