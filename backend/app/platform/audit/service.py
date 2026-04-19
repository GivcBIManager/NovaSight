"""
NovaSight Audit Service
=======================

Comprehensive audit logging service for security and compliance.
Implements tamper-evident hash chain storage with severity-based alerting.
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from flask import g, request, has_request_context
from sqlalchemy import and_, or_

from app.models.audit import AuditLog, AuditSeverity
from app.extensions import db

logger = logging.getLogger(__name__)


class AuditService:
    """
    Service for comprehensive audit logging.
    
    Features:
    - Automatic hash chain integrity for tamper detection
    - Severity-based alerting for critical events
    - Flexible querying with filters
    - Integrity verification for compliance audits
    """
    
    # Actions that should be logged with their severity levels
    AUDITED_ACTIONS = {
        # Authentication
        'auth.login': AuditSeverity.INFO,
        'auth.logout': AuditSeverity.INFO,
        'auth.login_failed': AuditSeverity.WARNING,
        'auth.password_changed': AuditSeverity.INFO,
        'auth.password_reset': AuditSeverity.INFO,
        'auth.token_refresh': AuditSeverity.INFO,
        'auth.mfa_enabled': AuditSeverity.INFO,
        'auth.mfa_disabled': AuditSeverity.WARNING,
        
        # Users
        'user.created': AuditSeverity.INFO,
        'user.updated': AuditSeverity.INFO,
        'user.deleted': AuditSeverity.WARNING,
        'user.role_changed': AuditSeverity.INFO,
        'user.invited': AuditSeverity.INFO,
        'user.activated': AuditSeverity.INFO,
        'user.deactivated': AuditSeverity.WARNING,
        
        # Roles & Permissions
        'role.created': AuditSeverity.INFO,
        'role.updated': AuditSeverity.INFO,
        'role.deleted': AuditSeverity.WARNING,
        'role.permissions_changed': AuditSeverity.WARNING,
        'role.assigned': AuditSeverity.INFO,
        'role.revoked': AuditSeverity.WARNING,
        
        # Data sources & Connections
        'datasource.created': AuditSeverity.INFO,
        'datasource.updated': AuditSeverity.INFO,
        'datasource.deleted': AuditSeverity.WARNING,
        'datasource.tested': AuditSeverity.INFO,
        'datasource.credentials_updated': AuditSeverity.CRITICAL,
        'connection.created': AuditSeverity.INFO,
        'connection.updated': AuditSeverity.INFO,
        'connection.deleted': AuditSeverity.WARNING,
        'connection.tested': AuditSeverity.INFO,
        
        # Dashboards
        'dashboard.created': AuditSeverity.INFO,
        'dashboard.updated': AuditSeverity.INFO,
        'dashboard.deleted': AuditSeverity.INFO,
        'dashboard.shared': AuditSeverity.INFO,
        'dashboard.published': AuditSeverity.INFO,
        
        # DAGs & Pipelines
        'dag.created': AuditSeverity.INFO,
        'dag.updated': AuditSeverity.INFO,
        'dag.deleted': AuditSeverity.WARNING,
        'dag.deployed': AuditSeverity.INFO,
        'dag.triggered': AuditSeverity.INFO,
        'dag.paused': AuditSeverity.INFO,
        'dag.unpaused': AuditSeverity.INFO,
        
        # Queries & Data Access
        'query.executed': AuditSeverity.INFO,
        'query.exported': AuditSeverity.INFO,
        'data.exported': AuditSeverity.INFO,
        'schema.browsed': AuditSeverity.INFO,
        
        # Semantic Layer
        'semantic_model.created': AuditSeverity.INFO,
        'semantic_model.updated': AuditSeverity.INFO,
        'semantic_model.deleted': AuditSeverity.WARNING,
        
        # Admin / Tenant Operations
        'tenant.created': AuditSeverity.CRITICAL,
        'tenant.updated': AuditSeverity.INFO,
        'tenant.deactivated': AuditSeverity.CRITICAL,
        'tenant.settings_changed': AuditSeverity.WARNING,
        
        # RLS Policies
        'rls_policy.created': AuditSeverity.INFO,
        'rls_policy.updated': AuditSeverity.WARNING,
        'rls_policy.deleted': AuditSeverity.WARNING,
        
        # Security Events
        'security.unauthorized_access': AuditSeverity.CRITICAL,
        'security.rate_limit_exceeded': AuditSeverity.WARNING,
        'security.suspicious_activity': AuditSeverity.CRITICAL,
        'security.permission_denied': AuditSeverity.WARNING,
        
        # API Keys
        'api_key.created': AuditSeverity.INFO,
        'api_key.revoked': AuditSeverity.INFO,
    }
    
    @classmethod
    def log(
        cls,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        tenant_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> Optional[AuditLog]:
        """
        Create an audit log entry with hash chain integrity.
        """
        try:
            # Get context from platform identity if not provided
            if has_request_context():
                if not user_id or not tenant_id or not user_email:
                    try:
                        from app.platform.auth.identity import get_current_identity
                        identity = get_current_identity()
                        if identity:
                            if not user_id and identity.user_id:
                                user_id = str(identity.user_id)
                            if not user_email and identity.email:
                                user_email = identity.email
                            if not tenant_id and identity.tenant_id:
                                tenant_id = str(identity.tenant_id)
                    except Exception:
                        pass  # Identity may not be available (e.g. unauthenticated)
                if not ip_address:
                    ip_address = request.remote_addr
                if not user_agent:
                    user_agent = request.user_agent.string if request.user_agent else None
            
            # Get user email for denormalization if we have user_id but no email
            if user_id and not user_email:
                from app.models import User
                user = User.query.get(user_id)
                if user:
                    user_email = user.email
            
            # Get previous entry hash for chain integrity
            previous_hash = None
            if tenant_id:
                previous = AuditLog.query.filter_by(
                    tenant_id=tenant_id
                ).order_by(AuditLog.timestamp.desc()).first()
                if previous:
                    previous_hash = previous.entry_hash
            else:
                # Platform-level audit (no tenant)
                previous = AuditLog.query.filter(
                    AuditLog.tenant_id.is_(None)
                ).order_by(AuditLog.timestamp.desc()).first()
                if previous:
                    previous_hash = previous.entry_hash
            
            # Determine severity
            if severity is None:
                severity = cls.AUDITED_ACTIONS.get(action, AuditSeverity.INFO)
            
            # Convert resource_id to UUID if it's a valid UUID string
            resource_uuid = None
            if resource_id:
                try:
                    resource_uuid = uuid.UUID(resource_id)
                except (ValueError, TypeError):
                    # Store as extra_data if not a valid UUID
                    if extra_data is None:
                        extra_data = {}
                    extra_data['resource_id_string'] = resource_id
            
            # Create entry
            entry = AuditLog(
                id=uuid.uuid4(),
                timestamp=datetime.utcnow(),
                tenant_id=uuid.UUID(tenant_id) if tenant_id else None,
                user_id=uuid.UUID(user_id) if user_id else None,
                user_email=user_email,
                action=action,
                resource_type=resource_type,
                resource_id=resource_uuid,
                resource_name=resource_name,
                changes=changes,
                extra_data=extra_data,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                request_id=getattr(g, 'request_id', None) if has_request_context() else None,
                success=success,
                error_message=error_message,
                severity=severity,
                previous_hash=previous_hash,
            )
            
            # Calculate and set entry hash
            entry.entry_hash = entry.calculate_hash()
            
            db.session.add(entry)
            db.session.commit()
            
            # Alert on critical events
            if severity == AuditSeverity.CRITICAL:
                cls._send_security_alert(entry)
            
            logger.debug(
                f"Audit logged: {action} on {resource_type} "
                f"by {user_email or 'unknown'}"
            )
            
            return entry
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}", exc_info=True)
            db.session.rollback()
            return None
    
    @classmethod
    def log_with_changes(
        cls,
        action: str,
        resource_type: str,
        resource_id: str,
        old_values: Dict[str, Any],
        new_values: Dict[str, Any],
        resource_name: Optional[str] = None,
        **kwargs
    ) -> Optional[AuditLog]:
        """
        Log an action with before/after change tracking.
        """
        changes = {
            'before': old_values,
            'after': new_values,
        }
        return cls.log(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            changes=changes,
            **kwargs
        )
    
    @classmethod
    def log_failure(
        cls,
        action: str,
        resource_type: str,
        error: str,
        resource_id: Optional[str] = None,
        **kwargs
    ) -> Optional[AuditLog]:
        """
        Log a failed action.
        """
        return cls.log(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            success=False,
            error_message=error,
            **kwargs
        )
    
    @classmethod
    def query(
        cls,
        tenant_id: str,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        severity: Optional[str] = None,
        success: Optional[bool] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> Dict[str, Any]:
        """
        Query audit logs with filters.
        """
        per_page = min(per_page, 100)
        
        query = AuditLog.query.filter_by(tenant_id=tenant_id)
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        if action:
            query = query.filter(AuditLog.action.like(f'{action}%'))
        
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        
        if resource_id:
            try:
                resource_uuid = uuid.UUID(resource_id)
                query = query.filter_by(resource_id=resource_uuid)
            except (ValueError, TypeError):
                pass
        
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        
        if severity:
            query = query.filter_by(severity=severity)
        
        if success is not None:
            query = query.filter_by(success=success)
        
        query = query.order_by(AuditLog.timestamp.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'items': [item.to_dict() for item in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
        }
    
    @classmethod
    def get_user_activity(
        cls,
        tenant_id: str,
        user_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get recent activity for a specific user.
        """
        entries = AuditLog.query.filter_by(
            tenant_id=tenant_id,
            user_id=user_id
        ).order_by(
            AuditLog.timestamp.desc()
        ).limit(limit).all()
        
        return [entry.to_dict() for entry in entries]
    
    @classmethod
    def get_resource_history(
        cls,
        tenant_id: str,
        resource_type: str,
        resource_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Get complete audit history for a specific resource.
        """
        try:
            resource_uuid = uuid.UUID(resource_id)
        except (ValueError, TypeError):
            return []
        
        entries = AuditLog.query.filter_by(
            tenant_id=tenant_id,
            resource_type=resource_type,
            resource_id=resource_uuid
        ).order_by(
            AuditLog.timestamp.asc()
        ).all()
        
        return [entry.to_dict() for entry in entries]
    
    @classmethod
    def verify_integrity(cls, tenant_id: str) -> Dict[str, Any]:
        """
        Verify audit log chain integrity for a tenant.
        """
        entries = AuditLog.query.filter_by(
            tenant_id=tenant_id
        ).order_by(AuditLog.timestamp.asc()).all()
        
        issues = []
        previous_hash = None
        verified_count = 0
        
        for entry in entries:
            if entry.previous_hash != previous_hash:
                issues.append({
                    'entry_id': str(entry.id),
                    'issue': 'Hash chain broken - previous_hash mismatch',
                    'timestamp': entry.timestamp.isoformat(),
                    'action': entry.action,
                })
            
            if not entry.verify_hash():
                issues.append({
                    'entry_id': str(entry.id),
                    'issue': 'Entry hash mismatch - possible tampering detected',
                    'timestamp': entry.timestamp.isoformat(),
                    'action': entry.action,
                })
            else:
                verified_count += 1
            
            previous_hash = entry.entry_hash
        
        result = {
            'verified': len(issues) == 0,
            'total_entries': len(entries),
            'verified_entries': verified_count,
            'issues_found': len(issues),
            'issues': issues,
            'verified_at': datetime.utcnow().isoformat(),
        }
        
        cls.log(
            action='audit.integrity_verified',
            resource_type='audit_log',
            tenant_id=tenant_id,
            extra_data={
                'total_entries': len(entries),
                'issues_found': len(issues),
                'verified': len(issues) == 0,
            }
        )
        
        if issues:
            logger.warning(
                f"Audit integrity check failed for tenant {tenant_id}: "
                f"{len(issues)} issues found"
            )
        
        return result
    
    @classmethod
    def get_security_events(
        cls,
        tenant_id: str,
        hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Get security-relevant events from the last N hours.
        """
        from datetime import timedelta
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        critical_events = AuditLog.query.filter(
            and_(
                AuditLog.tenant_id == tenant_id,
                AuditLog.severity == AuditSeverity.CRITICAL,
                AuditLog.timestamp >= start_time
            )
        ).order_by(AuditLog.timestamp.desc()).all()
        
        warning_events = AuditLog.query.filter(
            and_(
                AuditLog.tenant_id == tenant_id,
                AuditLog.severity == AuditSeverity.WARNING,
                AuditLog.timestamp >= start_time
            )
        ).order_by(AuditLog.timestamp.desc()).all()
        
        failed_actions = AuditLog.query.filter(
            and_(
                AuditLog.tenant_id == tenant_id,
                AuditLog.success == False,
                AuditLog.timestamp >= start_time
            )
        ).order_by(AuditLog.timestamp.desc()).all()
        
        return {
            'period_hours': hours,
            'critical_count': len(critical_events),
            'warning_count': len(warning_events),
            'failed_count': len(failed_actions),
            'critical_events': [e.to_dict() for e in critical_events],
            'warning_events': [e.to_dict() for e in warning_events[:20]],
            'failed_actions': [e.to_dict() for e in failed_actions[:20]],
        }
    
    @classmethod
    def export_logs(
        cls,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """
        Export audit logs for a date range (compliance export).
        """
        entries = AuditLog.query.filter(
            and_(
                AuditLog.tenant_id == tenant_id,
                AuditLog.timestamp >= start_date,
                AuditLog.timestamp <= end_date
            )
        ).order_by(AuditLog.timestamp.asc()).all()
        
        return [entry.to_export_dict() for entry in entries]
    
    @classmethod
    def _send_security_alert(cls, entry: AuditLog):
        """
        Send alert for critical security events.
        """
        logger.critical(
            f"SECURITY ALERT: {entry.action} | "
            f"Tenant: {entry.tenant_id} | "
            f"User: {entry.user_email} | "
            f"IP: {entry.ip_address} | "
            f"Resource: {entry.resource_type}/{entry.resource_id}"
        )


# Convenience instance for direct import
audit_service = AuditService()
