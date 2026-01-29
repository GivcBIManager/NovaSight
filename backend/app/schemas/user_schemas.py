"""
NovaSight User Schemas
======================

Marshmallow schemas for user-related data validation and serialization.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from typing import List, Optional


class RoleSchema(Schema):
    """Schema for role data."""
    
    id = fields.UUID(dump_only=True)
    name = fields.String(required=True)
    display_name = fields.String()
    description = fields.String()
    permissions = fields.Dict()
    is_system = fields.Boolean(dump_only=True)


class UserSchema(Schema):
    """Schema for user data serialization."""
    
    id = fields.UUID(dump_only=True)
    tenant_id = fields.UUID(dump_only=True)
    email = fields.Email(required=True)
    name = fields.String(required=True)
    avatar_url = fields.String(allow_none=True)
    status = fields.String(dump_only=True)
    email_verified = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    last_login_at = fields.DateTime(dump_only=True, allow_none=True)
    roles = fields.Nested(RoleSchema, many=True, dump_only=True)


class UserCreateSchema(Schema):
    """Schema for creating a new user."""
    
    email = fields.Email(
        required=True,
        validate=validate.Length(max=255),
        error_messages={"required": "Email is required"}
    )
    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=255),
        error_messages={"required": "Name is required"}
    )
    password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(min=12, max=128),
        error_messages={"required": "Password is required"}
    )
    roles = fields.List(
        fields.String(),
        load_default=["viewer"]
    )
    
    @validates("email")
    def validate_email(self, value):
        """Additional email validation."""
        if not value or "@" not in value:
            raise ValidationError("Invalid email format")
        return value.lower().strip()
    
    @post_load
    def normalize_data(self, data, **kwargs):
        """Normalize input data."""
        data["email"] = data["email"].lower().strip()
        data["name"] = data["name"].strip()
        return data


class UserUpdateSchema(Schema):
    """Schema for updating a user."""
    
    name = fields.String(
        validate=validate.Length(min=1, max=255)
    )
    password = fields.String(
        load_only=True,
        validate=validate.Length(min=12, max=128)
    )
    roles = fields.List(fields.String())
    status = fields.String(
        validate=validate.OneOf(["active", "inactive", "pending", "locked"])
    )
    avatar_url = fields.String(
        validate=validate.Length(max=500),
        allow_none=True
    )
    preferences = fields.Dict()
    
    @post_load
    def normalize_data(self, data, **kwargs):
        """Normalize input data."""
        if "name" in data:
            data["name"] = data["name"].strip()
        return data


class UserListSchema(Schema):
    """Schema for paginated user list response."""
    
    items = fields.List(fields.Nested(UserSchema))
    total = fields.Integer()
    page = fields.Integer()
    per_page = fields.Integer()
    pages = fields.Integer()
    has_next = fields.Boolean()
    has_prev = fields.Boolean()


class UserPermissionsSchema(Schema):
    """Schema for user permissions response."""
    
    user_id = fields.UUID()
    permissions = fields.List(fields.String())


class AssignRolesSchema(Schema):
    """Schema for assigning roles to a user."""
    
    role_ids = fields.List(
        fields.UUID(),
        required=True,
        validate=validate.Length(min=1),
        error_messages={"required": "At least one role is required"}
    )


class ChangePasswordSchema(Schema):
    """Schema for changing user password."""
    
    current_password = fields.String(
        required=True,
        load_only=True,
        error_messages={"required": "Current password is required"}
    )
    new_password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(min=12, max=128),
        error_messages={"required": "New password is required"}
    )
