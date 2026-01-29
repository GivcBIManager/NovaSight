"""
NovaSight Role Management Endpoints
===================================

Role and permission CRUD operations within tenant scope.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1 import api_v1_bp
from app.models.user import Role
from app.extensions import db
from app.decorators import require_roles, require_tenant_context
from app.errors import ValidationError, NotFoundError
from app.schemas.role_schemas import (
    RoleSchema,
    RoleCreateSchema,
    RoleUpdateSchema,
    PermissionSchema,
    AVAILABLE_PERMISSIONS,
    DEFAULT_ROLE_TEMPLATES
)
import logging
import uuid

logger = logging.getLogger(__name__)


@api_v1_bp.route("/roles", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_roles():
    """
    List all roles available in current tenant.
    
    Returns:
        List of roles with their permissions
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    # Get tenant-specific and global roles
    roles = Role.query.filter(
        (Role.tenant_id == tenant_id) | (Role.tenant_id.is_(None))
    ).order_by(Role.is_system.desc(), Role.name).all()
    
    return jsonify({
        "roles": RoleSchema(many=True).dump(roles),
        "total": len(roles)
    })


@api_v1_bp.route("/roles/<role_id>", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_role(role_id: str):
    """
    Get role details by ID.
    
    Args:
        role_id: Role UUID
    
    Returns:
        Role details with permissions
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    role = Role.query.filter(
        Role.id == role_id,
        (Role.tenant_id == tenant_id) | (Role.tenant_id.is_(None))
    ).first()
    
    if not role:
        raise NotFoundError("Role not found")
    
    return jsonify({"role": RoleSchema().dump(role)})


@api_v1_bp.route("/roles", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin"])
def create_role():
    """
    Create a new custom role.
    
    Request Body:
        - name: Role name (unique within tenant)
        - display_name: Human-readable name
        - description: Role description
        - permissions: List of permission strings
        - is_default: Whether this is the default role for new users
    
    Returns:
        Created role details
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")
    
    # Validate input
    schema = RoleCreateSchema()
    validated_data = schema.load(data)
    
    # Check for duplicate name
    existing = Role.query.filter(
        Role.tenant_id == tenant_id,
        Role.name == validated_data["name"]
    ).first()
    
    if existing:
        raise ValidationError(f"Role '{validated_data['name']}' already exists")
    
    # If this is being set as default, unset other defaults
    if validated_data.get("is_default"):
        Role.query.filter(
            Role.tenant_id == tenant_id,
            Role.is_default == True
        ).update({"is_default": False})
    
    # Create role
    role = Role(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=validated_data["name"],
        display_name=validated_data["display_name"],
        description=validated_data.get("description"),
        permissions={p: True for p in validated_data.get("permissions", [])},
        is_system=False,
        is_default=validated_data.get("is_default", False)
    )
    
    db.session.add(role)
    db.session.commit()
    
    logger.info(f"Role '{role.name}' created in tenant {tenant_id}")
    
    return jsonify({"role": RoleSchema().dump(role)}), 201


@api_v1_bp.route("/roles/<role_id>", methods=["PUT", "PATCH"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin"])
def update_role(role_id: str):
    """
    Update a custom role.
    
    System roles cannot be modified.
    
    Args:
        role_id: Role UUID
    
    Request Body:
        - display_name: Human-readable name
        - description: Role description
        - permissions: List of permission strings
        - is_default: Whether this is the default role
    
    Returns:
        Updated role details
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    role = Role.query.filter(
        Role.id == role_id,
        Role.tenant_id == tenant_id
    ).first()
    
    if not role:
        raise NotFoundError("Role not found")
    
    if role.is_system:
        raise ValidationError("System roles cannot be modified")
    
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")
    
    # Validate input
    schema = RoleUpdateSchema()
    validated_data = schema.load(data)
    
    # Update fields
    if "display_name" in validated_data:
        role.display_name = validated_data["display_name"]
    
    if "description" in validated_data:
        role.description = validated_data["description"]
    
    if "permissions" in validated_data:
        role.permissions = {p: True for p in validated_data["permissions"]}
    
    if "is_default" in validated_data:
        if validated_data["is_default"]:
            # Unset other defaults
            Role.query.filter(
                Role.tenant_id == tenant_id,
                Role.id != role.id,
                Role.is_default == True
            ).update({"is_default": False})
        role.is_default = validated_data["is_default"]
    
    db.session.commit()
    
    logger.info(f"Role '{role.name}' updated in tenant {tenant_id}")
    
    return jsonify({"role": RoleSchema().dump(role)})


@api_v1_bp.route("/roles/<role_id>", methods=["DELETE"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin"])
def delete_role(role_id: str):
    """
    Delete a custom role.
    
    System roles cannot be deleted.
    Roles with assigned users cannot be deleted.
    
    Args:
        role_id: Role UUID
    
    Returns:
        Success message
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    role = Role.query.filter(
        Role.id == role_id,
        Role.tenant_id == tenant_id
    ).first()
    
    if not role:
        raise NotFoundError("Role not found")
    
    if role.is_system:
        raise ValidationError("System roles cannot be deleted")
    
    # Check if role has users assigned
    if role.users:
        raise ValidationError(
            f"Cannot delete role with {len(role.users)} assigned user(s). "
            "Reassign users before deleting."
        )
    
    db.session.delete(role)
    db.session.commit()
    
    logger.info(f"Role '{role.name}' deleted from tenant {tenant_id}")
    
    return jsonify({"message": "Role deleted successfully"})


@api_v1_bp.route("/roles/permissions", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_permissions():
    """
    List all available permissions.
    
    Returns:
        List of permissions with descriptions grouped by category
    """
    permissions = []
    categories = {}
    
    for perm_name, description in AVAILABLE_PERMISSIONS.items():
        category = perm_name.split(".")[0]
        permissions.append({
            "name": perm_name,
            "description": description,
            "category": category
        })
        
        if category not in categories:
            categories[category] = []
        categories[category].append(perm_name)
    
    return jsonify({
        "permissions": permissions,
        "categories": categories
    })


@api_v1_bp.route("/roles/templates", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_role_templates():
    """
    List available role templates.
    
    These can be used as starting points for creating custom roles.
    
    Returns:
        List of role templates with permissions
    """
    templates = []
    for name, config in DEFAULT_ROLE_TEMPLATES.items():
        templates.append({
            "name": name,
            "display_name": config["display_name"],
            "description": config["description"],
            "permissions": config["permissions"]
        })
    
    return jsonify({"templates": templates})


@api_v1_bp.route("/roles/initialize", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin", "super_admin"])
def initialize_default_roles():
    """
    Initialize default roles for the tenant.
    
    Creates standard roles if they don't exist.
    
    Returns:
        List of created roles
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    created_roles = []
    
    for role_name, config in DEFAULT_ROLE_TEMPLATES.items():
        # Check if role already exists
        existing = Role.query.filter(
            Role.tenant_id == tenant_id,
            Role.name == role_name
        ).first()
        
        if existing:
            continue
        
        role = Role(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=role_name,
            display_name=config["display_name"],
            description=config["description"],
            permissions={p: True for p in config["permissions"]},
            is_system=False,
            is_default=(role_name == "viewer")
        )
        
        db.session.add(role)
        created_roles.append(role)
    
    db.session.commit()
    
    logger.info(f"Initialized {len(created_roles)} default roles for tenant {tenant_id}")
    
    return jsonify({
        "message": f"Created {len(created_roles)} roles",
        "roles": RoleSchema(many=True).dump(created_roles)
    }), 201
