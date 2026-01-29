"""
NovaSight Tenant Service
========================

Multi-tenant management operations with full provisioning support.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from app.extensions import db
from app.models.tenant import Tenant, TenantStatus, SubscriptionPlan
from app.services.template_engine import template_engine
from app.services.clickhouse_client import ClickHouseClient, ClickHouseError
from sqlalchemy import text
import logging
import uuid

logger = logging.getLogger(__name__)


class TenantService:
    """Service for tenant management operations."""
    
    def list_tenants(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List all tenants with pagination.
        
        Args:
            page: Page number
            per_page: Items per page
            status: Filter by status
            search: Search by name or slug
        
        Returns:
            Paginated list of tenants
        """
        query = Tenant.query
        
        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                db.or_(
                    Tenant.name.ilike(search_pattern),
                    Tenant.slug.ilike(search_pattern)
                )
            )
        
        if status:
            try:
                status_enum = TenantStatus(status)
                query = query.filter(Tenant.status == status_enum)
            except ValueError:
                pass
        
        query = query.order_by(Tenant.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            "tenants": [t.to_dict() for t in pagination.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            }
        }
    
    def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """
        Get tenant by ID.
        
        Args:
            tenant_id: Tenant UUID
        
        Returns:
            Tenant object or None
        """
        try:
            return Tenant.query.filter(Tenant.id == tenant_id).first()
        except Exception as e:
            logger.error(f"Error fetching tenant {tenant_id}: {e}")
            return None
    
    def get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """
        Get tenant by slug.
        
        Args:
            slug: Tenant slug
        
        Returns:
            Tenant object or None
        """
        return Tenant.query.filter(Tenant.slug == slug).first()
    
    def create_tenant(
        self,
        name: str,
        slug: str,
        plan: str = "basic",
        settings: Optional[Dict[str, Any]] = None,
        provision_resources: bool = False
    ) -> Tenant:
        """
        Create a new tenant.
        
        Args:
            name: Tenant display name
            slug: Unique tenant identifier
            plan: Subscription plan
            settings: Tenant settings
            provision_resources: If True, create PG schema and CH database
        
        Returns:
            Created Tenant object
        """
        # Validate slug uniqueness
        existing = self.get_tenant_by_slug(slug)
        if existing:
            raise ValueError(f"Tenant with slug '{slug}' already exists")
        
        # Parse plan
        try:
            plan_enum = SubscriptionPlan(plan)
        except ValueError:
            plan_enum = SubscriptionPlan.BASIC
        
        tenant = Tenant(
            name=name,
            slug=slug.lower().replace(" ", "_"),
            plan=plan_enum,
            status=TenantStatus.ACTIVE,
            settings=settings or {},
        )
        
        db.session.add(tenant)
        db.session.flush()  # Get tenant ID before provisioning
        
        # Provision infrastructure resources
        if provision_resources:
            try:
                self._create_pg_schema(tenant)
                self._create_ch_database(tenant)
                logger.info(f"Provisioned resources for tenant: {tenant.slug}")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to provision tenant {tenant.slug}: {e}")
                raise ValueError(f"Failed to provision tenant resources: {e}")
        
        db.session.commit()
        logger.info(f"Created tenant: {tenant.slug}")
        
        return tenant
    
    def update_tenant(
        self,
        tenant_id: str,
        **kwargs
    ) -> Optional[Tenant]:
        """
        Update tenant details.
        
        Args:
            tenant_id: Tenant UUID
            **kwargs: Fields to update
        
        Returns:
            Updated Tenant object or None
        """
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None
        
        # Update allowed fields
        allowed_fields = ["name", "settings", "status", "plan"]
        
        for field, value in kwargs.items():
            if field not in allowed_fields:
                continue
            
            if field == "status":
                try:
                    value = TenantStatus(value)
                except ValueError:
                    continue
            elif field == "plan":
                try:
                    value = SubscriptionPlan(value)
                except ValueError:
                    continue
            
            setattr(tenant, field, value)
        
        db.session.commit()
        logger.info(f"Updated tenant: {tenant.slug}")
        
        return tenant
    
    def delete_tenant(self, tenant_id: str) -> bool:
        """
        Delete (archive) a tenant.
        
        Args:
            tenant_id: Tenant UUID
        
        Returns:
            True if successful
        """
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return False
        
        tenant.status = TenantStatus.ARCHIVED
        db.session.commit()
        
        logger.info(f"Archived tenant: {tenant.slug}")
        
        return True
    
    def deactivate_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """
        Deactivate a tenant (soft delete).
        
        Args:
            tenant_id: Tenant UUID
        
        Returns:
            Deactivated Tenant object or None
        """
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None
        
        tenant.status = TenantStatus.ARCHIVED
        db.session.commit()
        
        logger.info(f"Deactivated tenant: {tenant.slug}")
        
        return tenant
    
    def activate_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """
        Activate a suspended or pending tenant.
        
        Args:
            tenant_id: Tenant UUID
        
        Returns:
            Activated Tenant object or None
        """
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None
        
        tenant.status = TenantStatus.ACTIVE
        db.session.commit()
        
        logger.info(f"Activated tenant: {tenant.slug}")
        
        return tenant
    
    def suspend_tenant(
        self,
        tenant_id: str,
        reason: Optional[str] = None
    ) -> Optional[Tenant]:
        """
        Suspend a tenant temporarily.
        
        Args:
            tenant_id: Tenant UUID
            reason: Reason for suspension
        
        Returns:
            Suspended Tenant object or None
        """
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return None
        
        tenant.status = TenantStatus.SUSPENDED
        
        # Store suspension reason in settings
        if reason:
            settings = tenant.settings or {}
            settings['suspension_reason'] = reason
            settings['suspended_at'] = datetime.utcnow().isoformat()
            tenant.settings = settings
        
        db.session.commit()
        
        logger.info(f"Suspended tenant: {tenant.slug}, reason: {reason}")
        
        return tenant
    
    def get_usage(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get tenant usage statistics.
        
        Args:
            tenant_id: Tenant UUID
        
        Returns:
            Usage statistics dictionary
        """
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")
        
        usage = {
            'storage_gb': self._get_storage_usage(tenant),
            'users_count': self._get_users_count(tenant),
            'datasources_count': self._get_datasources_count(tenant),
            'dashboards_count': self._get_dashboards_count(tenant),
            'queries_last_30d': self._get_query_count(tenant),
            'dag_configs_count': self._get_dag_configs_count(tenant),
        }
        
        return usage
    
    def _get_storage_usage(self, tenant: Tenant) -> float:
        """Get ClickHouse storage usage in GB."""
        try:
            client = ClickHouseClient(database=f"tenant_{tenant.slug}")
            result = client.execute("""
                SELECT sum(bytes) / 1024 / 1024 / 1024 as gb
                FROM system.parts
                WHERE database = %(database)s
            """, {'database': f"tenant_{tenant.slug}"})
            
            if result.rows and result.rows[0]:
                return round(result.rows[0][0] or 0, 2)
            return 0.0
        except ClickHouseError as e:
            logger.warning(f"Could not get storage usage for {tenant.slug}: {e}")
            return 0.0
    
    def _get_users_count(self, tenant: Tenant) -> int:
        """Get count of active users for tenant."""
        try:
            return tenant.users.filter_by(is_active=True).count()
        except Exception:
            return 0
    
    def _get_datasources_count(self, tenant: Tenant) -> int:
        """Get count of data connections for tenant."""
        try:
            return tenant.connections.count()
        except Exception:
            return 0
    
    def _get_dashboards_count(self, tenant: Tenant) -> int:
        """Get count of dashboards for tenant."""
        try:
            # Check if dashboards relationship exists
            if hasattr(tenant, 'dashboards'):
                return tenant.dashboards.count()
            return 0
        except Exception:
            return 0
    
    def _get_dag_configs_count(self, tenant: Tenant) -> int:
        """Get count of DAG configurations for tenant."""
        try:
            return tenant.dag_configs.count()
        except Exception:
            return 0
    
    def _get_query_count(self, tenant: Tenant) -> int:
        """Get query count for last 30 days."""
        # This would require a query log table - return 0 for now
        # In production, query from audit_logs or query_history table
        return 0
    
    def _create_pg_schema(self, tenant: Tenant) -> None:
        """Create PostgreSQL schema for tenant."""
        try:
            sql = template_engine.render(
                'sql/tenant_schema.sql.j2',
                {'tenant_slug': tenant.slug}
            )
            db.session.execute(text(sql))
            logger.info(f"Created PostgreSQL schema for tenant: {tenant.slug}")
        except Exception as e:
            logger.error(f"Failed to create PG schema for {tenant.slug}: {e}")
            raise
    
    def _create_ch_database(self, tenant: Tenant) -> None:
        """Create ClickHouse database for tenant."""
        try:
            sql = template_engine.render(
                'clickhouse/tenant_database.sql.j2',
                {
                    'tenant_id': str(tenant.id),
                    'tenant_slug': tenant.slug
                }
            )
            client = ClickHouseClient()
            client.execute(sql)
            logger.info(f"Created ClickHouse database for tenant: {tenant.slug}")
        except Exception as e:
            logger.error(f"Failed to create CH database for {tenant.slug}: {e}")
            raise
