"""
NovaSight Portal Admin User Management API
===========================================

Platform-level user management endpoints for super admins.
Cross-tenant user visibility and management.
"""

from flask import request, jsonify, g
from flask_jwt_extended import jwt_required
from app.api.v1.admin import admin_bp
from app.middleware.permissions import require_permission
from app.extensions import db
from app.models.user import User, Role
from app.models.tenant import Tenant
from app.services.user_service import UserService
from app.errors import ValidationError, NotFoundError
from sqlalchemy import or_, func
import logging

logger = logging.getLogger(__name__)


@admin_bp.route('/portal/users', methods=['GET'])
@jwt_required()
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
    search = request.args.get('search')
    tenant_id = request.args.get('tenant_id')
    role = request.args.get('role')
    status = request.args.get('status')
    
    try:
        query = db.session.query(User).join(Tenant, User.tenant_id == Tenant.id)
        
        if search:
            query = query.filter(
                or_(
                    User.email.ilike(f'%{search}%'),
                    User.name.ilike(f'%{search}%')
                )
            )
        
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        
        if role:
            query = query.join(User.roles).filter(Role.name == role)
        
        if status:
            query = query.filter(User.status == status)
        
        total = query.count()
        users = query.order_by(User.created_at.desc()).offset(
            (page - 1) * per_page
        ).limit(per_page).all()
        
        items = []
        for user in users:
            user_dict = user.to_dict(include_roles=True)
            # Add tenant info
            if user.tenant:
                user_dict['tenant_name'] = user.tenant.name
                user_dict['tenant_slug'] = user.tenant.slug
            items.append(user_dict)
        
        return jsonify({
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page,
        })
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
@jwt_required()
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

    # Validate tenant exists
    tenant = db.session.get(Tenant, data['tenant_id'])
    if not tenant:
        raise NotFoundError(f"Tenant not found")

    try:
        user_service = UserService(data['tenant_id'])
        user = user_service.create_user(
            email=data['email'],
            name=data['name'],
            password=data['password'],
            role_names=data.get('roles', ['viewer']),
        )

        user_dict = user.to_dict(include_roles=True)
        user_dict['tenant_name'] = tenant.name
        user_dict['tenant_slug'] = tenant.slug

        logger.info(f"Portal admin created user '{data['email']}' in tenant {tenant.name}")

        return jsonify({'user': user_dict, 'message': 'User created successfully'}), 201
    except ValueError as e:
        raise ValidationError(str(e))


@admin_bp.route('/portal/users/<user_id>', methods=['GET'])
@jwt_required()
@require_permission('admin.tenants.view')
def portal_get_user(user_id):
    """Get a specific user by ID (cross-tenant)."""
    user = db.session.get(User, user_id)
    if not user:
        raise NotFoundError('User not found')
    
    user_dict = user.to_dict(include_roles=True)
    if user.tenant:
        user_dict['tenant_name'] = user.tenant.name
        user_dict['tenant_slug'] = user.tenant.slug
    
    return jsonify({'user': user_dict})


@admin_bp.route('/portal/users/<user_id>/status', methods=['PATCH'])
@jwt_required()
@require_permission('admin.tenants.edit')
def portal_update_user_status(user_id):
    """
    Update user status (activate, deactivate, lock).
    
    Request Body:
        - status: New status (active, inactive, locked)
    """
    user = db.session.get(User, user_id)
    if not user:
        raise NotFoundError('User not found')
    
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['active', 'inactive', 'locked']:
        raise ValidationError("Status must be one of: active, inactive, locked")
    
    user.status = new_status
    db.session.commit()
    
    logger.info(f"Portal admin updated user {user_id} status to {new_status}")
    
    return jsonify({
        'user': user.to_dict(include_roles=True),
        'message': f'User status updated to {new_status}'
    })


@admin_bp.route('/portal/users/<user_id>', methods=['DELETE'])
@jwt_required()
@require_permission('admin.tenants.delete')
def portal_delete_user(user_id):
    """Deactivate a user (soft delete) from portal admin."""
    current_user = g.get('current_user')
    if current_user and str(current_user.id) == user_id:
        raise ValidationError("Cannot deactivate your own account")
    
    user = db.session.get(User, user_id)
    if not user:
        raise NotFoundError('User not found')
    
    user.status = 'inactive'
    db.session.commit()
    
    logger.info(f"Portal admin deactivated user {user_id}")
    
    return jsonify({'message': 'User deactivated successfully'})


@admin_bp.route('/portal/stats', methods=['GET'])
@jwt_required()
@require_permission('admin.tenants.view')
def portal_stats():
    """
    Get portal-wide statistics for the admin dashboard.
    
    Returns:
        Summary statistics across all tenants
    """
    try:
        total_tenants = db.session.query(func.count(Tenant.id)).scalar() or 0
        active_tenants = db.session.query(func.count(Tenant.id)).filter(
            Tenant.status == 'active'
        ).scalar() or 0
        total_users = db.session.query(func.count(User.id)).scalar() or 0
        active_users = db.session.query(func.count(User.id)).filter(
            User.status == 'active'
        ).scalar() or 0
        
        # Users by tenant
        users_by_tenant = db.session.query(
            Tenant.name,
            Tenant.slug,
            func.count(User.id).label('user_count')
        ).outerjoin(User, User.tenant_id == Tenant.id).group_by(
            Tenant.id, Tenant.name, Tenant.slug
        ).all()
        
        # Users by role
        users_by_role = db.session.query(
            Role.name,
            Role.display_name,
            func.count(User.id).label('user_count')
        ).join(User.roles).group_by(
            Role.id, Role.name, Role.display_name
        ).all()
        
        return jsonify({
            'tenants': {
                'total': total_tenants,
                'active': active_tenants,
            },
            'users': {
                'total': total_users,
                'active': active_users,
            },
            'users_by_tenant': [
                {'name': t.name, 'slug': t.slug, 'count': t.user_count}
                for t in users_by_tenant
            ],
            'users_by_role': [
                {'name': r.name, 'display_name': r.display_name, 'count': r.user_count}
                for r in users_by_role
            ],
        })
    except Exception as e:
        logger.error(f"Error getting portal stats: {e}")
        return jsonify({
            'tenants': {'total': 0, 'active': 0},
            'users': {'total': 0, 'active': 0},
            'users_by_tenant': [],
            'users_by_role': [],
        })
