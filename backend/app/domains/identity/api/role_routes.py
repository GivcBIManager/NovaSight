"""
NovaSight Identity Domain — Role Routes
=========================================

Canonical location: ``app.domains.identity.api.role_routes``

Role and permission CRUD operations within tenant scope.
"""

import logging

from flask import request, jsonify

from app.api.v1 import api_v1_bp
from app.domains.identity.application.role_service import RoleService
from app.platform.auth.jwt_handler import get_jwt_identity_dict
from app.platform.auth.decorators import authenticated, require_roles, tenant_required
from app.platform.errors.exceptions import ValidationError, NotFoundError
from app.domains.identity.schemas.role_schemas import (
    RoleSchema,
    RoleCreateSchema,
    RoleUpdateSchema,
    AVAILABLE_PERMISSIONS,
    DEFAULT_ROLE_TEMPLATES,
)

logger = logging.getLogger(__name__)


@api_v1_bp.route("/roles", methods=["GET"])
@authenticated
@tenant_required
def list_roles():
    """List all roles available in current tenant."""
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")

    role_service = RoleService(tenant_id)
    roles = role_service.list_roles()

    return jsonify({
        "roles": RoleSchema(many=True).dump(roles),
        "total": len(roles),
    })


@api_v1_bp.route("/roles/<role_id>", methods=["GET"])
@authenticated
@tenant_required
def get_role(role_id: str):
    """Get role details by ID."""
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")

    role_service = RoleService(tenant_id)

    try:
        role = role_service.get_role(role_id)
    except LookupError as e:
        raise NotFoundError(str(e))

    return jsonify({"role": RoleSchema().dump(role)})


@api_v1_bp.route("/roles", methods=["POST"])
@authenticated
@tenant_required
@require_roles("tenant_admin")
def create_role():
    """Create a new custom role."""
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    schema = RoleCreateSchema()
    validated_data = schema.load(data)

    role_service = RoleService(tenant_id)

    try:
        role = role_service.create_role(validated_data)
    except ValueError as e:
        raise ValidationError(str(e))

    logger.info(f"Role '{role.name}' created in tenant {tenant_id}")

    return jsonify({"role": RoleSchema().dump(role)}), 201


@api_v1_bp.route("/roles/<role_id>", methods=["PUT", "PATCH"])
@authenticated
@tenant_required
@require_roles("tenant_admin")
def update_role(role_id: str):
    """Update a custom role. System roles cannot be modified."""
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    schema = RoleUpdateSchema()
    validated_data = schema.load(data)

    role_service = RoleService(tenant_id)

    try:
        role = role_service.update_role(role_id, validated_data)
    except LookupError as e:
        raise NotFoundError(str(e))
    except ValueError as e:
        raise ValidationError(str(e))

    logger.info(f"Role '{role.name}' updated in tenant {tenant_id}")

    return jsonify({"role": RoleSchema().dump(role)})


@api_v1_bp.route("/roles/<role_id>", methods=["DELETE"])
@authenticated
@tenant_required
@require_roles("tenant_admin")
def delete_role(role_id: str):
    """Delete a custom role. System/assigned roles cannot be deleted."""
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")

    role_service = RoleService(tenant_id)

    try:
        role_service.delete_role(role_id)
    except LookupError as e:
        raise NotFoundError(str(e))
    except ValueError as e:
        raise ValidationError(str(e))

    logger.info(f"Role {role_id} deleted from tenant {tenant_id}")

    return jsonify({"message": "Role deleted successfully"})


@api_v1_bp.route("/roles/permissions", methods=["GET"])
@authenticated
@tenant_required
def list_permissions():
    """List all available permissions grouped by category."""
    permissions = []
    categories = {}

    for perm_name, description in AVAILABLE_PERMISSIONS.items():
        category = perm_name.split(".")[0]
        permissions.append({
            "name": perm_name,
            "description": description,
            "category": category,
        })
        if category not in categories:
            categories[category] = []
        categories[category].append(perm_name)

    return jsonify({"permissions": permissions, "categories": categories})


@api_v1_bp.route("/roles/templates", methods=["GET"])
@authenticated
@tenant_required
def list_role_templates():
    """List available role templates for creating custom roles."""
    templates = [
        {
            "name": name,
            "display_name": config["display_name"],
            "description": config["description"],
            "permissions": config["permissions"],
        }
        for name, config in DEFAULT_ROLE_TEMPLATES.items()
    ]

    return jsonify({"templates": templates})


@api_v1_bp.route("/roles/initialize", methods=["POST"])
@authenticated
@tenant_required
@require_roles("tenant_admin", "super_admin")
def initialize_default_roles():
    """Initialize default roles for the tenant from templates."""
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")

    role_service = RoleService(tenant_id)
    created_roles = role_service.initialize_defaults(DEFAULT_ROLE_TEMPLATES)

    logger.info(
        f"Initialized {len(created_roles)} default roles for tenant {tenant_id}"
    )

    return jsonify({
        "message": f"Created {len(created_roles)} roles",
        "roles": RoleSchema(many=True).dump(created_roles),
    }), 201
