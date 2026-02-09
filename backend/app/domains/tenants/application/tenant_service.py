"""
NovaSight Tenants Domain — Tenant Service
===========================================

Canonical location: ``app.domains.tenants.application.tenant_service``

Tenant CRUD, lifecycle, and usage statistics.

Changes from legacy ``app.services.tenant_service``:
 * Provisioning delegated to ``ProvisioningService``
 * Removed duplicate ``deactivate_tenant`` (``delete_tenant`` archives)
 * Imports from ``app.domains.tenants.domain.models``
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any

from app.extensions import db
from app.domains.tenants.domain.models import (
    Tenant,
    TenantStatus,
    SubscriptionPlan,
)
from app.domains.tenants.infrastructure.provisioning import ProvisioningService

logger = logging.getLogger(__name__)


class TenantService:
    """Service for tenant management operations."""

    def __init__(self) -> None:
        self._provisioning = ProvisioningService()

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def list_tenants(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List tenants with pagination, optional filter/search."""
        query = Tenant.query

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                db.or_(
                    Tenant.name.ilike(pattern),
                    Tenant.slug.ilike(pattern),
                )
            )

        if status:
            try:
                TenantStatus(status)
                query = query.filter(Tenant.status == status)
            except ValueError:
                pass

        query = query.order_by(Tenant.created_at.desc())
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )

        return {
            "tenants": [t.to_dict() for t in pagination.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }

    def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID."""
        try:
            return Tenant.query.filter(Tenant.id == tenant_id).first()
        except Exception as e:
            logger.error("Error fetching tenant %s: %s", tenant_id, e)
            return None

    def get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug."""
        return Tenant.query.filter(Tenant.slug == slug).first()

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def create_tenant(
        self,
        name: str,
        slug: str,
        plan: str = "basic",
        settings: Optional[Dict[str, Any]] = None,
        provision_resources: bool = True,
    ) -> Tenant:
        """
        Create a new tenant, provisioning PG schema + ClickHouse database.
        
        Args:
            name: Tenant display name
            slug: URL-safe identifier
            plan: Subscription plan (basic, professional, enterprise)
            settings: Custom tenant settings
            provision_resources: If True (default), create PG schema and CH database
        
        Returns:
            Created Tenant
        """
        existing = self.get_tenant_by_slug(slug)
        if existing:
            raise ValueError(f"Tenant with slug '{slug}' already exists")

        try:
            plan_enum = SubscriptionPlan(plan)
        except ValueError:
            plan_enum = SubscriptionPlan.BASIC

        tenant = Tenant(
            name=name,
            slug=slug.lower().replace(" ", "_"),
            plan=plan_enum.value,  # Store string value, not Enum
            status=TenantStatus.ACTIVE.value,  # Store string value, not Enum
            settings=settings or {},
        )

        db.session.add(tenant)
        db.session.flush()  # obtain tenant ID before provisioning

        if provision_resources:
            try:
                self._provisioning.provision(tenant)
            except Exception as e:
                db.session.rollback()
                logger.error(
                    "Failed to provision tenant %s: %s", tenant.slug, e
                )
                raise ValueError(
                    f"Failed to provision tenant resources: {e}"
                )

        db.session.commit()
        logger.info("Created tenant: %s", tenant.slug)
        return tenant

    def update_tenant(
        self, tenant_id: str, **kwargs: Any
    ) -> Optional[Tenant]:
        """Update allowed tenant fields."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None

        allowed = {"name", "settings", "status", "plan"}

        for field, value in kwargs.items():
            if field not in allowed:
                continue
            if field == "status":
                try:
                    value = TenantStatus(value).value  # Store string value
                except ValueError:
                    continue
            elif field == "plan":
                try:
                    value = SubscriptionPlan(value).value  # Store string value
                except ValueError:
                    continue
            setattr(tenant, field, value)

        db.session.commit()
        logger.info("Updated tenant: %s", tenant.slug)
        return tenant

    def delete_tenant(self, tenant_id: str, hard_delete: bool = False, force: bool = False) -> bool:
        """
        Delete a tenant.
        
        Args:
            tenant_id: The tenant ID to delete
            hard_delete: If True, permanently delete tenant and all resources
            force: If True (with hard_delete), drop databases even with data
        
        Returns:
            True if successful
        """
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return False

        if hard_delete:
            try:
                # Deprovision infrastructure resources
                self._provisioning.deprovision(tenant, force=force)
            except Exception as e:
                logger.error(
                    "Failed to deprovision tenant %s: %s", tenant.slug, e
                )
                if not force:
                    raise ValueError(
                        f"Failed to deprovision tenant resources: {e}. "
                        "Use force=True to delete anyway."
                    )
            
            # Hard delete the tenant record
            db.session.delete(tenant)
            db.session.commit()
            logger.info("Hard deleted tenant: %s", tenant.slug)
        else:
            # Soft delete (archive)
            tenant.status = TenantStatus.ARCHIVED.value
            db.session.commit()
            logger.info("Archived tenant: %s", tenant.slug)
        
        return True

    # ------------------------------------------------------------------
    # Lifecycle helpers
    # ------------------------------------------------------------------

    def activate_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """Re-activate a suspended / pending tenant."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None

        tenant.status = TenantStatus.ACTIVE.value
        db.session.commit()
        logger.info("Activated tenant: %s", tenant.slug)
        return tenant

    def suspend_tenant(
        self, tenant_id: str, reason: Optional[str] = None
    ) -> Optional[Tenant]:
        """Suspend a tenant temporarily."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None

        tenant.status = TenantStatus.SUSPENDED.value

        if reason:
            settings = tenant.settings or {}
            settings["suspension_reason"] = reason
            settings["suspended_at"] = datetime.utcnow().isoformat()
            tenant.settings = settings

        db.session.commit()
        logger.info(
            "Suspended tenant: %s, reason: %s", tenant.slug, reason
        )
        return tenant

    # ------------------------------------------------------------------
    # Usage statistics
    # ------------------------------------------------------------------

    def get_usage(self, tenant_id: str) -> Dict[str, Any]:
        """Return usage statistics for a tenant."""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        return {
            "storage_gb": self._get_storage_usage(tenant),
            "users_count": self._get_users_count(tenant),
            "datasources_count": self._get_datasources_count(tenant),
            "dashboards_count": self._get_dashboards_count(tenant),
            "queries_last_30d": self._get_query_count(tenant),
            "dag_configs_count": self._get_dag_configs_count(tenant),
        }

    # --- private helpers ------------------------------------------------

    @staticmethod
    def _get_storage_usage(tenant: Tenant) -> float:
        try:
            from app.services.clickhouse_client import (
                ClickHouseClient,
                ClickHouseError,
            )

            client = ClickHouseClient(database=f"tenant_{tenant.slug}")
            result = client.execute(
                """
                SELECT sum(bytes) / 1024 / 1024 / 1024 AS gb
                FROM system.parts
                WHERE database = %(database)s
                """,
                {"database": f"tenant_{tenant.slug}"},
            )
            if result.rows and result.rows[0]:
                return round(result.rows[0][0] or 0, 2)
            return 0.0
        except Exception as e:
            logger.warning(
                "Could not get storage usage for %s: %s", tenant.slug, e
            )
            return 0.0

    @staticmethod
    def _get_users_count(tenant: Tenant) -> int:
        try:
            return tenant.users.filter_by(is_active=True).count()
        except Exception:
            return 0

    @staticmethod
    def _get_datasources_count(tenant: Tenant) -> int:
        try:
            return tenant.connections.count()
        except Exception:
            return 0

    @staticmethod
    def _get_dashboards_count(tenant: Tenant) -> int:
        try:
            if hasattr(tenant, "dashboards"):
                return tenant.dashboards.count()
            return 0
        except Exception:
            return 0

    @staticmethod
    def _get_dag_configs_count(tenant: Tenant) -> int:
        try:
            return tenant.dag_configs.count()
        except Exception:
            return 0

    @staticmethod
    def _get_query_count(tenant: Tenant) -> int:  # noqa: ARG004
        # Requires query_history / audit_logs table — stub for now
        return 0
