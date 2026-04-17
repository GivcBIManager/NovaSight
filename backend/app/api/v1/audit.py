"""
NovaSight Audit API
===================

REST API endpoints for audit log querying and integrity verification.
"""

from datetime import datetime
from flask import jsonify, request
from app.platform.auth.decorators import authenticated
from app.platform.auth.identity import get_current_identity

from app.api.v1 import api_v1_bp
from app.platform.audit.service import AuditService
from app.platform.auth.decorators import require_permission, require_roles
from app.platform.tenant.context import require_tenant
from app.errors import ValidationError, AuthorizationError


@api_v1_bp.route('/audit/logs', methods=['GET'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin', 'auditor')
def list_audit_logs():
    """
    List audit logs with filtering and pagination.
    
    Query Parameters:
        user_id: Filter by user ID
        action: Filter by action (prefix matching supported)
        resource_type: Filter by resource type
        resource_id: Filter by specific resource ID
        start_date: Filter entries after this ISO datetime
        end_date: Filter entries before this ISO datetime
        severity: Filter by severity (info, warning, critical)
        success: Filter by success status (true/false)
        page: Page number (default: 1)
        per_page: Items per page (default: 50, max: 100)
    
    Returns:
        JSON with paginated audit log entries
    """
    tenant_id = str(get_current_identity().tenant_id)
    
    # Parse query parameters
    user_id = request.args.get('user_id')
    action = request.args.get('action')
    resource_type = request.args.get('resource_type')
    resource_id = request.args.get('resource_id')
    severity = request.args.get('severity')
    success_str = request.args.get('success')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Parse dates
    start_date = None
    end_date = None
    try:
        if request.args.get('start_date'):
            start_date = datetime.fromisoformat(
                request.args.get('start_date').replace('Z', '+00:00')
            )
        if request.args.get('end_date'):
            end_date = datetime.fromisoformat(
                request.args.get('end_date').replace('Z', '+00:00')
            )
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {e}")
    
    # Parse success boolean
    success = None
    if success_str is not None:
        success = success_str.lower() in ('true', '1', 'yes')
    
    # Query audit logs
    result = AuditService.query(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        start_date=start_date,
        end_date=end_date,
        severity=severity,
        success=success,
        page=page,
        per_page=per_page,
    )
    
    return jsonify({
        'success': True,
        'data': result,
    })


@api_v1_bp.route('/audit/logs/<log_id>', methods=['GET'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin', 'auditor')
def get_audit_log(log_id: str):
    """
    Get a specific audit log entry.
    
    Path Parameters:
        log_id: UUID of the audit log entry
    
    Returns:
        JSON with the audit log entry details
    """
    from app.models.audit import AuditLog
    import uuid
    
    tenant_id = str(get_current_identity().tenant_id)
    
    try:
        log_uuid = uuid.UUID(log_id)
    except ValueError:
        raise ValidationError("Invalid log ID format")
    
    entry = AuditLog.query.filter_by(
        id=log_uuid,
        tenant_id=tenant_id
    ).first()
    
    if not entry:
        return jsonify({
            'success': False,
            'error': 'Audit log entry not found',
        }), 404
    
    return jsonify({
        'success': True,
        'data': entry.to_export_dict(),
    })


@api_v1_bp.route('/audit/user/<user_id>/activity', methods=['GET'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin', 'auditor')
def get_user_activity(user_id: str):
    """
    Get recent activity for a specific user.
    
    Path Parameters:
        user_id: UUID of the user
    
    Query Parameters:
        limit: Maximum number of entries (default: 50)
    
    Returns:
        JSON with user's recent activity
    """
    tenant_id = str(get_current_identity().tenant_id)
    limit = request.args.get('limit', 50, type=int)
    limit = min(limit, 200)  # Cap at 200
    
    activity = AuditService.get_user_activity(
        tenant_id=tenant_id,
        user_id=user_id,
        limit=limit,
    )
    
    return jsonify({
        'success': True,
        'data': {
            'user_id': user_id,
            'activity': activity,
            'count': len(activity),
        },
    })


@api_v1_bp.route('/audit/resource/<resource_type>/<resource_id>/history', methods=['GET'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin', 'auditor', 'analyst')
def get_resource_history(resource_type: str, resource_id: str):
    """
    Get complete audit history for a specific resource.
    
    Path Parameters:
        resource_type: Type of resource (e.g., 'dashboard', 'dag')
        resource_id: UUID of the resource
    
    Returns:
        JSON with resource's complete audit history
    """
    tenant_id = str(get_current_identity().tenant_id)
    
    history = AuditService.get_resource_history(
        tenant_id=tenant_id,
        resource_type=resource_type,
        resource_id=resource_id,
    )
    
    return jsonify({
        'success': True,
        'data': {
            'resource_type': resource_type,
            'resource_id': resource_id,
            'history': history,
            'count': len(history),
        },
    })


@api_v1_bp.route('/audit/integrity/verify', methods=['POST'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin')
def verify_audit_integrity():
    """
    Verify audit log chain integrity.
    
    Checks that the hash chain is unbroken and no entries have been tampered with.
    This is a security-sensitive operation that should be performed periodically.
    
    Returns:
        JSON with verification results including any integrity issues
    """
    tenant_id = str(get_current_identity().tenant_id)
    
    result = AuditService.verify_integrity(tenant_id=tenant_id)
    
    return jsonify({
        'success': True,
        'data': result,
    })


@api_v1_bp.route('/audit/security/events', methods=['GET'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin', 'security')
def get_security_events():
    """
    Get security-relevant events from the last N hours.
    
    Query Parameters:
        hours: Number of hours to look back (default: 24)
    
    Returns:
        JSON with security events summary and details
    """
    tenant_id = str(get_current_identity().tenant_id)
    hours = request.args.get('hours', 24, type=int)
    hours = min(hours, 168)  # Cap at 1 week
    
    events = AuditService.get_security_events(
        tenant_id=tenant_id,
        hours=hours,
    )
    
    return jsonify({
        'success': True,
        'data': events,
    })


@api_v1_bp.route('/audit/export', methods=['POST'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin', 'auditor')
def export_audit_logs():
    """
    Export audit logs for a date range.
    
    Request Body:
        start_date: ISO datetime for range start (required)
        end_date: ISO datetime for range end (required)
    
    Returns:
        JSON with exportable audit log entries including hash chain
    """
    tenant_id = str(get_current_identity().tenant_id)
    data = request.get_json() or {}
    
    if not data.get('start_date') or not data.get('end_date'):
        raise ValidationError("start_date and end_date are required")
    
    try:
        start_date = datetime.fromisoformat(
            data['start_date'].replace('Z', '+00:00')
        )
        end_date = datetime.fromisoformat(
            data['end_date'].replace('Z', '+00:00')
        )
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {e}")
    
    if end_date < start_date:
        raise ValidationError("end_date must be after start_date")
    
    # Limit export range to 90 days
    from datetime import timedelta
    if (end_date - start_date) > timedelta(days=90):
        raise ValidationError("Export range cannot exceed 90 days")
    
    logs = AuditService.export_logs(
        tenant_id=tenant_id,
        start_date=start_date,
        end_date=end_date,
    )
    
    # Log the export action
    AuditService.log(
        action='audit.exported',
        resource_type='audit_log',
        extra_data={
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'entry_count': len(logs),
        },
    )
    
    return jsonify({
        'success': True,
        'data': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'entries': logs,
            'count': len(logs),
        },
    })


@api_v1_bp.route('/audit/actions', methods=['GET'])
@authenticated
@require_tenant
@require_roles('tenant_admin', 'super_admin', 'auditor')
def list_audited_actions():
    """
    List all audited action types with their severity levels.
    
    Useful for building UI filters and understanding what actions are tracked.
    
    Returns:
        JSON with action types grouped by category
    """
    actions = AuditService.AUDITED_ACTIONS
    
    # Group by category (first part before the dot)
    grouped = {}
    for action, severity in actions.items():
        category = action.split('.')[0]
        if category not in grouped:
            grouped[category] = []
        grouped[category].append({
            'action': action,
            'severity': severity,
        })
    
    return jsonify({
        'success': True,
        'data': {
            'actions': grouped,
            'total_actions': len(actions),
        },
    })
