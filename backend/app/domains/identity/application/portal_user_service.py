"""
Portal User Service
====================

Cross-tenant user management for platform super admins.
Encapsulates all direct database queries that were previously in
api/v1/admin/portal_users.py route handlers.
"""

import logging
from typing import Optional

from sqlalchemy import or_, func

from app.extensions import db
from app.domains.identity.domain.models import User, Role
from app.domains.tenants.domain.models import Tenant
from app.domains.identity.application.user_service import UserService

logger = logging.getLogger(__name__)


class PortalUserService:

    def list_users(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        tenant_id: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None,
    ) -> dict:
        query = db.session.query(User).join(Tenant, User.tenant_id == Tenant.id)

        if search:
            query = query.filter(
                or_(
                    User.email.ilike(f'%{search}%'),
                    User.name.ilike(f'%{search}%'),
                )
            )

        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)

        if role:
            query = query.join(User.roles).filter(Role.name == role)

        if status:
            query = query.filter(User.status == status)

        total = query.count()
        users = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        items = []
        for user in users:
            user_dict = user.to_dict(include_roles=True)
            if user.tenant:
                user_dict['tenant_name'] = user.tenant.name
                user_dict['tenant_slug'] = user.tenant.slug
            items.append(user_dict)

        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page,
        }

    def get_user(self, user_id: str) -> dict:
        user = db.session.get(User, user_id)
        if not user:
            return None

        user_dict = user.to_dict(include_roles=True)
        if user.tenant:
            user_dict['tenant_name'] = user.tenant.name
            user_dict['tenant_slug'] = user.tenant.slug
        return user_dict

    def create_user(
        self,
        email: str,
        name: str,
        password: str,
        tenant_id: str,
        roles: list[str] | None = None,
    ) -> dict:
        tenant = db.session.get(Tenant, tenant_id)
        if not tenant:
            raise ValueError(f"Tenant not found: {tenant_id}")

        user_service = UserService(tenant_id)
        user = user_service.create_user(
            email=email,
            name=name,
            password=password,
            role_names=roles or ['viewer'],
        )

        user_dict = user.to_dict(include_roles=True)
        user_dict['tenant_name'] = tenant.name
        user_dict['tenant_slug'] = tenant.slug

        logger.info(f"Portal admin created user '{email}' in tenant {tenant.name}")
        return user_dict

    def update_user_status(self, user_id: str, new_status: str) -> dict:
        if new_status not in ('active', 'inactive', 'locked'):
            raise ValueError("Status must be one of: active, inactive, locked")

        user = db.session.get(User, user_id)
        if not user:
            return None

        user.status = new_status
        db.session.commit()

        logger.info(f"Portal admin updated user {user_id} status to {new_status}")

        return user.to_dict(include_roles=True)

    def deactivate_user(self, user_id: str, current_user_id: Optional[str] = None) -> bool:
        if current_user_id and str(current_user_id) == str(user_id):
            raise ValueError("Cannot deactivate your own account")

        user = db.session.get(User, user_id)
        if not user:
            return False

        user.status = 'inactive'
        db.session.commit()

        logger.info(f"Portal admin deactivated user {user_id}")
        return True

    def get_stats(self) -> dict:
        total_tenants = db.session.query(func.count(Tenant.id)).scalar() or 0
        active_tenants = (
            db.session.query(func.count(Tenant.id))
            .filter(Tenant.status == 'active')
            .scalar()
            or 0
        )
        total_users = db.session.query(func.count(User.id)).scalar() or 0
        active_users = (
            db.session.query(func.count(User.id))
            .filter(User.status == 'active')
            .scalar()
            or 0
        )

        users_by_tenant = (
            db.session.query(
                Tenant.name,
                Tenant.slug,
                func.count(User.id).label('user_count'),
            )
            .outerjoin(User, User.tenant_id == Tenant.id)
            .group_by(Tenant.id, Tenant.name, Tenant.slug)
            .all()
        )

        users_by_role = (
            db.session.query(
                Role.name,
                Role.display_name,
                func.count(User.id).label('user_count'),
            )
            .join(User.roles)
            .group_by(Role.id, Role.name, Role.display_name)
            .all()
        )

        return {
            'tenants': {'total': total_tenants, 'active': active_tenants},
            'users': {'total': total_users, 'active': active_users},
            'users_by_tenant': [
                {'name': t.name, 'slug': t.slug, 'count': t.user_count}
                for t in users_by_tenant
            ],
            'users_by_role': [
                {'name': r.name, 'display_name': r.display_name, 'count': r.user_count}
                for r in users_by_role
            ],
        }


portal_user_service = PortalUserService()
