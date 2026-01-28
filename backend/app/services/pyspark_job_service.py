"""
NovaSight PySpark Job Service
==============================

Business logic for PySpark job configuration management.
"""

import hashlib
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from flask import g
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

from app.extensions import db
from app.models.pyspark_job import (
    PySparkJobConfig,
    SourceType,
    SCDType,
    WriteMode,
    JobStatus,
)
from app.models.connection import DataConnection
from app.services.template_engine.engine import TemplateEngine
from app.services.connection_service import ConnectionService
from app.errors import ValidationError, NotFoundError, ConflictError

logger = logging.getLogger(__name__)


class PySparkJobService:
    """
    Service for managing PySpark job configurations.
    
    Handles CRUD operations, code generation, and validation
    for PySpark data ingestion jobs.
    """
    
    def __init__(self, tenant_id: str):
        """
        Initialize service with tenant context.
        
        Args:
            tenant_id: Tenant UUID
        """
        self.tenant_id = tenant_id
        self.template_engine = TemplateEngine()
        self.connection_service = ConnectionService(tenant_id)
    
    def list_jobs(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        connection_id: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List PySpark jobs for tenant with optional filtering.
        
        Args:
            page: Page number (1-indexed)
            per_page: Items per page
            status: Filter by job status
            connection_id: Filter by connection
            search: Search in job name or description
        
        Returns:
            Dictionary with paginated results
        """
        query = PySparkJobConfig.for_tenant(self.tenant_id)
        
        # Apply filters
        if status:
            try:
                status_enum = JobStatus(status)
                query = query.filter(PySparkJobConfig.status == status_enum)
            except ValueError:
                raise ValidationError(f"Invalid status: {status}")
        
        if connection_id:
            query = query.filter(PySparkJobConfig.connection_id == connection_id)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    PySparkJobConfig.job_name.ilike(search_pattern),
                    PySparkJobConfig.description.ilike(search_pattern)
                )
            )
        
        # Order by most recently updated
        query = query.order_by(PySparkJobConfig.updated_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            "items": [job.to_dict() for job in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages,
        }
    
    def get_job(self, job_id: str, include_code: bool = False) -> Dict[str, Any]:
        """
        Get a specific PySpark job by ID.
        
        Args:
            job_id: Job UUID
            include_code: Include generated code in response
        
        Returns:
            Job configuration dictionary
        
        Raises:
            NotFoundError: If job not found
        """
        job = PySparkJobConfig.for_tenant(self.tenant_id).filter(
            PySparkJobConfig.id == job_id
        ).first()
        
        if not job:
            raise NotFoundError(f"PySpark job not found: {job_id}")
        
        return job.to_dict(include_code=include_code)
    
    def create_job(self, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """
        Create a new PySpark job configuration.
        
        Args:
            data: Job configuration data
            user_id: Creating user UUID
        
        Returns:
            Created job configuration
        
        Raises:
            ValidationError: If data is invalid
            ConflictError: If job name already exists
        """
        # Validate required fields
        required_fields = [
            "job_name",
            "connection_id",
            "source_type",
            "target_database",
            "target_table",
        ]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Field '{field}' is required")
        
        # Validate job name format
        job_name = data["job_name"]
        if not job_name.replace("_", "").replace("-", "").isalnum():
            raise ValidationError(
                "Job name must contain only alphanumeric characters, underscores, and hyphens"
            )
        
        # Validate connection exists and belongs to tenant
        connection = self.connection_service.get_connection(data["connection_id"])
        if not connection:
            raise NotFoundError(f"Connection not found: {data['connection_id']}")
        
        # Validate source type and source configuration
        source_type = SourceType(data["source_type"])
        if source_type == SourceType.TABLE and not data.get("source_table"):
            raise ValidationError("source_table is required when source_type is 'table'")
        if source_type == SourceType.SQL_QUERY and not data.get("source_query"):
            raise ValidationError("source_query is required when source_type is 'sql_query'")
        
        # Validate SCD type and write mode
        try:
            scd_type = SCDType(data.get("scd_type", "type_1"))
            write_mode = WriteMode(data.get("write_mode", "append"))
        except ValueError as e:
            raise ValidationError(f"Invalid enum value: {str(e)}")
        
        # Create job config
        try:
            job = PySparkJobConfig(
                tenant_id=self.tenant_id,
                job_name=job_name,
                description=data.get("description", ""),
                connection_id=data["connection_id"],
                source_type=source_type,
                source_table=data.get("source_table"),
                source_query=data.get("source_query"),
                selected_columns=data.get("selected_columns", []),
                primary_keys=data.get("primary_keys", []),
                scd_type=scd_type,
                write_mode=write_mode,
                cdc_column=data.get("cdc_column"),
                partition_columns=data.get("partition_columns", []),
                target_database=data["target_database"],
                target_table=data["target_table"],
                target_schema=data.get("target_schema"),
                spark_config=data.get("spark_config", {}),
                status=JobStatus.DRAFT,
                created_by=user_id,
            )
            
            db.session.add(job)
            db.session.commit()
            
            logger.info(f"Created PySpark job: {job_name} (ID: {job.id})")
            
            return job.to_dict()
            
        except IntegrityError as e:
            db.session.rollback()
            if "uq_tenant_job_name" in str(e):
                raise ConflictError(f"Job name '{job_name}' already exists")
            raise
    
    def update_job(
        self,
        job_id: str,
        data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Update an existing PySpark job configuration.
        
        Args:
            job_id: Job UUID
            data: Updated job configuration data
            user_id: Updating user UUID
        
        Returns:
            Updated job configuration
        
        Raises:
            NotFoundError: If job not found
            ValidationError: If data is invalid
        """
        job = PySparkJobConfig.for_tenant(self.tenant_id).filter(
            PySparkJobConfig.id == job_id
        ).first()
        
        if not job:
            raise NotFoundError(f"PySpark job not found: {job_id}")
        
        # Update allowed fields
        if "description" in data:
            job.description = data["description"]
        
        if "source_type" in data:
            try:
                job.source_type = SourceType(data["source_type"])
            except ValueError:
                raise ValidationError(f"Invalid source_type: {data['source_type']}")
        
        if "source_table" in data:
            job.source_table = data["source_table"]
        
        if "source_query" in data:
            job.source_query = data["source_query"]
        
        if "selected_columns" in data:
            job.selected_columns = data["selected_columns"]
        
        if "primary_keys" in data:
            job.primary_keys = data["primary_keys"]
        
        if "scd_type" in data:
            try:
                job.scd_type = SCDType(data["scd_type"])
            except ValueError:
                raise ValidationError(f"Invalid scd_type: {data['scd_type']}")
        
        if "write_mode" in data:
            try:
                job.write_mode = WriteMode(data["write_mode"])
            except ValueError:
                raise ValidationError(f"Invalid write_mode: {data['write_mode']}")
        
        if "cdc_column" in data:
            job.cdc_column = data["cdc_column"]
        
        if "partition_columns" in data:
            job.partition_columns = data["partition_columns"]
        
        if "target_database" in data:
            job.target_database = data["target_database"]
        
        if "target_table" in data:
            job.target_table = data["target_table"]
        
        if "target_schema" in data:
            job.target_schema = data["target_schema"]
        
        if "spark_config" in data:
            job.spark_config = data["spark_config"]
        
        if "status" in data:
            try:
                job.status = JobStatus(data["status"])
            except ValueError:
                raise ValidationError(f"Invalid status: {data['status']}")
        
        # Update audit fields
        job.updated_by = user_id
        job.config_version += 1
        
        # Clear generated code to force regeneration
        job.generated_code = None
        job.code_hash = None
        
        try:
            db.session.commit()
            logger.info(f"Updated PySpark job: {job.job_name} (ID: {job.id})")
            
            return job.to_dict()
            
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Unable to update job - constraint violation")
    
    def delete_job(self, job_id: str) -> None:
        """
        Delete a PySpark job configuration.
        
        Args:
            job_id: Job UUID
        
        Raises:
            NotFoundError: If job not found
        """
        job = PySparkJobConfig.for_tenant(self.tenant_id).filter(
            PySparkJobConfig.id == job_id
        ).first()
        
        if not job:
            raise NotFoundError(f"PySpark job not found: {job_id}")
        
        db.session.delete(job)
        db.session.commit()
        
        logger.info(f"Deleted PySpark job: {job.job_name} (ID: {job.id})")
    
    def generate_code(self, job_id: str) -> Dict[str, Any]:
        """
        Generate PySpark code for a job configuration.
        
        Args:
            job_id: Job UUID
        
        Returns:
            Dictionary with generated code and metadata
        
        Raises:
            NotFoundError: If job not found
        """
        job = PySparkJobConfig.for_tenant(self.tenant_id).filter(
            PySparkJobConfig.id == job_id
        ).first()
        
        if not job:
            raise NotFoundError(f"PySpark job not found: {job_id}")
        
        # Get connection details
        connection = self.connection_service.get_connection(str(job.connection_id))
        
        # Build template parameters
        template_params = {
            "job_name": job.job_name,
            "description": job.description or f"PySpark job for {job.target_table}",
            "connection_config": {
                "jdbc_url": connection.get("jdbc_url", ""),
                "username": connection.get("username", ""),
                "password": "{{password}}",  # Placeholder - will be injected at runtime
                "driver": self._get_jdbc_driver(connection.get("db_type", "")),
            },
            "source_type": job.source_type.value,
            "source_table": job.source_table,
            "source_query": job.source_query,
            "selected_columns": job.selected_columns,
            "primary_keys": job.primary_keys,
            "scd_type": job.scd_type.value,
            "write_mode": job.write_mode.value,
            "cdc_column": job.cdc_column,
            "partition_columns": job.partition_columns,
            "target_database": job.target_database,
            "target_table": job.target_table,
            "target_schema": job.target_schema,
            "spark_config": job.spark_config,
        }
        
        # Calculate config hash
        config_json = json.dumps(template_params, sort_keys=True)
        config_hash = hashlib.sha256(config_json.encode()).hexdigest()
        
        # Check if regeneration is needed
        if job.requires_regeneration(config_hash):
            try:
                # Generate code from template
                generated_code = self.template_engine.render(
                    "pyspark/data_ingestion.py.j2",
                    template_params
                )
                
                # Store generated code
                job.generated_code = generated_code
                job.code_hash = config_hash
                job.last_generated_at = datetime.utcnow()
                
                db.session.commit()
                
                logger.info(f"Generated code for PySpark job: {job.job_name}")
                
            except Exception as e:
                logger.error(f"Error generating code: {str(e)}")
                raise ValidationError(f"Code generation failed: {str(e)}")
        else:
            logger.info(f"Using cached code for PySpark job: {job.job_name}")
        
        return {
            "job_id": str(job.id),
            "job_name": job.job_name,
            "code": job.generated_code,
            "code_hash": job.code_hash,
            "generated_at": job.last_generated_at.isoformat() if job.last_generated_at else None,
            "config_version": job.config_version,
        }
    
    def _get_jdbc_driver(self, db_type: str) -> str:
        """Get JDBC driver class name for database type."""
        driver_map = {
            "postgresql": "org.postgresql.Driver",
            "oracle": "oracle.jdbc.OracleDriver",
            "sqlserver": "com.microsoft.sqlserver.jdbc.SQLServerDriver",
            "mysql": "com.mysql.cj.jdbc.Driver",
            "clickhouse": "com.clickhouse.jdbc.ClickHouseDriver",
        }
        return driver_map.get(db_type.lower(), "org.postgresql.Driver")
