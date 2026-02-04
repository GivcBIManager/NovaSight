"""
Admin API Namespace
====================

Flask-RESTX namespace for administration endpoint documentation.
"""

from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from app.middleware.jwt_handlers import get_jwt_identity_dict
from app.decorators import require_tenant_context, require_roles
import logging

logger = logging.getLogger(__name__)

ns = Namespace(
    'admin',
    description='Platform administration - tenants, users, roles, and audit',
    decorators=[jwt_required()]
)

# Define models
tenant_create = ns.model('TenantCreate', {
    'name': fields.String(required=True, description='Tenant name', example='Acme Corporation'),
    'slug': fields.String(required=True, description='URL-safe identifier', example='acme-corp'),
    'plan': fields.String(
        enum=['free', 'starter', 'professional', 'enterprise'],
        description='Subscription plan',
        example='professional'
    ),
    'settings': fields.Raw(description='Tenant settings'),
})

tenant_update = ns.model('TenantUpdate', {
    'name': fields.String(description='Tenant name'),
    'plan': fields.String(enum=['free', 'starter', 'professional', 'enterprise']),
    'is_active': fields.Boolean(description='Tenant active status'),
    'settings': fields.Raw(description='Tenant settings'),
})

tenant_response = ns.model('Tenant', {
    'id': fields.String(description='Tenant UUID'),
    'name': fields.String(),
    'slug': fields.String(),
    'plan': fields.String(),
    'is_active': fields.Boolean(),
    'settings': fields.Raw(),
    'user_count': fields.Integer(),
    'created_at': fields.DateTime(),
    'updated_at': fields.DateTime(),
})

quota_response = ns.model('TenantQuota', {
    'plan': fields.String(),
    'limits': fields.Raw(description='Plan limits'),
    'usage': fields.Raw(description='Current usage'),
    'remaining': fields.Raw(description='Remaining quota'),
})

user_create = ns.model('UserCreate', {
    'email': fields.String(required=True, description='User email', example='user@example.com'),
    'name': fields.String(required=True, description='User name', example='John Doe'),
    'password': fields.String(required=True, description='Initial password'),
    'role_ids': fields.List(fields.String, description='Role UUIDs to assign'),
})

user_update = ns.model('UserUpdate', {
    'name': fields.String(description='User name'),
    'is_active': fields.Boolean(description='User active status'),
    'role_ids': fields.List(fields.String, description='Role UUIDs to assign'),
})

user_response = ns.model('User', {
    'id': fields.String(description='User UUID'),
    'email': fields.String(),
    'name': fields.String(),
    'is_active': fields.Boolean(),
    'roles': fields.List(fields.String),
    'tenant_id': fields.String(),
    'last_login_at': fields.DateTime(),
    'created_at': fields.DateTime(),
})

role_create = ns.model('RoleCreate', {
    'name': fields.String(required=True, description='Role name', example='analyst'),
    'description': fields.String(description='Role description'),
    'permissions': fields.List(fields.String, description='Permission strings'),
})

role_response = ns.model('Role', {
    'id': fields.String(description='Role UUID'),
    'name': fields.String(),
    'description': fields.String(),
    'permissions': fields.List(fields.String),
    'is_system': fields.Boolean(description='System-defined role (cannot be modified)'),
    'user_count': fields.Integer(description='Number of users with this role'),
    'created_at': fields.DateTime(),
})

audit_log = ns.model('AuditLog', {
    'id': fields.String(description='Audit log UUID'),
    'action': fields.String(description='Action performed'),
    'resource_type': fields.String(description='Type of resource'),
    'resource_id': fields.String(description='Resource UUID'),
    'user_id': fields.String(description='User who performed action'),
    'user_email': fields.String(description='User email'),
    'details': fields.Raw(description='Action details'),
    'ip_address': fields.String(description='Client IP address'),
    'created_at': fields.DateTime(description='Timestamp'),
})

audit_response = ns.model('AuditResponse', {
    'logs': fields.List(fields.Nested(audit_log)),
    'pagination': fields.Raw(),
})

error_response = ns.model('ErrorResponse', {
    'success': fields.Boolean(default=False),
    'message': fields.String(),
    'code': fields.String(),
})


# =============================================================================
# Tenant Management
# =============================================================================

@ns.route('/tenants')
class TenantList(Resource):
    @ns.doc('list_tenants', security='Bearer')
    @ns.param('page', 'Page number', type=int, default=1)
    @ns.param('per_page', 'Items per page', type=int, default=20)
    @ns.param('search', 'Search by name or slug', type=str)
    @ns.param('plan', 'Filter by plan', type=str)
    @ns.marshal_list_with(tenant_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden - Super Admin only', error_response)
    @require_roles(['super_admin'])
    def get(self):
        """
        List all tenants.
        
        Returns a paginated list of all tenants in the platform.
        
        **Permissions Required:** `super_admin` role
        """
        from app.services.tenant_service import TenantService
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search')
        plan = request.args.get('plan')
        
        result = TenantService.list_tenants(
            page=page,
            per_page=per_page,
            search=search,
            plan=plan,
        )
        
        return result
    
    @ns.doc('create_tenant', security='Bearer')
    @ns.expect(tenant_create, validate=True)
    @ns.marshal_with(tenant_response, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(409, 'Tenant slug already exists', error_response)
    @require_roles(['super_admin'])
    def post(self):
        """
        Create a new tenant.
        
        Creates a new tenant organization with the specified plan.
        The slug must be unique and URL-safe.
        
        **Permissions Required:** `super_admin` role
        """
        from app.services.tenant_service import TenantService
        
        data = request.json
        
        tenant = TenantService.create_tenant(
            name=data['name'],
            slug=data['slug'],
            plan=data.get('plan', 'free'),
            settings=data.get('settings', {}),
        )
        
        return tenant.to_dict(), 201


@ns.route('/tenants/<uuid:tenant_id>')
@ns.param('tenant_id', 'Tenant UUID')
class TenantDetail(Resource):
    @ns.doc('get_tenant', security='Bearer')
    @ns.marshal_with(tenant_response)
    @ns.response(404, 'Tenant not found', error_response)
    @require_roles(['super_admin'])
    def get(self, tenant_id):
        """
        Get tenant details.
        
        **Permissions Required:** `super_admin` role
        """
        from app.services.tenant_service import TenantService
        
        tenant = TenantService.get_tenant(str(tenant_id))
        if not tenant:
            return {'error': 'Tenant not found'}, 404
        
        return tenant.to_dict()
    
    @ns.doc('update_tenant', security='Bearer')
    @ns.expect(tenant_update)
    @ns.marshal_with(tenant_response)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(404, 'Tenant not found', error_response)
    @require_roles(['super_admin'])
    def patch(self, tenant_id):
        """
        Update tenant details.
        
        **Permissions Required:** `super_admin` role
        """
        from app.services.tenant_service import TenantService
        
        data = request.json
        
        tenant = TenantService.update_tenant(str(tenant_id), **data)
        if not tenant:
            return {'error': 'Tenant not found'}, 404
        
        return tenant.to_dict()
    
    @ns.doc('delete_tenant', security='Bearer')
    @ns.response(204, 'Tenant deleted')
    @ns.response(404, 'Tenant not found', error_response)
    @require_roles(['super_admin'])
    def delete(self, tenant_id):
        """
        Delete a tenant.
        
        **Warning:** This permanently deletes the tenant and ALL associated data:
        - All users
        - All data connections
        - All semantic models
        - All dashboards
        - All audit logs
        
        This action cannot be undone.
        
        **Permissions Required:** `super_admin` role
        """
        from app.services.tenant_service import TenantService
        
        success = TenantService.delete_tenant(str(tenant_id))
        if not success:
            return {'error': 'Tenant not found'}, 404
        
        return '', 204


@ns.route('/tenants/<uuid:tenant_id>/quota')
@ns.param('tenant_id', 'Tenant UUID')
class TenantQuota(Resource):
    @ns.doc('get_tenant_quota', security='Bearer')
    @ns.marshal_with(quota_response)
    @ns.response(404, 'Tenant not found', error_response)
    @require_roles(['super_admin', 'tenant_admin'])
    def get(self, tenant_id):
        """
        Get tenant quota and usage.
        
        Returns the plan limits, current usage, and remaining quota.
        
        **Permissions Required:** `super_admin` or `tenant_admin` role
        """
        from app.services.tenant_service import TenantService
        
        quota = TenantService.get_quota(str(tenant_id))
        if not quota:
            return {'error': 'Tenant not found'}, 404
        
        return quota


# =============================================================================
# User Management
# =============================================================================

@ns.route('/users')
class UserList(Resource):
    @ns.doc('list_users', security='Bearer')
    @ns.param('page', 'Page number', type=int, default=1)
    @ns.param('per_page', 'Items per page', type=int, default=20)
    @ns.param('search', 'Search by name or email', type=str)
    @ns.param('role', 'Filter by role name', type=str)
    @ns.param('is_active', 'Filter by active status', type=bool)
    @ns.marshal_list_with(user_response)
    @ns.response(401, 'Unauthorized', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def get(self):
        """
        List users in current tenant.
        
        Returns a paginated list of users.
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.user_service import UserService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search')
        role = request.args.get('role')
        is_active = request.args.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        result = UserService.list_users(
            tenant_id=tenant_id,
            page=page,
            per_page=per_page,
            search=search,
            role=role,
            is_active=is_active,
        )
        
        return result
    
    @ns.doc('create_user', security='Bearer')
    @ns.expect(user_create, validate=True)
    @ns.marshal_with(user_response, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(409, 'Email already exists', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def post(self):
        """
        Create a new user in current tenant.
        
        Creates a user with the specified roles.
        An email will be sent with login instructions.
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.user_service import UserService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        data = request.json
        
        user = UserService.create_user(
            tenant_id=tenant_id,
            email=data['email'],
            name=data['name'],
            password=data['password'],
            role_ids=data.get('role_ids', []),
        )
        
        return user.to_dict(), 201


@ns.route('/users/<uuid:user_id>')
@ns.param('user_id', 'User UUID')
class UserDetail(Resource):
    @ns.doc('get_user', security='Bearer')
    @ns.marshal_with(user_response)
    @ns.response(404, 'User not found', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def get(self, user_id):
        """
        Get user details.
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.user_service import UserService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        user = UserService.get_user(str(user_id), tenant_id)
        if not user:
            return {'error': 'User not found'}, 404
        
        return user.to_dict()
    
    @ns.doc('update_user', security='Bearer')
    @ns.expect(user_update)
    @ns.marshal_with(user_response)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(404, 'User not found', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def patch(self, user_id):
        """
        Update user details.
        
        Can update name, active status, and role assignments.
        To change password, user must use the password change endpoint.
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.user_service import UserService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        data = request.json
        
        user = UserService.update_user(str(user_id), tenant_id, **data)
        if not user:
            return {'error': 'User not found'}, 404
        
        return user.to_dict()
    
    @ns.doc('delete_user', security='Bearer')
    @ns.response(204, 'User deleted')
    @ns.response(404, 'User not found', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def delete(self, user_id):
        """
        Delete a user.
        
        Permanently deletes the user. Their dashboards and other
        resources will be orphaned (ownership transferred to tenant admin).
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.user_service import UserService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        success = UserService.delete_user(str(user_id), tenant_id)
        if not success:
            return {'error': 'User not found'}, 404
        
        return '', 204


# =============================================================================
# Role Management
# =============================================================================

@ns.route('/roles')
class RoleList(Resource):
    @ns.doc('list_roles', security='Bearer')
    @ns.marshal_list_with(role_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def get(self):
        """
        List all roles.
        
        Returns both system-defined and custom roles.
        
        **System Roles:**
        - `super_admin`: Platform-wide administration
        - `tenant_admin`: Tenant-level administration
        - `data_engineer`: Data source and semantic layer management
        - `analyst`: Dashboard creation and querying
        - `viewer`: Read-only dashboard access
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.role_service import RoleService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        roles = RoleService.list_roles(tenant_id)
        return [r.to_dict() for r in roles]
    
    @ns.doc('create_role', security='Bearer')
    @ns.expect(role_create, validate=True)
    @ns.marshal_with(role_response, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(409, 'Role name already exists', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def post(self):
        """
        Create a custom role.
        
        Creates a new role with the specified permissions.
        
        **Available Permissions:**
        - `connections:view`, `connections:create`, `connections:edit`, `connections:delete`
        - `semantic:view`, `semantic:create`, `semantic:edit`, `semantic:delete`
        - `dashboards:view`, `dashboards:create`, `dashboards:edit`, `dashboards:delete`, `dashboards:share`
        - `analytics.query`: Execute queries
        - `users:view`, `users:manage`: User management
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.role_service import RoleService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        data = request.json
        
        role = RoleService.create_role(
            tenant_id=tenant_id,
            name=data['name'],
            description=data.get('description'),
            permissions=data.get('permissions', []),
        )
        
        return role.to_dict(), 201


@ns.route('/roles/<uuid:role_id>')
@ns.param('role_id', 'Role UUID')
class RoleDetail(Resource):
    @ns.doc('get_role', security='Bearer')
    @ns.marshal_with(role_response)
    @ns.response(404, 'Role not found', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def get(self, role_id):
        """
        Get role details.
        """
        from app.services.role_service import RoleService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        role = RoleService.get_role(str(role_id), tenant_id)
        if not role:
            return {'error': 'Role not found'}, 404
        
        return role.to_dict()
    
    @ns.doc('update_role', security='Bearer')
    @ns.expect(role_create)
    @ns.marshal_with(role_response)
    @ns.response(400, 'Cannot modify system role', error_response)
    @ns.response(404, 'Role not found', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def patch(self, role_id):
        """
        Update a custom role.
        
        **Note:** System-defined roles cannot be modified.
        """
        from app.services.role_service import RoleService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        data = request.json
        
        role = RoleService.update_role(str(role_id), tenant_id, **data)
        if not role:
            return {'error': 'Role not found'}, 404
        
        return role.to_dict()
    
    @ns.doc('delete_role', security='Bearer')
    @ns.response(204, 'Role deleted')
    @ns.response(400, 'Cannot delete system role', error_response)
    @ns.response(404, 'Role not found', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def delete(self, role_id):
        """
        Delete a custom role.
        
        Users with this role will lose the role's permissions.
        
        **Note:** System-defined roles cannot be deleted.
        """
        from app.services.role_service import RoleService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        success = RoleService.delete_role(str(role_id), tenant_id)
        if not success:
            return {'error': 'Role not found or is system role'}, 404
        
        return '', 204


# =============================================================================
# Audit Logs
# =============================================================================

@ns.route('/audit')
class AuditLogList(Resource):
    @ns.doc('list_audit_logs', security='Bearer')
    @ns.param('page', 'Page number', type=int, default=1)
    @ns.param('per_page', 'Items per page', type=int, default=50)
    @ns.param('action', 'Filter by action type', type=str)
    @ns.param('resource_type', 'Filter by resource type', type=str)
    @ns.param('user_id', 'Filter by user', type=str)
    @ns.param('from_date', 'Start date (ISO 8601)', type=str)
    @ns.param('to_date', 'End date (ISO 8601)', type=str)
    @ns.marshal_with(audit_response)
    @ns.response(401, 'Unauthorized', error_response)
    @require_tenant_context
    @require_roles(['tenant_admin'])
    def get(self):
        """
        List audit logs for current tenant.
        
        Returns a paginated list of audit log entries.
        
        **Recorded Actions:**
        - `login`, `logout`, `password_change`
        - `create`, `update`, `delete` (for all resources)
        - `share`, `unshare` (for dashboards)
        - `query_execute` (for analytics queries)
        - `export` (for data exports)
        
        **Resource Types:**
        - `user`, `role`
        - `connection`, `semantic_model`
        - `dashboard`, `widget`
        - `query`
        
        **Permissions Required:** `tenant_admin` role
        """
        from app.services.audit_service import AuditService
        
        identity = get_jwt_identity_dict()
        tenant_id = identity.get('tenant_id')
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        logs = AuditService.list_logs(
            tenant_id=tenant_id,
            page=page,
            per_page=per_page,
            action=request.args.get('action'),
            resource_type=request.args.get('resource_type'),
            user_id=request.args.get('user_id'),
            from_date=request.args.get('from_date'),
            to_date=request.args.get('to_date'),
        )
        
        return logs
