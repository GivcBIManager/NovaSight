"""
NovaSight User Management Endpoints
===================================

User CRUD operations within tenant scope.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required
from app.middleware.jwt_handlers import get_jwt_identity_dict
from app.api.v1 import api_v1_bp
from app.services.user_service import UserService
from app.decorators import require_roles, require_tenant_context
from app.errors import ValidationError, NotFoundError
from app.schemas.user_schemas import (
    UserSchema,
    UserCreateSchema,
    UserUpdateSchema,
    UserListSchema,
    ChangePasswordSchema
)
import logging

logger = logging.getLogger(__name__)


@api_v1_bp.route("/users", methods=["GET"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin", "user_manager"])
def list_users():
    """
    List users within current tenant.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)
        - search: Search in email or name
        - role: Filter by role name
        - status: Filter by status (active, inactive)
    
    Returns:
        Paginated list of users
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search")
    role = request.args.get("role")
    status = request.args.get("status")
    
    # Use class method with search support
    result = UserService.list_for_tenant(
        tenant_id=tenant_id,
        page=page,
        per_page=per_page,
        search=search,
        role=role,
        status=status
    )
    
    return jsonify(result)


@api_v1_bp.route("/users", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin", "user_manager"])
def create_user():
    """
    Create a new user within current tenant.
    
    Request Body:
        - email: User email address (unique within tenant)
        - name: User display name
        - password: Initial password
        - roles: List of role names to assign
    
    Returns:
        Created user details
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    required_fields = ["email", "name", "password"]
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")
    
    user_service = UserService(tenant_id)
    user = user_service.create_user(
        email=data["email"],
        name=data["name"],
        password=data["password"],
        role_names=data.get("roles", ["viewer"]),
    )
    
    logger.info(f"User '{data['email']}' created in tenant {tenant_id}")
    
    return jsonify({"user": user.to_dict()}), 201


@api_v1_bp.route("/users/<user_id>", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_user(user_id: str):
    """
    Get user details.
    
    Users can view their own profile; admins can view any user.
    
    Args:
        user_id: User UUID
    
    Returns:
        User details
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    current_user_id = identity.get("user_id")
    roles = identity.get("roles", [])
    
    # Users can only view themselves unless admin
    if user_id != current_user_id and not any(r in roles for r in ["tenant_admin", "user_manager"]):
        raise NotFoundError("User not found")
    
    user_service = UserService(tenant_id)
    user = user_service.get_user(user_id)
    
    if not user:
        raise NotFoundError("User not found")
    
    return jsonify({"user": user.to_dict()})


@api_v1_bp.route("/users/<user_id>", methods=["PATCH"])
@jwt_required()
@require_tenant_context
def update_user(user_id: str):
    """
    Update user details.
    
    Users can update their own profile (limited fields);
    admins can update any user.
    
    Args:
        user_id: User UUID
    
    Request Body:
        - name: Display name
        - password: New password
        - roles: Role assignments (admin only)
        - status: User status (admin only)
    
    Returns:
        Updated user details
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    current_user_id = identity.get("user_id")
    roles = identity.get("roles", [])
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    is_admin = any(r in roles for r in ["tenant_admin", "user_manager"])
    is_self = user_id == current_user_id
    
    # Non-admins can only update themselves with limited fields
    if not is_admin:
        if not is_self:
            raise NotFoundError("User not found")
        # Non-admins cannot change roles or status
        data = {k: v for k, v in data.items() if k in ["name", "password"]}
    
    user_service = UserService(tenant_id)
    
    try:
        user = user_service.update_user(user_id, **data)
    except ValueError as e:
        raise ValidationError(str(e))
    
    if not user:
        raise NotFoundError("User not found")
    
    logger.info(f"User {user_id} updated in tenant {tenant_id}")
    
    return jsonify({"user": user.to_dict()})


@api_v1_bp.route("/users/<user_id>", methods=["DELETE"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin"])
def delete_user(user_id: str):
    """
    Delete (deactivate) a user.
    
    Args:
        user_id: User UUID
    
    Returns:
        Success message
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    current_user_id = identity.get("user_id")
    
    # Prevent self-deletion
    if user_id == current_user_id:
        raise ValidationError("Cannot delete your own account")
    
    user_service = UserService(tenant_id)
    success = user_service.delete_user(user_id)
    
    if not success:
        raise NotFoundError("User not found")
    
    logger.info(f"User {user_id} deleted from tenant {tenant_id}")
    
    return jsonify({"message": "User deleted successfully"})


@api_v1_bp.route("/users/<user_id>/permissions", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_user_permissions(user_id: str):
    """
    Get user's effective permissions from all assigned roles.
    
    Users can view their own permissions; admins can view any user's.
    
    Args:
        user_id: User UUID
    
    Returns:
        List of permission strings
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    current_user_id = identity.get("user_id")
    roles = identity.get("roles", [])
    
    # Users can only view their own permissions unless admin
    if user_id != current_user_id and not any(r in roles for r in ["tenant_admin", "user_manager"]):
        raise NotFoundError("User not found")
    
    user_service = UserService(tenant_id)
    
    try:
        permissions = user_service.get_permissions(user_id)
    except ValueError as e:
        raise NotFoundError(str(e))
    
    return jsonify({
        "user_id": user_id,
        "permissions": permissions
    })


@api_v1_bp.route("/users/<user_id>/roles", methods=["PUT"])
@jwt_required()
@require_tenant_context
@require_roles(["tenant_admin", "user_manager"])
def assign_user_roles(user_id: str):
    """
    Assign roles to a user.
    
    Args:
        user_id: User UUID
    
    Request Body:
        - roles: List of role names to assign
    
    Returns:
        Updated user details
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    data = request.get_json()
    
    if not data or "roles" not in data:
        raise ValidationError("'roles' field is required")
    
    role_names = data["roles"]
    if not isinstance(role_names, list) or len(role_names) == 0:
        raise ValidationError("At least one role must be specified")
    
    user_service = UserService(tenant_id)
    
    try:
        user = user_service.assign_roles(user_id, role_names)
    except ValueError as e:
        raise NotFoundError(str(e))
    
    logger.info(f"Roles {role_names} assigned to user {user_id} in tenant {tenant_id}")
    
    return jsonify({"user": user.to_dict()})


@api_v1_bp.route("/users/<user_id>/password", methods=["POST"])
@jwt_required()
@require_tenant_context
def change_user_password(user_id: str):
    """
    Change user password.
    
    Users can change their own password (requires current password).
    Admins can reset any user's password.
    
    Args:
        user_id: User UUID
    
    Request Body:
        - current_password: Current password (required for self-change)
        - new_password: New password
    
    Returns:
        Success message
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    current_user_id = identity.get("user_id")
    roles = identity.get("roles", [])
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    is_admin = any(r in roles for r in ["tenant_admin", "user_manager"])
    is_self = user_id == current_user_id
    
    if not is_admin and not is_self:
        raise NotFoundError("User not found")
    
    new_password = data.get("new_password")
    if not new_password:
        raise ValidationError("'new_password' is required")
    
    user_service = UserService(tenant_id)
    
    if is_self and not is_admin:
        # Self-change requires current password
        current_password = data.get("current_password")
        if not current_password:
            raise ValidationError("'current_password' is required")
        
        try:
            user_service.change_password(user_id, current_password, new_password)
        except ValueError as e:
            raise ValidationError(str(e))
    else:
        # Admin reset - no current password needed
        try:
            user_service.update_user(user_id, password=new_password)
        except ValueError as e:
            raise ValidationError(str(e))
    
    logger.info(f"Password changed for user {user_id} in tenant {tenant_id}")
    
    return jsonify({"message": "Password changed successfully"})
