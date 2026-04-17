"""
NovaSight Tenants Domain — Tenant Routes
==========================================

Canonical location: ``app.domains.tenants.api.tenant_routes``

Merges endpoints from:
 * ``api/v1/tenants.py``  (regular tenant management)
 * ``api/v1/admin/tenants.py``  (admin tenant management)

Regular endpoints use ``@require_roles`` for tenant_admin / super_admin.
Admin endpoints (under ``/admin/tenants``) use ``@require_permission``
for fine-grained access control.
"""

import logging

from flask import request, jsonify
from marshmallow import ValidationError as MarshmallowValidationError

from app.api.v1 import api_v1_bp
from app.api.v1.admin import admin_bp
from app.domains.tenants.application.tenant_service import TenantService
from app.platform.auth.jwt_handler import get_jwt_identity_dict
from app.platform.auth.decorators import authenticated, require_roles
from app.platform.errors.exceptions import ValidationError, NotFoundError

logger = logging.getLogger(__name__)


# =====================================================================
# Regular tenant endpoints  (on api_v1_bp: /api/v1/tenants)
# =====================================================================


@api_v1_bp.route("/tenants", methods=["GET"])
@authenticated
@require_roles("super_admin")
def list_tenants():
    """List all tenants (super_admin only)."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")

    svc = TenantService()
    result = svc.list_tenants(page=page, per_page=per_page, status=status)
    return jsonify(result)


@api_v1_bp.route("/tenants", methods=["POST"])
@authenticated
@require_roles("super_admin")
def create_tenant():
    """Create a new tenant (super_admin only)."""
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")

    for field in ("name", "slug"):
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")

    svc = TenantService()

    try:
        tenant = svc.create_tenant(
            name=data["name"],
            slug=data["slug"],
            plan=data.get("plan", "basic"),
            settings=data.get("settings", {}),
        )
    except ValueError as e:
        raise ValidationError(str(e))

    logger.info(
        "Tenant '%s' created with slug '%s'", data["name"], data["slug"]
    )
    return jsonify({"tenant": tenant.to_dict()}), 201


@api_v1_bp.route("/tenants/<tenant_id>", methods=["GET"])
@authenticated
@require_roles("super_admin", "tenant_admin")
def get_tenant(tenant_id: str):
    """Get tenant details. Tenant admins may only view their own."""
    identity = get_jwt_identity_dict()

    if "super_admin" not in identity.get("roles", []):
        if identity.get("tenant_id") != tenant_id:
            raise NotFoundError("Tenant not found")

    svc = TenantService()
    tenant = svc.get_tenant(tenant_id)

    if not tenant:
        raise NotFoundError("Tenant not found")

    return jsonify({"tenant": tenant.to_dict()})


@api_v1_bp.route("/tenants/<tenant_id>", methods=["PATCH"])
@authenticated
@require_roles("super_admin", "tenant_admin")
def update_tenant(tenant_id: str):
    """Update tenant settings. Non-super_admins cannot change status."""
    identity = get_jwt_identity_dict()
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    if "super_admin" not in identity.get("roles", []):
        if identity.get("tenant_id") != tenant_id:
            raise NotFoundError("Tenant not found")
        data.pop("status", None)

    svc = TenantService()
    tenant = svc.update_tenant(tenant_id, **data)

    if not tenant:
        raise NotFoundError("Tenant not found")

    logger.info("Tenant %s updated", tenant_id)
    return jsonify({"tenant": tenant.to_dict()})


@api_v1_bp.route("/tenants/current/database", methods=["GET"])
@authenticated
def get_current_tenant_database():
    """
    Get the current tenant's database configuration.
    
    Returns database names for ClickHouse (analytics) and PostgreSQL (metadata).
    This endpoint is useful for configuring PySpark apps and dbt models.
    """
    identity = get_jwt_identity_dict()
    tenant_id = identity.get("tenant_id")
    
    if not tenant_id:
        raise NotFoundError("No tenant context")
    
    svc = TenantService()
    tenant = svc.get_tenant(tenant_id)
    
    if not tenant:
        raise NotFoundError("Tenant not found")
    
    from app.platform.tenant.isolation import TenantIsolationService
    isolation = TenantIsolationService(tenant_id, tenant.slug)
    
    return jsonify({
        "tenant_id": tenant_id,
        "tenant_slug": tenant.slug,
        "clickhouse_database": isolation.tenant_database,
        "postgresql_schema": isolation.tenant_schema,
        "dbt_folder": isolation.tenant_dbt_folder,
        "dag_folder": isolation.tenant_dag_folder,
    })


# =====================================================================
# Admin tenant endpoints  (on admin_bp: /api/v1/admin/tenants)
# =====================================================================


def _require_permission(perm: str):
    """Lazy-import permission decorator to avoid circular imports."""
    from app.platform.auth.decorators import require_permission

    return require_permission(perm)


@admin_bp.route("/tenants", methods=["GET"])
@authenticated
@_require_permission("admin.tenants.view")
def admin_list_tenants():
    """List all tenants with pagination and filtering (admin)."""
    from app.domains.tenants.schemas.tenant_schemas import TenantListSchema

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search")
    status = request.args.get("status")

    svc = TenantService()
    result = svc.list_tenants(
        page=page, per_page=per_page, search=search, status=status
    )

    response = {
        "items": result["tenants"],
        "total": result["pagination"]["total"],
        "page": result["pagination"]["page"],
        "per_page": result["pagination"]["per_page"],
        "pages": result["pagination"]["pages"],
    }
    return jsonify(TenantListSchema().dump(response))


@admin_bp.route("/tenants", methods=["POST"])
@authenticated
@_require_permission("admin.tenants.create")
def admin_create_tenant():
    """Create a new tenant with full provisioning (admin)."""
    from app.domains.tenants.schemas.tenant_schemas import (
        TenantCreateSchema,
        TenantSchema,
    )

    try:
        data = TenantCreateSchema().load(request.get_json() or {})
    except MarshmallowValidationError as e:
        raise ValidationError(str(e.messages))

    svc = TenantService()
    try:
        tenant = svc.create_tenant(
            name=data["name"],
            slug=data["slug"],
            plan=data.get("plan", "basic"),
            settings=data.get("settings", {}),
            provision_resources=True,
        )
    except ValueError as e:
        raise ValidationError(str(e))

    logger.info(
        "Tenant '%s' created with slug '%s'", data["name"], data["slug"]
    )
    return jsonify({
        "tenant": TenantSchema().dump(tenant.to_dict()),
        "message": "Tenant created and provisioned successfully",
    }), 201


@admin_bp.route("/tenants/<uuid:tenant_id>", methods=["GET"])
@authenticated
@_require_permission("admin.tenants.view")
def admin_get_tenant(tenant_id):
    """Get tenant details by ID (admin)."""
    from app.domains.tenants.schemas.tenant_schemas import TenantSchema

    svc = TenantService()
    tenant = svc.get_tenant(str(tenant_id))

    if not tenant:
        raise NotFoundError("Tenant not found")

    return jsonify({
        "tenant": TenantSchema().dump(tenant.to_dict(include_settings=True))
    })


@admin_bp.route("/tenants/<uuid:tenant_id>", methods=["PUT"])
@authenticated
@_require_permission("admin.tenants.edit")
def admin_update_tenant(tenant_id):
    """Update tenant configuration (admin)."""
    from app.domains.tenants.schemas.tenant_schemas import (
        TenantUpdateSchema,
        TenantSchema,
    )

    try:
        data = TenantUpdateSchema().load(request.get_json() or {})
    except MarshmallowValidationError as e:
        raise ValidationError(str(e.messages))

    if not data:
        raise ValidationError("No update data provided")

    svc = TenantService()
    tenant = svc.update_tenant(str(tenant_id), **data)

    if not tenant:
        raise NotFoundError("Tenant not found")

    logger.info("Tenant %s updated", tenant_id)
    return jsonify({"tenant": TenantSchema().dump(tenant.to_dict())})


@admin_bp.route("/tenants/<uuid:tenant_id>", methods=["DELETE"])
@authenticated
@_require_permission("admin.tenants.delete")
def admin_deactivate_tenant(tenant_id):
    """
    Deactivate (archive) or permanently delete a tenant.
    
    Query Parameters:
        - hard_delete: If "true", permanently delete tenant and all resources
        - force: If "true" (with hard_delete), drop databases even with data
    """
    from app.domains.tenants.schemas.tenant_schemas import TenantSchema

    hard_delete = request.args.get("hard_delete", "false").lower() == "true"
    force = request.args.get("force", "false").lower() == "true"

    svc = TenantService()
    
    if hard_delete:
        try:
            result = svc.delete_tenant(str(tenant_id), hard_delete=True, force=force)
        except ValueError as e:
            raise ValidationError(str(e))
        
        if not result:
            raise NotFoundError("Tenant not found")
        
        return jsonify({
            "message": "Tenant permanently deleted with all resources",
            "deleted": True,
        })
    else:
        tenant = svc.delete_tenant(str(tenant_id))

        if not tenant:
            raise NotFoundError("Tenant not found")

        # delete_tenant returns bool; re-fetch for serialisation
        tenant_obj = svc.get_tenant(str(tenant_id))

        return jsonify({
            "tenant": TenantSchema().dump(
                tenant_obj.to_dict() if tenant_obj else {}
            ),
            "message": "Tenant deactivated successfully",
        })


@admin_bp.route("/tenants/<uuid:tenant_id>/usage", methods=["GET"])
@authenticated
@_require_permission("admin.tenants.view")
def admin_get_tenant_usage(tenant_id):
    """Get tenant usage statistics (admin)."""
    from app.domains.tenants.schemas.tenant_schemas import TenantUsageSchema

    svc = TenantService()
    tenant = svc.get_tenant(str(tenant_id))

    if not tenant:
        raise NotFoundError("Tenant not found")

    usage = svc.get_usage(str(tenant_id))
    return jsonify({
        "tenant_id": str(tenant_id),
        "usage": TenantUsageSchema().dump(usage),
    })


@admin_bp.route("/tenants/<uuid:tenant_id>/activate", methods=["POST"])
@authenticated
@_require_permission("admin.tenants.edit")
def admin_activate_tenant(tenant_id):
    """Activate a suspended/pending tenant (admin)."""
    from app.domains.tenants.schemas.tenant_schemas import TenantSchema

    svc = TenantService()
    tenant = svc.activate_tenant(str(tenant_id))

    if not tenant:
        raise NotFoundError("Tenant not found")

    logger.info("Tenant %s activated", tenant_id)
    return jsonify({
        "tenant": TenantSchema().dump(tenant.to_dict()),
        "message": "Tenant activated successfully",
    })


@admin_bp.route("/tenants/<uuid:tenant_id>/database", methods=["GET"])
@authenticated
@_require_permission("admin.tenants.view")
def admin_get_tenant_database_info(tenant_id):
    """
    Get tenant's ClickHouse database information.
    
    Returns the database name, existence status, and basic stats.
    """
    from app.domains.tenants.infrastructure.provisioning import ProvisioningService
    
    svc = TenantService()
    tenant = svc.get_tenant(str(tenant_id))

    if not tenant:
        raise NotFoundError("Tenant not found")

    provisioning = ProvisioningService()
    db_name = provisioning.get_tenant_database_name(tenant)
    exists = provisioning.database_exists(tenant)
    
    result = {
        "tenant_id": str(tenant_id),
        "tenant_slug": tenant.slug,
        "database_name": db_name,
        "database_exists": exists,
        "postgresql_schema": f"tenant_{tenant.slug}",
    }
    
    # If database exists, try to get stats
    if exists:
        try:
            usage = svc.get_usage(str(tenant_id))
            result["storage_gb"] = usage.get("storage_gb", 0)
        except Exception:
            result["storage_gb"] = None
    
    return jsonify(result)


@admin_bp.route("/tenants/<uuid:tenant_id>/suspend", methods=["POST"])
@authenticated
@_require_permission("admin.tenants.edit")
def admin_suspend_tenant(tenant_id):
    """Suspend a tenant temporarily (admin)."""
    from app.domains.tenants.schemas.tenant_schemas import TenantSchema

    data = request.get_json() or {}
    reason = data.get("reason")

    svc = TenantService()
    tenant = svc.suspend_tenant(str(tenant_id), reason=reason)

    if not tenant:
        raise NotFoundError("Tenant not found")

    logger.info("Tenant %s suspended. Reason: %s", tenant_id, reason)
    return jsonify({
        "tenant": TenantSchema().dump(tenant.to_dict()),
        "message": "Tenant suspended successfully",
    })
