"""
Backup API Endpoints
====================

REST API endpoints for backup management and recovery operations.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify

from app.services.backup_service import (
    BackupService,
    PointInTimeRecovery,
    TenantRecoveryService
)
from app.platform.auth.decorators import authenticated, require_roles
from app.extensions import limiter
from app.utils.logger import get_logger

logger = get_logger('backup.api')

bp = Blueprint('backup', __name__, url_prefix='/backups')


@bp.route('/', methods=['GET'])
@authenticated
@require_roles(['super_admin'])
def list_backups():
    """List available backups.
    
    Query Parameters:
        service (str): Filter by service (postgresql, clickhouse, redis)
        days (int): Number of days to look back (default: 30)
        limit (int): Maximum number of results (default: 50)
    
    Returns:
        JSON array of backup metadata
    """
    service = request.args.get('service')
    days = request.args.get('days', 30, type=int)
    limit = request.args.get('limit', 50, type=int)
    
    try:
        backup_service = BackupService()
        
        if service:
            backups = backup_service.list_backups(service, days=days, limit=limit)
        else:
            # List all services
            backups = []
            for svc in BackupService.SUPPORTED_SERVICES.keys():
                backups.extend(backup_service.list_backups(svc, days=days))
            backups.sort(key=lambda x: x['created_at'], reverse=True)
            if limit:
                backups = backups[:limit]
        
        logger.info(
            f'Listed {len(backups)} backups',
            extra={'service': service, 'days': days}
        )
        
        return jsonify({
            'backups': backups,
            'total': len(backups),
            'filters': {
                'service': service,
                'days': days,
            }
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f'Failed to list backups: {e}')
        return jsonify({'error': 'Failed to list backups'}), 500


@bp.route('/<path:key>', methods=['GET'])
@authenticated
@require_roles(['super_admin'])
def get_backup_details(key: str):
    """Get detailed information about a specific backup.
    
    Args:
        key: S3 object key of the backup
    
    Returns:
        JSON object with backup details
    """
    try:
        backup_service = BackupService()
        details = backup_service.get_backup_details(key)
        
        return jsonify(details), 200
        
    except Exception as e:
        logger.error(f'Failed to get backup details: {e}')
        return jsonify({'error': 'Backup not found'}), 404


@bp.route('/<path:key>/download', methods=['GET'])
@authenticated
@require_roles(['super_admin'])
def get_backup_download_url(key: str):
    """Get a presigned URL for downloading a backup.
    
    Args:
        key: S3 object key of the backup
    
    Query Parameters:
        expires (int): URL expiration time in seconds (default: 3600)
    
    Returns:
        JSON object with presigned URL
    """
    expires = request.args.get('expires', 3600, type=int)
    
    # Limit expiration to 24 hours
    expires = min(expires, 86400)
    
    try:
        backup_service = BackupService()
        url = backup_service.get_backup_url(key, expires=expires)
        
        logger.info(
            f'Generated download URL for backup',
            extra={'key': key, 'expires_in': expires}
        )
        
        return jsonify({
            'url': url,
            'expires_in': expires,
            'key': key,
        }), 200
        
    except Exception as e:
        logger.error(f'Failed to generate download URL: {e}')
        return jsonify({'error': 'Failed to generate download URL'}), 500


@bp.route('/<path:key>/verify', methods=['POST'])
@authenticated
@require_roles(['super_admin'])
def verify_backup_integrity(key: str):
    """Verify backup integrity using checksum.
    
    Args:
        key: S3 object key of the backup
    
    Returns:
        JSON object with verification result
    """
    try:
        backup_service = BackupService()
        result = backup_service.verify_backup_integrity(key)
        
        status_code = 200 if result.get('verified') else 400
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f'Failed to verify backup: {e}')
        return jsonify({'error': 'Failed to verify backup'}), 500


@bp.route('/trigger', methods=['POST'])
@authenticated
@require_roles(['super_admin'])
@limiter.limit("5 per hour")
def trigger_backup():
    """Trigger an immediate backup for a service.
    
    Request Body:
        service (str): Service to backup (postgresql, clickhouse, redis)
    
    Returns:
        JSON object with job information
    """
    data = request.get_json() or {}
    service = data.get('service')
    
    if not service:
        return jsonify({'error': 'Service is required'}), 400
    
    try:
        backup_service = BackupService()
        result = backup_service.trigger_backup(service)
        
        logger.info(
            f'Triggered manual backup',
            extra={'service': service, 'job_name': result['job_name']}
        )
        
        return jsonify(result), 202
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.error(f'Failed to trigger backup: {e}')
        return jsonify({'error': 'Failed to trigger backup'}), 500


@bp.route('/jobs/<job_name>', methods=['GET'])
@authenticated
@require_roles(['super_admin'])
def get_backup_job_status(job_name: str):
    """Get the status of a backup job.
    
    Args:
        job_name: Kubernetes Job name
    
    Returns:
        JSON object with job status
    """
    try:
        backup_service = BackupService()
        status = backup_service.get_backup_job_status(job_name)
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f'Failed to get job status: {e}')
        return jsonify({'error': 'Job not found'}), 404


@bp.route('/stats', methods=['GET'])
@authenticated
@require_roles(['super_admin'])
def get_backup_stats():
    """Get backup statistics.
    
    Query Parameters:
        service (str): Optional service filter
    
    Returns:
        JSON object with backup statistics
    """
    service = request.args.get('service')
    
    try:
        backup_service = BackupService()
        stats = backup_service.get_backup_stats(service)
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f'Failed to get backup stats: {e}')
        return jsonify({'error': 'Failed to get backup statistics'}), 500


@bp.route('/<path:key>', methods=['DELETE'])
@authenticated
@require_roles(['super_admin'])
def delete_backup(key: str):
    """Delete a backup.
    
    CAUTION: This permanently deletes the backup.
    
    Args:
        key: S3 object key of the backup
    
    Returns:
        JSON object confirming deletion
    """
    try:
        backup_service = BackupService()
        result = backup_service.delete_backup(key)
        
        logger.warning(
            f'Backup deleted',
            extra={'key': key}
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f'Failed to delete backup: {e}')
        return jsonify({'error': 'Failed to delete backup'}), 500


# PITR Endpoints

@bp.route('/pitr/recovery-points', methods=['GET'])
@authenticated
@require_roles(['super_admin'])
def get_pitr_recovery_points():
    """Get available point-in-time recovery points.
    
    Query Parameters:
        start_time (str): Start of time range (ISO format)
        end_time (str): End of time range (ISO format)
    
    Returns:
        JSON array of recovery points
    """
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    
    if not start_time or not end_time:
        return jsonify({'error': 'start_time and end_time are required'}), 400
    
    try:
        start = datetime.fromisoformat(start_time.replace('Z', ''))
        end = datetime.fromisoformat(end_time.replace('Z', ''))
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    try:
        pitr = PointInTimeRecovery()
        points = pitr.get_recovery_points(start, end)
        
        return jsonify({
            'recovery_points': points,
            'total': len(points),
            'time_range': {
                'start': start.isoformat(),
                'end': end.isoformat(),
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Failed to get recovery points: {e}')
        return jsonify({'error': 'Failed to get recovery points'}), 500


@bp.route('/pitr/recover', methods=['POST'])
@authenticated
@require_roles(['super_admin'])
@limiter.limit("3 per hour")
def initiate_pitr():
    """Initiate point-in-time recovery.
    
    Request Body:
        target_time (str): Target recovery time (ISO format)
        base_backup (str): Optional base backup key
        target_database (str): Optional target database name
    
    Returns:
        JSON object with recovery job information
    """
    data = request.get_json() or {}
    target_time_str = data.get('target_time')
    base_backup = data.get('base_backup')
    target_database = data.get('target_database', 'novasight_pitr_restore')
    
    if not target_time_str:
        return jsonify({'error': 'target_time is required'}), 400
    
    try:
        target_time = datetime.fromisoformat(target_time_str.replace('Z', ''))
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    try:
        pitr = PointInTimeRecovery()
        result = pitr.initiate_recovery(
            target_time=target_time,
            base_backup=base_backup,
            target_database=target_database
        )
        
        logger.warning(
            f'Initiated PITR',
            extra={
                'target_time': target_time.isoformat(),
                'target_database': target_database,
            }
        )
        
        return jsonify(result), 202
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f'Failed to initiate PITR: {e}')
        return jsonify({'error': 'Failed to initiate recovery'}), 500


# Tenant Recovery Endpoints

@bp.route('/tenant/recover', methods=['POST'])
@authenticated
@require_roles(['super_admin'])
@limiter.limit("10 per hour")
def recover_tenant_data():
    """Recover data for a specific tenant.
    
    Request Body:
        tenant_id (str): UUID of the tenant
        backup_key (str): S3 key of the backup
        target_schema (str): Optional target schema name
    
    Returns:
        JSON object with recovery status
    """
    data = request.get_json() or {}
    tenant_id = data.get('tenant_id')
    backup_key = data.get('backup_key')
    target_schema = data.get('target_schema')
    
    if not tenant_id or not backup_key:
        return jsonify({'error': 'tenant_id and backup_key are required'}), 400
    
    try:
        tenant_recovery = TenantRecoveryService()
        result = tenant_recovery.recover_tenant_data(
            tenant_id=tenant_id,
            backup_key=backup_key,
            target_schema=target_schema
        )
        
        logger.warning(
            f'Initiated tenant recovery',
            extra={
                'tenant_id': tenant_id,
                'backup_key': backup_key,
            }
        )
        
        return jsonify(result), 202
        
    except Exception as e:
        logger.error(f'Failed to initiate tenant recovery: {e}')
        return jsonify({'error': 'Failed to initiate tenant recovery'}), 500
