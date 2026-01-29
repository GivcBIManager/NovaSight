"""
NovaSight Audit Log Model
=========================

Comprehensive audit logging for security and compliance.
Implements tamper-evident hash chain for integrity verification.
"""

import uuid
import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from app.extensions import db


class AuditSeverity:
    """Audit severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AuditLog(db.Model):
    """
    Immutable audit log model with hash chain integrity.
    
    Stores comprehensive audit trail for all significant actions
    with tamper-evident storage using cryptographic hash chains.
    
    Security Features:
    - Hash chain linking entries for integrity verification
    - Denormalized user email for forensics even if user deleted
    - IP address and user agent capture for access tracking
    - Severity levels for alerting on critical events
    """
    
    __tablename__ = "audit_logs"
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # When
    timestamp = db.Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Who - Tenant context (null for platform-level actions)
    tenant_id = db.Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    
    # Who - Actor
    user_id = db.Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    user_email = db.Column(String(255), nullable=True)  # Denormalized for query efficiency
    
    # What - Action details
    action = db.Column(String(100), nullable=False, index=True)
    
    # What - Resource affected
    resource_type = db.Column(String(50), nullable=False, index=True)
    resource_id = db.Column(UUID(as_uuid=True), nullable=True)
    resource_name = db.Column(String(255), nullable=True)
    
    # Details - Change tracking (before/after for updates)
    changes = db.Column(JSONB, nullable=True)
    
    # Details - Additional context
    extra_data = db.Column(JSONB, nullable=True)
    
    # Where - Request context
    ip_address = db.Column(INET, nullable=True)
    user_agent = db.Column(String(500), nullable=True)
    request_id = db.Column(String(100), nullable=True)
    
    # Status
    success = db.Column(db.Boolean, default=True, nullable=False)
    error_message = db.Column(Text, nullable=True)
    
    # Severity level for alerting
    severity = db.Column(String(20), default=AuditSeverity.INFO, nullable=False)
    
    # Integrity - Hash chain for tamper detection
    previous_hash = db.Column(String(64), nullable=True)  # Hash of previous entry
    entry_hash = db.Column(String(64), nullable=False)    # Hash of this entry
    
    # Relationships
    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    user = relationship("User", foreign_keys=[user_id])
    
    __table_args__ = (
        Index('idx_audit_tenant_timestamp', 'tenant_id', 'timestamp'),
        Index('idx_audit_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_audit_resource', 'resource_type', 'resource_id'),
        Index('idx_audit_action', 'action', 'timestamp'),
        Index('idx_audit_severity', 'severity', 'timestamp'),
    )
    
    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by {self.user_email} at {self.timestamp}>"
    
    def calculate_hash(self) -> str:
        """
        Calculate SHA-256 hash for integrity verification.
        
        The hash includes all critical fields that should not be tampered with.
        This creates a tamper-evident chain where modifying any entry
        breaks the chain integrity.
        
        Returns:
            str: Hexadecimal SHA-256 hash of the entry data
        """
        data = {
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'tenant_id': str(self.tenant_id) if self.tenant_id else None,
            'user_id': str(self.user_id) if self.user_id else None,
            'user_email': self.user_email,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': str(self.resource_id) if self.resource_id else None,
            'resource_name': self.resource_name,
            'changes': self.changes,
            'extra_data': self.extra_data,
            'ip_address': str(self.ip_address) if self.ip_address else None,
            'success': self.success,
            'error_message': self.error_message,
            'severity': self.severity,
            'previous_hash': self.previous_hash,
        }
        content = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def verify_hash(self) -> bool:
        """
        Verify that the entry hash matches the calculated hash.
        
        Returns:
            bool: True if hash is valid, False if tampered
        """
        return self.entry_hash == self.calculate_hash()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary representation."""
        return {
            "id": str(self.id),
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "user_id": str(self.user_id) if self.user_id else None,
            "user_email": self.user_email,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": str(self.resource_id) if self.resource_id else None,
            "resource_name": self.resource_name,
            "changes": self.changes,
            "extra_data": self.extra_data,
            "ip_address": str(self.ip_address) if self.ip_address else None,
            "user_agent": self.user_agent,
            "request_id": self.request_id,
            "success": self.success,
            "error_message": self.error_message,
            "severity": self.severity,
            "integrity_verified": self.verify_hash(),
        }
    
    def to_export_dict(self) -> Dict[str, Any]:
        """
        Convert audit log to exportable dictionary with full details.
        
        Includes hash chain information for compliance exports.
        """
        data = self.to_dict()
        data.update({
            "previous_hash": self.previous_hash,
            "entry_hash": self.entry_hash,
        })
        return data
