"""
NovaSight Infrastructure Configuration Schemas
===============================================

Marshmallow schemas for infrastructure server configuration API.
"""

from marshmallow import Schema, fields, validate, validates, validates_schema, ValidationError, post_load
from typing import Optional


# =====================================================
# Common Infrastructure Configuration Fields
# =====================================================

class BaseInfrastructureConfigSchema(Schema):
    """Base schema with common fields for all infrastructure configs."""
    
    id = fields.UUID(dump_only=True)
    service_type = fields.Str(
        required=True,
        validate=validate.OneOf(['clickhouse', 'spark', 'airflow']),
        metadata={"description": "Infrastructure service type"}
    )
    tenant_id = fields.UUID(
        allow_none=True,
        load_default=None,
        metadata={"description": "Tenant ID for tenant-specific config (null for global)"}
    )
    name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255),
        metadata={"description": "Configuration display name"}
    )
    description = fields.Str(
        allow_none=True,
        validate=validate.Length(max=1000),
        metadata={"description": "Configuration description"}
    )
    host = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255),
        metadata={"description": "Server hostname or IP"}
    )
    port = fields.Int(
        required=True,
        validate=validate.Range(min=1, max=65535),
        metadata={"description": "Server port"}
    )
    is_active = fields.Bool(
        load_default=True,
        metadata={"description": "Whether this configuration is active"}
    )
    is_system_default = fields.Bool(
        dump_only=True,
        metadata={"description": "Whether this is a system default (read-only)"}
    )
    settings = fields.Dict(
        load_default=dict,
        metadata={"description": "Service-specific settings"}
    )
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    last_test_at = fields.DateTime(dump_only=True)
    last_test_success = fields.Bool(dump_only=True)
    last_test_message = fields.Str(dump_only=True)


# =====================================================
# ClickHouse Configuration Schemas
# =====================================================

class ClickHouseSettingsSchema(Schema):
    """Settings specific to ClickHouse connections."""
    
    database = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
        metadata={"description": "Default database name"}
    )
    user = fields.Str(
        load_default="default",
        validate=validate.Length(max=100),
        metadata={"description": "ClickHouse username"}
    )
    password = fields.Str(
        load_only=True,
        allow_none=True,
        metadata={"description": "ClickHouse password (write-only)"}
    )
    secure = fields.Bool(
        load_default=False,
        metadata={"description": "Use TLS/SSL connection"}
    )
    connect_timeout = fields.Int(
        load_default=10,
        validate=validate.Range(min=1, max=300),
        metadata={"description": "Connection timeout in seconds"}
    )
    send_receive_timeout = fields.Int(
        load_default=300,
        validate=validate.Range(min=1, max=3600),
        metadata={"description": "Query timeout in seconds"}
    )
    verify_ssl = fields.Bool(
        load_default=True,
        metadata={"description": "Verify SSL certificates"}
    )


class ClickHouseConfigCreateSchema(BaseInfrastructureConfigSchema):
    """Schema for creating ClickHouse configuration."""
    
    service_type = fields.Str(
        dump_default="clickhouse",
        load_default="clickhouse",
        validate=validate.Equal("clickhouse")
    )
    settings = fields.Nested(ClickHouseSettingsSchema, required=True)
    
    @validates_schema
    def validate_clickhouse_config(self, data, **kwargs):
        """Validate ClickHouse-specific requirements."""
        settings = data.get('settings', {})
        if not settings.get('database'):
            raise ValidationError(
                {"settings": {"database": ["Database name is required for ClickHouse"]}}
            )


# =====================================================
# Spark Configuration Schemas
# =====================================================

class SparkSettingsSchema(Schema):
    """Settings specific to Apache Spark connections."""
    
    master_url = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255),
        metadata={"description": "Spark master URL (e.g., spark://host:7077)"}
    )
    deploy_mode = fields.Str(
        load_default="client",
        validate=validate.OneOf(['client', 'cluster']),
        metadata={"description": "Spark deploy mode"}
    )
    driver_memory = fields.Str(
        load_default="2g",
        validate=validate.Regexp(r'^\d+[gGmMkK]$', error="Invalid memory format (e.g., 2g, 512m)"),
        metadata={"description": "Driver memory allocation"}
    )
    executor_memory = fields.Str(
        load_default="2g",
        validate=validate.Regexp(r'^\d+[gGmMkK]$', error="Invalid memory format"),
        metadata={"description": "Executor memory allocation"}
    )
    executor_cores = fields.Int(
        load_default=2,
        validate=validate.Range(min=1, max=32),
        metadata={"description": "Number of cores per executor"}
    )
    dynamic_allocation = fields.Bool(
        load_default=True,
        metadata={"description": "Enable dynamic executor allocation"}
    )
    min_executors = fields.Int(
        load_default=1,
        validate=validate.Range(min=0, max=100),
        metadata={"description": "Minimum number of executors"}
    )
    max_executors = fields.Int(
        load_default=10,
        validate=validate.Range(min=1, max=500),
        metadata={"description": "Maximum number of executors"}
    )
    spark_home = fields.Str(
        load_default="/opt/spark",
        metadata={"description": "Spark installation directory"}
    )
    additional_configs = fields.Dict(
        load_default=dict,
        metadata={"description": "Additional Spark configuration properties"}
    )


class SparkConfigCreateSchema(BaseInfrastructureConfigSchema):
    """Schema for creating Spark configuration."""
    
    service_type = fields.Str(
        dump_default="spark",
        load_default="spark",
        validate=validate.Equal("spark")
    )
    settings = fields.Nested(SparkSettingsSchema, required=True)
    
    @validates_schema
    def validate_spark_config(self, data, **kwargs):
        """Validate Spark-specific requirements."""
        settings = data.get('settings', {})
        min_exec = settings.get('min_executors', 1)
        max_exec = settings.get('max_executors', 10)
        if min_exec > max_exec:
            raise ValidationError({
                "settings": {
                    "min_executors": ["min_executors cannot be greater than max_executors"]
                }
            })


# =====================================================
# Airflow Configuration Schemas
# =====================================================

class AirflowSettingsSchema(Schema):
    """Settings specific to Apache Airflow connections."""
    
    base_url = fields.Str(
        required=True,
        validate=validate.URL(schemes=['http', 'https']),
        metadata={"description": "Airflow webserver base URL"}
    )
    api_version = fields.Str(
        load_default="v1",
        validate=validate.OneOf(['v1']),
        metadata={"description": "Airflow API version"}
    )
    username = fields.Str(
        load_default="airflow",
        validate=validate.Length(max=100),
        metadata={"description": "Airflow username"}
    )
    password = fields.Str(
        load_only=True,
        allow_none=True,
        metadata={"description": "Airflow password (write-only)"}
    )
    dag_folder = fields.Str(
        load_default="/opt/airflow/dags",
        metadata={"description": "DAG files folder path"}
    )
    request_timeout = fields.Int(
        load_default=30,
        validate=validate.Range(min=5, max=300),
        metadata={"description": "API request timeout in seconds"}
    )
    verify_ssl = fields.Bool(
        load_default=True,
        metadata={"description": "Verify SSL certificates"}
    )


class AirflowConfigCreateSchema(BaseInfrastructureConfigSchema):
    """Schema for creating Airflow configuration."""
    
    service_type = fields.Str(
        dump_default="airflow",
        load_default="airflow",
        validate=validate.Equal("airflow")
    )
    settings = fields.Nested(AirflowSettingsSchema, required=True)


# =====================================================
# Generic CRUD Schemas
# =====================================================

class InfrastructureConfigResponseSchema(BaseInfrastructureConfigSchema):
    """Response schema for infrastructure configuration."""
    pass


class InfrastructureConfigListSchema(Schema):
    """Schema for paginated infrastructure config list."""
    
    items = fields.List(fields.Nested(InfrastructureConfigResponseSchema))
    total = fields.Int()
    page = fields.Int()
    per_page = fields.Int()
    pages = fields.Int()


class InfrastructureConfigUpdateSchema(Schema):
    """Schema for updating infrastructure configuration."""
    
    name = fields.Str(
        validate=validate.Length(min=1, max=255),
        metadata={"description": "Configuration display name"}
    )
    description = fields.Str(
        allow_none=True,
        validate=validate.Length(max=1000),
        metadata={"description": "Configuration description"}
    )
    host = fields.Str(
        validate=validate.Length(min=1, max=255),
        metadata={"description": "Server hostname or IP"}
    )
    port = fields.Int(
        validate=validate.Range(min=1, max=65535),
        metadata={"description": "Server port"}
    )
    is_active = fields.Bool(
        metadata={"description": "Whether this configuration is active"}
    )
    settings = fields.Dict(
        metadata={"description": "Service-specific settings (merged with existing)"}
    )


class InfrastructureConfigTestSchema(Schema):
    """Schema for testing infrastructure connection."""
    
    config_id = fields.UUID(
        allow_none=True,
        metadata={"description": "Existing config ID to test (mutually exclusive with inline config)"}
    )
    service_type = fields.Str(
        validate=validate.OneOf(['clickhouse', 'spark', 'airflow']),
        metadata={"description": "Service type for inline config test"}
    )
    host = fields.Str(
        validate=validate.Length(min=1, max=255),
        metadata={"description": "Server hostname for inline test"}
    )
    port = fields.Int(
        validate=validate.Range(min=1, max=65535),
        metadata={"description": "Server port for inline test"}
    )
    settings = fields.Dict(
        metadata={"description": "Settings for inline test"}
    )
    
    @validates_schema
    def validate_test_params(self, data, **kwargs):
        """Ensure either config_id or inline params are provided."""
        config_id = data.get('config_id')
        has_inline = all([
            data.get('service_type'),
            data.get('host'),
            data.get('port')
        ])
        
        if not config_id and not has_inline:
            raise ValidationError(
                "Either config_id or inline configuration (service_type, host, port) is required"
            )


class InfrastructureConfigTestResultSchema(Schema):
    """Schema for connection test result."""
    
    success = fields.Bool(required=True)
    message = fields.Str(required=True)
    latency_ms = fields.Float(allow_none=True)
    server_version = fields.Str(allow_none=True)
    details = fields.Dict(allow_none=True)
