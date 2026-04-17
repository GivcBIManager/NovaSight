"""
NovaSight Portal Admin User Management API
===========================================

Platform-level user management endpoints for super admins.
Cross-tenant user visibility and management.
"""

from flask import request, jsonify
from app.api.v1.admin import admin_bp
from app.platform.auth.decorators import authenticated, require_permission
from app.platform.auth.identity import get_current_identity
from app.domains.identity.application.portal_user_service import portal_user_service
from app.errors import ValidationError, NotFoundError
import logging

logger = logging.getLogger(__name__)


@admin_bp.route('/portal/users', methods=['GET'])
@authenticated
@require_permission('admin.tenants.view')
def portal_list_users():
    """
    List all users across all tenants for portal admin.

    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
        - search: Search by email or name
        - tenant_id: Filter by tenant ID
        - role: Filter by role name
        - status: Filter by status

    Returns:
        Paginated list of users with tenant info
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    try:
        result = portal_user_service.list_users(
            page=page,
            per_page=per_page,
            search=request.args.get('search'),
            tenant_id=request.args.get('tenant_id'),
            role=request.args.get('role'),
            status=request.args.get('status'),
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error listing portal users: {e}")
        return jsonify({
            'items': [],
            'total': 0,
            'page': 1,
            'per_page': per_page,
            'pages': 0,
        })


@admin_bp.route('/portal/users', methods=['POST'])
@authenticated
@require_permission('admin.tenants.edit')
def portal_create_user():
    """
    Create a new user from the portal admin (cross-tenant).

    Request Body:
        - email: User email address
        - name: User display name
        - password: Initial password
        - tenant_id: Tenant UUID to assign the user to
        - roles: List of role names to assign (optional, defaults to ["viewer"])

    Returns:
        Created user details
    """
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")

    required_fields = ["email", "name", "password", "tenant_id"]
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")

    try:
        user_dict = portal_user_service.create_user(
            email=data['email'],
            name=data['name'],
            password=data['password'],
            tenant_id=data['tenant_id'],
            roles=data.get('roles', ['viewer']),
        )
        return jsonify({'user': user_dict, 'message': 'User created successfully'}), 201
    except ValueError as e:
        if "not found" in str(e).lower():
            raise NotFoundError(str(e))
        raise ValidationError(str(e))


@admin_bp.route('/portal/users/<user_id>', methods=['GET'])
@authenticated
@require_permission('admin.tenants.view')
def portal_get_user(user_id):
    """Get a specific user by ID (cross-tenant)."""
    user_dict = portal_user_service.get_user(user_id)
    if not user_dict:
        raise NotFoundError('User not found')
    return jsonify({'user': user_dict})


@admin_bp.route('/portal/users/<user_id>/status', methods=['PATCH'])
@authenticated
@require_permission('admin.tenants.edit')
def portal_update_user_status(user_id):
    """
    Update user status (activate, deactivate, lock).

    Request Body:
        - status: New status (active, inactive, locked)
    """
    data = request.get_json() or {}
    new_status = data.get('status')

    try:
        user_dict = portal_user_service.update_user_status(user_id, new_status)
    except ValueError as e:
        raise ValidationError(str(e))

    if not user_dict:
        raise NotFoundError('User not found')

    return jsonify({
        'user': user_dict,
        'message': f'User status updated to {new_status}',
    })


@admin_bp.route('/portal/users/<user_id>', methods=['DELETE'])
@authenticated
@require_permission('admin.tenants.delete')
def portal_delete_user(user_id):
    """Deactivate a user (soft delete) from portal admin."""
    identity = get_current_identity()
    current_user_id = identity.user_id if identity else None

    try:
        deleted = portal_user_service.deactivate_user(user_id, current_user_id)
    except ValueError as e:
        raise ValidationError(str(e))

    if not deleted:
        raise NotFoundError('User not found')

    return jsonify({'message': 'User deactivated successfully'})


@admin_bp.route('/portal/stats', methods=['GET'])
@authenticated
@require_permission('admin.tenants.view')
def portal_stats():
    """
    Get portal-wide statistics for the admin dashboard.

    Returns:
        Summary statistics across all tenants
    """
    try:
        return jsonify(portal_user_service.get_stats())
    except Exception as e:
        logger.error(f"Error getting portal stats: {e}")
        return jsonify({
            'tenants': {'total': 0, 'active': 0},
            'users': {'total': 0, 'active': 0},
            'users_by_tenant': [],
            'users_by_role': [],
        })
