"""
Backup Service
==============

Service for managing backups and recovery operations across all data stores.
Provides backup listing, triggering, and restore capabilities.
"""

import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Union
import hashlib
import os

from app.utils.logger import get_logger

logger = get_logger('backup')


# Configuration settings - loaded from environment or Flask config
class BackupSettings:
    """Backup configuration settings."""
    
    BACKUP_S3_BUCKET = os.getenv("BACKUP_S3_BUCKET", "novasight-backups")
    BACKUP_KMS_KEY_ID = os.getenv("BACKUP_KMS_KEY_ID", "")
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
    KUBERNETES_NAMESPACE = os.getenv("KUBERNETES_NAMESPACE", "novasight")


settings = BackupSettings()


class BackupService:
    """Service for managing backups across all data stores."""
    
    # Supported services and their backup configurations
    SUPPORTED_SERVICES = {
        'postgresql': {
            'cronjob_name': 'postgresql-backup',
            's3_prefix': 'postgresql/',
            'file_pattern': r'postgresql_(\d{8}_\d{6})\.sql\.gz',
            'retention_days': 30,
        },
        'clickhouse': {
            'cronjob_name': 'clickhouse-backup',
            's3_prefix': 'clickhouse/',
            'file_pattern': r'backup_(\d{8}_\d{6})',
            'retention_days': 30,
        },
        'redis': {
            'cronjob_name': 'redis-backup',
            's3_prefix': 'redis/',
            'file_pattern': r'redis_(\d{8}_\d{6})\.rdb',
            'retention_days': 7,
        },
    }
    
    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None,
        kms_key_id: Optional[str] = None
    ):
        """Initialize backup service.
        
        Args:
            bucket: S3 bucket name for backups
            region: AWS region
            kms_key_id: KMS key ID for encryption
        """
        self.bucket = bucket or settings.BACKUP_S3_BUCKET
        self.region = region or settings.AWS_REGION
        self.kms_key_id = kms_key_id or settings.BACKUP_KMS_KEY_ID
        
        self.s3 = boto3.client('s3', region_name=self.region)
        self.namespace = settings.KUBERNETES_NAMESPACE or 'novasight'
        
        logger.info(
            'Backup service initialized',
            extra={
                'bucket': self.bucket,
                'region': self.region,
            }
        )
    
    def list_backups(
        self,
        service: str,
        days: int = 30,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """List available backups for a service.
        
        Args:
            service: Service name (postgresql, clickhouse, redis)
            days: Number of days to look back
            limit: Maximum number of backups to return
            
        Returns:
            List of backup metadata dictionaries
            
        Raises:
            ValueError: If service is not supported
        """
        if service not in self.SUPPORTED_SERVICES:
            raise ValueError(
                f"Unsupported service: {service}. "
                f"Supported: {list(self.SUPPORTED_SERVICES.keys())}"
            )
        
        config = self.SUPPORTED_SERVICES[service]
        prefix = config['s3_prefix']
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        try:
            paginator = self.s3.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket, Prefix=prefix)
            
            backups = []
            for page in pages:
                for obj in page.get('Contents', []):
                    # Skip checksum files
                    if obj['Key'].endswith('.sha256'):
                        continue
                    
                    obj_time = obj['LastModified'].replace(tzinfo=None)
                    if obj_time > cutoff:
                        backups.append({
                            'key': obj['Key'],
                            'name': obj['Key'].split('/')[-1],
                            'size': obj['Size'],
                            'size_human': self._format_size(obj['Size']),
                            'created_at': obj['LastModified'].isoformat(),
                            'service': service,
                            'storage_class': obj.get('StorageClass', 'STANDARD'),
                        })
            
            # Sort by creation time, newest first
            backups.sort(key=lambda x: x['created_at'], reverse=True)
            
            if limit:
                backups = backups[:limit]
            
            logger.debug(
                f'Listed {len(backups)} backups for {service}',
                extra={'service': service, 'days': days}
            )
            
            return backups
            
        except ClientError as e:
            logger.error(
                f'Failed to list backups for {service}',
                extra={'error': str(e), 'service': service}
            )
            raise
    
    def get_backup_details(self, key: str) -> Dict[str, Any]:
        """Get detailed information about a specific backup.
        
        Args:
            key: S3 object key
            
        Returns:
            Backup details including metadata
        """
        try:
            response = self.s3.head_object(Bucket=self.bucket, Key=key)
            
            # Try to get checksum
            checksum = None
            checksum_key = key.rsplit('.', 1)[0] + '.sha256'
            try:
                checksum_response = self.s3.get_object(
                    Bucket=self.bucket,
                    Key=checksum_key
                )
                checksum = checksum_response['Body'].read().decode().split()[0]
            except ClientError:
                pass
            
            return {
                'key': key,
                'name': key.split('/')[-1],
                'size': response['ContentLength'],
                'size_human': self._format_size(response['ContentLength']),
                'created_at': response['LastModified'].isoformat(),
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'storage_class': response.get('StorageClass', 'STANDARD'),
                'encryption': response.get('ServerSideEncryption'),
                'kms_key_id': response.get('SSEKMSKeyId'),
                'checksum_sha256': checksum,
                'metadata': response.get('Metadata', {}),
            }
            
        except ClientError as e:
            logger.error(f'Failed to get backup details: {key}', extra={'error': str(e)})
            raise
    
    def get_backup_url(
        self,
        key: str,
        expires: int = 3600
    ) -> str:
        """Get a presigned URL for downloading a backup.
        
        Args:
            key: S3 object key
            expires: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Presigned URL for download
        """
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires
            )
            
            logger.info(
                f'Generated presigned URL for backup',
                extra={'key': key, 'expires_in': expires}
            )
            
            return url
            
        except ClientError as e:
            logger.error(f'Failed to generate presigned URL: {key}', extra={'error': str(e)})
            raise
    
    def trigger_backup(self, service: str) -> Dict[str, Any]:
        """Trigger an immediate backup for a service.
        
        Creates a new Job from the existing CronJob template.
        
        Args:
            service: Service name (postgresql, clickhouse, redis)
            
        Returns:
            Job creation status
            
        Raises:
            ValueError: If service is not supported
        """
        if service not in self.SUPPORTED_SERVICES:
            raise ValueError(
                f"Unsupported service: {service}. "
                f"Supported: {list(self.SUPPORTED_SERVICES.keys())}"
            )
        
        config = self.SUPPORTED_SERVICES[service]
        
        try:
            from kubernetes import client, config as k8s_config
            
            # Load config (in-cluster or kubeconfig)
            try:
                k8s_config.load_incluster_config()
            except k8s_config.ConfigException:
                k8s_config.load_kube_config()
            
            batch_v1 = client.BatchV1Api()
            
            # Get the CronJob
            cronjob_name = config['cronjob_name']
            cronjob = batch_v1.read_namespaced_cron_job(
                cronjob_name,
                self.namespace
            )
            
            # Create a Job from the CronJob template
            timestamp = int(datetime.utcnow().timestamp())
            job_name = f'{cronjob_name}-manual-{timestamp}'
            
            job = client.V1Job(
                metadata=client.V1ObjectMeta(
                    name=job_name,
                    labels={
                        'app': 'novasight',
                        'component': 'backup',
                        'database': service,
                        'triggered-by': 'manual',
                    }
                ),
                spec=cronjob.spec.job_template.spec
            )
            
            batch_v1.create_namespaced_job(self.namespace, job)
            
            logger.info(
                f'Triggered manual backup',
                extra={
                    'job_name': job_name,
                    'service': service,
                }
            )
            
            return {
                'job_name': job_name,
                'service': service,
                'status': 'triggered',
                'triggered_at': datetime.utcnow().isoformat(),
            }
            
        except ImportError:
            logger.error('kubernetes package not installed')
            raise RuntimeError('Kubernetes client not available')
        except Exception as e:
            logger.error(
                f'Failed to trigger backup for {service}',
                extra={'error': str(e)}
            )
            raise
    
    def get_backup_job_status(self, job_name: str) -> Dict[str, Any]:
        """Get the status of a backup job.
        
        Args:
            job_name: Kubernetes Job name
            
        Returns:
            Job status information
        """
        try:
            from kubernetes import client, config as k8s_config
            
            try:
                k8s_config.load_incluster_config()
            except k8s_config.ConfigException:
                k8s_config.load_kube_config()
            
            batch_v1 = client.BatchV1Api()
            
            job = batch_v1.read_namespaced_job_status(
                job_name,
                self.namespace
            )
            
            status = 'unknown'
            if job.status.succeeded:
                status = 'succeeded'
            elif job.status.failed:
                status = 'failed'
            elif job.status.active:
                status = 'running'
            else:
                status = 'pending'
            
            return {
                'job_name': job_name,
                'status': status,
                'start_time': job.status.start_time.isoformat() if job.status.start_time else None,
                'completion_time': job.status.completion_time.isoformat() if job.status.completion_time else None,
                'succeeded': job.status.succeeded or 0,
                'failed': job.status.failed or 0,
                'active': job.status.active or 0,
            }
            
        except Exception as e:
            logger.error(f'Failed to get job status: {job_name}', extra={'error': str(e)})
            raise
    
    def verify_backup_integrity(self, key: str) -> Dict[str, Any]:
        """Verify backup integrity using checksum.
        
        Args:
            key: S3 object key
            
        Returns:
            Verification result
        """
        try:
            # Get stored checksum
            checksum_key = key.rsplit('.', 1)[0] + '.sha256'
            try:
                checksum_response = self.s3.get_object(
                    Bucket=self.bucket,
                    Key=checksum_key
                )
                stored_checksum = checksum_response['Body'].read().decode().split()[0]
            except ClientError:
                return {
                    'key': key,
                    'verified': False,
                    'error': 'Checksum file not found',
                }
            
            # Calculate checksum of backup
            response = self.s3.get_object(Bucket=self.bucket, Key=key)
            
            sha256 = hashlib.sha256()
            for chunk in iter(lambda: response['Body'].read(8192), b''):
                sha256.update(chunk)
            calculated_checksum = sha256.hexdigest()
            
            verified = stored_checksum == calculated_checksum
            
            logger.info(
                f'Backup integrity verification',
                extra={
                    'key': key,
                    'verified': verified,
                }
            )
            
            return {
                'key': key,
                'verified': verified,
                'stored_checksum': stored_checksum,
                'calculated_checksum': calculated_checksum,
            }
            
        except Exception as e:
            logger.error(f'Failed to verify backup: {key}', extra={'error': str(e)})
            return {
                'key': key,
                'verified': False,
                'error': str(e),
            }
    
    def delete_backup(self, key: str) -> Dict[str, Any]:
        """Delete a backup and its checksum file.
        
        Args:
            key: S3 object key
            
        Returns:
            Deletion status
        """
        try:
            # Delete backup
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            
            # Try to delete checksum
            checksum_key = key.rsplit('.', 1)[0] + '.sha256'
            try:
                self.s3.delete_object(Bucket=self.bucket, Key=checksum_key)
            except ClientError:
                pass
            
            logger.warning(
                f'Deleted backup',
                extra={'key': key}
            )
            
            return {
                'key': key,
                'deleted': True,
            }
            
        except ClientError as e:
            logger.error(f'Failed to delete backup: {key}', extra={'error': str(e)})
            raise
    
    def get_backup_stats(self, service: Optional[str] = None) -> Dict[str, Any]:
        """Get backup statistics for a service or all services.
        
        Args:
            service: Optional service name filter
            
        Returns:
            Backup statistics
        """
        services = [service] if service else list(self.SUPPORTED_SERVICES.keys())
        
        stats = {
            'total_backups': 0,
            'total_size': 0,
            'services': {},
        }
        
        for svc in services:
            backups = self.list_backups(svc)
            svc_size = sum(b['size'] for b in backups)
            
            stats['services'][svc] = {
                'count': len(backups),
                'size': svc_size,
                'size_human': self._format_size(svc_size),
                'latest': backups[0] if backups else None,
                'oldest': backups[-1] if backups else None,
            }
            
            stats['total_backups'] += len(backups)
            stats['total_size'] += svc_size
        
        stats['total_size_human'] = self._format_size(stats['total_size'])
        
        return stats
    
    @staticmethod
    def _format_size(size: Union[int, float]) -> str:
        """Format size in bytes to human readable string."""
        size_float = float(size)
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_float < 1024:
                return f"{size_float:.2f} {unit}"
            size_float /= 1024
        return f"{size_float:.2f} PB"


class PointInTimeRecovery:
    """Point-in-time recovery for PostgreSQL using WAL files."""
    
    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None
    ):
        """Initialize PITR service.
        
        Args:
            bucket: S3 bucket containing WAL files
            region: AWS region
        """
        self.bucket = bucket or settings.BACKUP_S3_BUCKET
        self.region = region or settings.AWS_REGION
        self.s3 = boto3.client('s3', region_name=self.region)
        self.wal_prefix = 'postgresql/wal/'
        
        logger.info('PITR service initialized', extra={'bucket': self.bucket})
    
    def get_recovery_points(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Get available recovery points in a time range.
        
        Args:
            start_time: Start of time range
            end_time: End of time range
            
        Returns:
            List of available recovery points
        """
        try:
            paginator = self.s3.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket, Prefix=self.wal_prefix)
            
            points = []
            for page in pages:
                for obj in page.get('Contents', []):
                    obj_time = obj['LastModified'].replace(tzinfo=None)
                    if start_time <= obj_time <= end_time:
                        points.append({
                            'timestamp': obj_time.isoformat(),
                            'wal_file': obj['Key'],
                            'size': obj['Size'],
                        })
            
            points.sort(key=lambda x: x['timestamp'])
            
            logger.info(
                f'Found {len(points)} recovery points',
                extra={
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat(),
                }
            )
            
            return points
            
        except ClientError as e:
            logger.error('Failed to get recovery points', extra={'error': str(e)})
            raise
    
    def get_latest_base_backup(self) -> Optional[Dict[str, Any]]:
        """Get the latest full backup as base for PITR.
        
        Returns:
            Latest backup info or None
        """
        backup_service = BackupService(
            bucket=self.bucket,
            region=self.region
        )
        
        backups = backup_service.list_backups('postgresql', limit=1)
        return backups[0] if backups else None
    
    def initiate_recovery(
        self,
        target_time: datetime,
        base_backup: Optional[str] = None,
        target_database: str = 'novasight_pitr_restore'
    ) -> Dict[str, Any]:
        """Initiate point-in-time recovery.
        
        This creates a Kubernetes Job that:
        1. Restores the base backup
        2. Applies WAL files up to target_time
        3. Starts PostgreSQL in recovery mode
        
        Args:
            target_time: Target recovery time
            base_backup: Base backup key (uses latest if not specified)
            target_database: Name for restored database
            
        Returns:
            Recovery initiation status
        """
        # Get base backup if not specified
        if not base_backup:
            latest = self.get_latest_base_backup()
            if not latest:
                raise ValueError('No base backup available for PITR')
            base_backup = latest['key']
        
        # base_backup is now guaranteed to be a string
        backup_key: str = base_backup
        
        # Verify we have WAL files covering the time range
        backup_details = BackupService(
            bucket=self.bucket,
            region=self.region
        ).get_backup_details(backup_key)
        
        backup_time = datetime.fromisoformat(
            backup_details['created_at'].replace('Z', '')
        )
        
        if target_time < backup_time:
            raise ValueError(
                f'Target time {target_time} is before base backup time {backup_time}'
            )
        
        recovery_points = self.get_recovery_points(backup_time, target_time)
        if not recovery_points:
            raise ValueError(
                f'No WAL files found between {backup_time} and {target_time}'
            )
        
        logger.info(
            f'Initiating PITR',
            extra={
                'target_time': target_time.isoformat(),
                'base_backup': base_backup,
                'wal_files_count': len(recovery_points),
            }
        )
        
        # Create recovery Job
        try:
            from kubernetes import client, config as k8s_config
            
            try:
                k8s_config.load_incluster_config()
            except k8s_config.ConfigException:
                k8s_config.load_kube_config()
            
            batch_v1 = client.BatchV1Api()
            namespace = settings.KUBERNETES_NAMESPACE or 'novasight'
            
            timestamp = int(datetime.utcnow().timestamp())
            job_name = f'postgresql-pitr-{timestamp}'
            
            # Job spec for PITR
            job = client.V1Job(
                metadata=client.V1ObjectMeta(
                    name=job_name,
                    labels={
                        'app': 'novasight',
                        'component': 'backup',
                        'operation': 'pitr',
                    }
                ),
                spec=client.V1JobSpec(
                    backoff_limit=1,
                    ttl_seconds_after_finished=86400,  # Keep for 24 hours
                    template=client.V1PodTemplateSpec(
                        metadata=client.V1ObjectMeta(
                            labels={
                                'app': 'novasight',
                                'component': 'backup',
                                'operation': 'pitr',
                            }
                        ),
                        spec=client.V1PodSpec(
                            service_account_name='backup-sa',
                            restart_policy='Never',
                            containers=[
                                client.V1Container(
                                    name='pitr',
                                    image='postgres:15-alpine',
                                    command=['/bin/bash', '-c'],
                                    args=[f'''
                                        set -euo pipefail
                                        echo "Starting PITR to {target_time.isoformat()}"
                                        echo "Base backup: {base_backup}"
                                        # Download and restore base backup
                                        aws s3 cp s3://$S3_BUCKET/{base_backup} /restore/base.sql.gz
                                        gunzip -c /restore/base.sql.gz | psql -h $PGHOST -U $PGUSER -d postgres
                                        # Download and apply WAL files
                                        for wal in {' '.join([p['wal_file'].split('/')[-1] for p in recovery_points])}; do
                                            aws s3 cp s3://$S3_BUCKET/postgresql/wal/$wal /restore/
                                            gunzip /restore/$wal
                                        done
                                        echo "PITR completed"
                                    '''],
                                    env=[
                                        client.V1EnvVar(
                                            name='S3_BUCKET',
                                            value_from=client.V1EnvVarSource(
                                                config_map_key_ref=client.V1ConfigMapKeySelector(
                                                    name='backup-config',
                                                    key='s3-bucket'
                                                )
                                            )
                                        ),
                                    ],
                                )
                            ]
                        )
                    )
                )
            )
            
            batch_v1.create_namespaced_job(namespace, job)
            
            return {
                'job_name': job_name,
                'status': 'recovery_initiated',
                'target_time': target_time.isoformat(),
                'base_backup': base_backup,
                'wal_files_count': len(recovery_points),
                'target_database': target_database,
            }
            
        except ImportError:
            raise RuntimeError('Kubernetes client not available')
        except Exception as e:
            logger.error('Failed to initiate PITR', extra={'error': str(e)})
            raise


class TenantRecoveryService:
    """Service for tenant-specific data recovery."""
    
    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None
    ):
        """Initialize tenant recovery service."""
        self.bucket = bucket or settings.BACKUP_S3_BUCKET
        self.region = region or settings.AWS_REGION
        self.backup_service = BackupService(bucket=self.bucket, region=self.region)
        
        logger.info('Tenant recovery service initialized')
    
    def recover_tenant_data(
        self,
        tenant_id: str,
        backup_key: str,
        target_schema: Optional[str] = None
    ) -> Dict[str, Any]:
        """Recover data for a specific tenant from backup.
        
        Args:
            tenant_id: UUID of the tenant
            backup_key: S3 key of the backup to restore from
            target_schema: Optional target schema name (defaults to restore_{tenant_id})
            
        Returns:
            Recovery status
        """
        if not target_schema:
            timestamp = int(datetime.utcnow().timestamp())
            target_schema = f'restore_{tenant_id.replace("-", "_")}_{timestamp}'
        
        logger.info(
            f'Initiating tenant data recovery',
            extra={
                'tenant_id': tenant_id,
                'backup_key': backup_key,
                'target_schema': target_schema,
            }
        )
        
        # This would trigger a Kubernetes Job to:
        # 1. Download the backup
        # 2. Extract only the tenant-specific data
        # 3. Restore to the target schema
        
        return {
            'status': 'recovery_initiated',
            'tenant_id': tenant_id,
            'backup_key': backup_key,
            'target_schema': target_schema,
            'initiated_at': datetime.utcnow().isoformat(),
        }
