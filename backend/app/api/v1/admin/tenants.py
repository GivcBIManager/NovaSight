"""
NovaSight Admin Tenant Management API
=====================================

Platform-level tenant management endpoints for super admins.
Provides CRUD operations, usage statistics, and provisioning.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required
from app.api.v1.admin import admin_bp
from app.services.tenant_service import TenantService
from app.middleware.permissions import require_permission
from app.schemas.tenant_schemas import (
    TenantSchema,
    TenantCreateSchema,
    TenantUpdateSchema,
    TenantListSchema,
    TenantUsageSchema,
)
from app.errors import ValidationError, NotFoundError
from marshmallow import ValidationError as MarshmallowValidationError
import logging

logger = logging.getLogger(__name__)


@admin_bp.route('/tenants', methods=['GET'])
@jwt_required()
@require_permission('admin.tenants.view')
def list_tenants():
    """
    List all tenants with pagination and filtering.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
        - search: Search by name or slug
        - status: Filter by status (active, suspended, pending, archived)
    
    Returns:
        Paginated list of tenants
    """
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search')
    status = request.args.get('status')
    
    tenant_service = TenantService()
    result = tenant_service.list_tenants(
        page=page,
        per_page=per_page,
        search=search,
        status=status
    )
    
    # Transform to schema format
    response = {
        'items': result['tenants'],
        'total': result['pagination']['total'],
        'page': result['pagination']['page'],
        'per_page': result['pagination']['per_page'],
        'pages': result['pagination']['pages'],
    }
    
    return jsonify(TenantListSchema().dump(response))


@admin_bp.route('/tenants', methods=['POST'])
@jwt_required()
@require_permission('admin.tenants.create')
def create_tenant():
    """
    Create a new tenant with full provisioning.
    
    Creates tenant record, PostgreSQL schema, and ClickHouse database.
    
    Request Body:
        - name: Tenant display name (required)
        - slug: Unique identifier (required, lowercase, alphanumeric with hyphens)
        - plan: Subscription plan (basic, professional, enterprise)
        - settings: Optional tenant settings
    
    Returns:
        Created tenant details with provisioning status
    """
    try:
        data = TenantCreateSchema().load(request.get_json() or {})
    except MarshmallowValidationError as e:
        raise ValidationError(str(e.messages))
    
    tenant_service = TenantService()
    
    try:
        tenant = tenant_service.create_tenant(
            name=data['name'],
            slug=data['slug'],
            plan=data.get('plan', 'basic'),
            settings=data.get('settings', {}),
            provision_resources=True  # Enable full provisioning
        )
    except ValueError as e:
        raise ValidationError(str(e))
    
    logger.info(f"Tenant '{data['name']}' created with slug '{data['slug']}'")
    
    return jsonify({
        'tenant': TenantSchema().dump(tenant.to_dict()),
        'message': 'Tenant created and provisioned successfully'
    }), 201


@admin_bp.route('/tenants/<uuid:tenant_id>', methods=['GET'])
@jwt_required()
@require_permission('admin.tenants.view')
def get_tenant(tenant_id):
    """
    Get tenant details by ID.
    
    Args:
        tenant_id: Tenant UUID
    
    Returns:
        Tenant details including settings
    """
    tenant_service = TenantService()
    tenant = tenant_service.get_tenant(str(tenant_id))
    
    if not tenant:
        raise NotFoundError('Tenant not found')
    
    return jsonify({
        'tenant': TenantSchema().dump(tenant.to_dict(include_settings=True))
    })


@admin_bp.route('/tenants/<uuid:tenant_id>', methods=['PUT'])
@jwt_required()
@require_permission('admin.tenants.edit')
def update_tenant(tenant_id):
    """
    Update tenant configuration.
    
    Args:
        tenant_id: Tenant UUID
    
    Request Body:
        - name: Tenant display name
        - plan: Subscription plan
        - settings: Tenant settings (merged with existing)
        - status: Tenant status
    
    Returns:
        Updated tenant details
    """
    try:
        data = TenantUpdateSchema().load(request.get_json() or {})
    except MarshmallowValidationError as e:
        raise ValidationError(str(e.messages))
    
    if not data:
        raise ValidationError('No update data provided')
    
    tenant_service = TenantService()
    tenant = tenant_service.update_tenant(str(tenant_id), **data)
    
    if not tenant:
        raise NotFoundError('Tenant not found')
    
    logger.info(f"Tenant {tenant_id} updated")
    
    return jsonify({
        'tenant': TenantSchema().dump(tenant.to_dict())
    })


@admin_bp.route('/tenants/<uuid:tenant_id>', methods=['DELETE'])
@jwt_required()
@require_permission('admin.tenants.delete')
def deactivate_tenant(tenant_id):
    """
    Deactivate a tenant (soft delete).
    
    Sets tenant status to 'archived'. Does not delete data.
    Use this for temporary suspension or before full deletion.
    
    Args:
        tenant_id: Tenant UUID
    
    Returns:
        Deactivated tenant details
    """
    tenant_service = TenantService()
    tenant = tenant_service.deactivate_tenant(str(tenant_id))
    
    if not tenant:
        raise NotFoundError('Tenant not found')
    
    logger.info(f"Tenant {tenant_id} deactivated")
    
    return jsonify({
        'tenant': TenantSchema().dump(tenant.to_dict()),
        'message': 'Tenant deactivated successfully'
    })


@admin_bp.route('/tenants/<uuid:tenant_id>/usage', methods=['GET'])
@jwt_required()
@require_permission('admin.tenants.view')
def get_tenant_usage(tenant_id):
    """
    Get tenant usage statistics.
    
    Returns storage usage, user counts, and activity metrics.
    
    Args:
        tenant_id: Tenant UUID
    
    Returns:
        Usage statistics for the tenant
    """
    tenant_service = TenantService()
    
    # Verify tenant exists
    tenant = tenant_service.get_tenant(str(tenant_id))
    if not tenant:
        raise NotFoundError('Tenant not found')
    
    usage = tenant_service.get_usage(str(tenant_id))
    
    return jsonify({
        'tenant_id': str(tenant_id),
        'usage': TenantUsageSchema().dump(usage)
    })


@admin_bp.route('/tenants/<uuid:tenant_id>/activate', methods=['POST'])
@jwt_required()
@require_permission('admin.tenants.edit')
def activate_tenant(tenant_id):
    """
    Activate a suspended or pending tenant.
    
    Args:
        tenant_id: Tenant UUID
    
    Returns:
        Activated tenant details
    """
    tenant_service = TenantService()
    tenant = tenant_service.activate_tenant(str(tenant_id))
    
    if not tenant:
        raise NotFoundError('Tenant not found')
    
    logger.info(f"Tenant {tenant_id} activated")
    
    return jsonify({
        'tenant': TenantSchema().dump(tenant.to_dict()),
        'message': 'Tenant activated successfully'
    })


@admin_bp.route('/tenants/<uuid:tenant_id>/suspend', methods=['POST'])
@jwt_required()
@require_permission('admin.tenants.edit')
def suspend_tenant(tenant_id):
    """
    Suspend a tenant temporarily.
    
    Suspends tenant access without deleting data.
    
    Args:
        tenant_id: Tenant UUID
    
    Request Body:
        - reason: Optional reason for suspension
    
    Returns:
        Suspended tenant details
    """
    data = request.get_json() or {}
    reason = data.get('reason')
    
    tenant_service = TenantService()
    tenant = tenant_service.suspend_tenant(str(tenant_id), reason=reason)
    
    if not tenant:
        raise NotFoundError('Tenant not found')
    
    logger.info(f"Tenant {tenant_id} suspended. Reason: {reason}")
    
    return jsonify({
        'tenant': TenantSchema().dump(tenant.to_dict()),
        'message': 'Tenant suspended successfully'
    })
