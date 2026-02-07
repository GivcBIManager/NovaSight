"""
NovaSight Admin Infrastructure Configuration API
=================================================

API endpoints for managing infrastructure server configurations.
Allows portal admins to configure ClickHouse, Spark, and Airflow connections.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.admin import admin_bp
from app.services.infrastructure_config_service import (
    InfrastructureConfigService,
    InfrastructureConfigError,
    InfrastructureConfigNotFoundError,
)
from app.middleware.permissions import require_permission
from app.schemas.infrastructure_schemas import (
    InfrastructureConfigResponseSchema,
    InfrastructureConfigListSchema,
    InfrastructureConfigUpdateSchema,
    InfrastructureConfigTestSchema,
    InfrastructureConfigTestResultSchema,
    ClickHouseConfigCreateSchema,
    SparkConfigCreateSchema,
    AirflowConfigCreateSchema,
    OllamaConfigCreateSchema,
)
from app.errors import ValidationError, NotFoundError
from marshmallow import ValidationError as MarshmallowValidationError
import logging

logger = logging.getLogger(__name__)

# Schema mapping for different service types
CREATE_SCHEMAS = {
    'clickhouse': ClickHouseConfigCreateSchema,
    'spark': SparkConfigCreateSchema,
    'airflow': AirflowConfigCreateSchema,
    'ollama': OllamaConfigCreateSchema,
}


@admin_bp.route('/infrastructure/configs', methods=['GET'])
@jwt_required()
@require_permission('admin.infrastructure.view')
def list_infrastructure_configs():
    """
    List all infrastructure configurations.
    
    Query Parameters:
        - service_type: Filter by service type (clickhouse, spark, airflow)
        - tenant_id: Filter by tenant ID
        - include_global: Include global configs (default: true)
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
    
    Returns:
        Paginated list of infrastructure configurations
    """
    service_type = request.args.get('service_type')
    tenant_id = request.args.get('tenant_id')
    include_global = request.args.get('include_global', 'true').lower() == 'true'
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    service = InfrastructureConfigService()
    result = service.list_configs(
        service_type=service_type,
        tenant_id=tenant_id,
        include_global=include_global,
        page=page,
        per_page=per_page,
    )
    
    return jsonify(InfrastructureConfigListSchema().dump(result))


@admin_bp.route('/infrastructure/configs/<uuid:config_id>', methods=['GET'])
@jwt_required()
@require_permission('admin.infrastructure.view')
def get_infrastructure_config(config_id):
    """
    Get infrastructure configuration by ID.
    
    Args:
        config_id: Configuration UUID
    
    Returns:
        Configuration details
    """
    service = InfrastructureConfigService()
    config = service.get_config(str(config_id))
    
    if not config:
        raise NotFoundError('Configuration not found')
    
    return jsonify({
        'config': InfrastructureConfigResponseSchema().dump(config.to_dict())
    })


@admin_bp.route('/infrastructure/configs/active/<service_type>', methods=['GET'])
@jwt_required()
@require_permission('admin.infrastructure.view')
def get_active_infrastructure_config(service_type):
    """
    Get the active configuration for a service type.
    
    Args:
        service_type: Service type (clickhouse, spark, airflow)
    
    Query Parameters:
        - tenant_id: Optional tenant ID for tenant-specific config
    
    Returns:
        Active configuration or default settings
    """
    if service_type not in ['clickhouse', 'spark', 'airflow', 'ollama']:
        raise ValidationError(f"Invalid service type: {service_type}")
    
    tenant_id = request.args.get('tenant_id')
    
    service = InfrastructureConfigService()
    config = service.get_active_config(service_type, tenant_id)
    
    if config:
        return jsonify({
            'config': InfrastructureConfigResponseSchema().dump(config.to_dict()),
            'source': 'database'
        })
    else:
        # Return default settings from environment
        settings = service.get_effective_settings(service_type, tenant_id)
        return jsonify({
            'config': {
                'service_type': service_type,
                'name': f'Default {service_type.title()}',
                'host': settings.get('host'),
                'port': settings.get('port'),
                'settings': settings,
                'is_system_default': True,
            },
            'source': 'environment'
        })


@admin_bp.route('/infrastructure/configs', methods=['POST'])
@jwt_required()
@require_permission('admin.infrastructure.create')
def create_infrastructure_config():
    """
    Create a new infrastructure configuration.
    
    Request Body:
        - service_type: Service type (clickhouse, spark, airflow) - required
        - name: Display name - required
        - host: Server hostname - required
        - port: Server port - required
        - settings: Service-specific settings - required
        - tenant_id: Optional tenant ID for tenant-specific config
        - description: Optional description
        - is_active: Whether this config is active (default: true)
    
    Returns:
        Created configuration details
    """
    json_data = request.get_json() or {}
    service_type = json_data.get('service_type')
    
    if not service_type or service_type not in CREATE_SCHEMAS:
        raise ValidationError(
            f"Invalid or missing service_type. Must be one of: {list(CREATE_SCHEMAS.keys())}"
        )
    
    schema = CREATE_SCHEMAS[service_type]()
    
    try:
        data = schema.load(json_data)
    except MarshmallowValidationError as e:
        raise ValidationError(str(e.messages))
    
    current_user_id = get_jwt_identity()
    service = InfrastructureConfigService()
    
    try:
        config = service.create_config(
            service_type=data['service_type'],
            name=data['name'],
            host=data['host'],
            port=data['port'],
            settings=data['settings'],
            tenant_id=str(data['tenant_id']) if data.get('tenant_id') else None,
            description=data.get('description'),
            is_active=data.get('is_active', True),
            created_by=current_user_id,
        )
    except InfrastructureConfigError as e:
        raise ValidationError(str(e))
    
    logger.info(
        f"Infrastructure config created: {service_type}:{config.name} "
        f"by user {current_user_id}"
    )
    
    return jsonify({
        'config': InfrastructureConfigResponseSchema().dump(config.to_dict()),
        'message': 'Configuration created successfully'
    }), 201


@admin_bp.route('/infrastructure/configs/<uuid:config_id>', methods=['PUT'])
@jwt_required()
@require_permission('admin.infrastructure.edit')
def update_infrastructure_config(config_id):
    """
    Update an infrastructure configuration.
    
    Args:
        config_id: Configuration UUID
    
    Request Body:
        - name: Display name
        - description: Description
        - host: Server hostname
        - port: Server port
        - is_active: Whether this config is active
        - settings: Service-specific settings (merged with existing)
    
    Returns:
        Updated configuration details
    """
    try:
        data = InfrastructureConfigUpdateSchema().load(request.get_json() or {})
    except MarshmallowValidationError as e:
        raise ValidationError(str(e.messages))
    
    current_user_id = get_jwt_identity()
    service = InfrastructureConfigService()
    
    try:
        config = service.update_config(
            config_id=str(config_id),
            updated_by=current_user_id,
            **data
        )
    except InfrastructureConfigNotFoundError:
        raise NotFoundError('Configuration not found')
    except InfrastructureConfigError as e:
        raise ValidationError(str(e))
    
    logger.info(f"Infrastructure config updated: {config_id} by user {current_user_id}")
    
    return jsonify({
        'config': InfrastructureConfigResponseSchema().dump(config.to_dict()),
        'message': 'Configuration updated successfully'
    })


@admin_bp.route('/infrastructure/configs/<uuid:config_id>', methods=['DELETE'])
@jwt_required()
@require_permission('admin.infrastructure.delete')
def delete_infrastructure_config(config_id):
    """
    Delete an infrastructure configuration.
    
    Args:
        config_id: Configuration UUID
    
    Returns:
        Success message
    """
    current_user_id = get_jwt_identity()
    service = InfrastructureConfigService()
    
    try:
        service.delete_config(str(config_id))
    except InfrastructureConfigNotFoundError:
        raise NotFoundError('Configuration not found')
    except InfrastructureConfigError as e:
        raise ValidationError(str(e))
    
    logger.info(f"Infrastructure config deleted: {config_id} by user {current_user_id}")
    
    return jsonify({
        'message': 'Configuration deleted successfully'
    })


@admin_bp.route('/infrastructure/configs/test', methods=['POST'])
@jwt_required()
@require_permission('admin.infrastructure.test')
def test_infrastructure_connection():
    """
    Test connection to an infrastructure service.
    
    Request Body:
        Either:
        - config_id: Existing configuration ID to test
        Or:
        - service_type: Service type for inline test
        - host: Server hostname
        - port: Server port
        - settings: Service-specific settings
    
    Returns:
        Connection test result
    """
    try:
        data = InfrastructureConfigTestSchema().load(request.get_json() or {})
    except MarshmallowValidationError as e:
        raise ValidationError(str(e.messages))
    
    service = InfrastructureConfigService()
    
    try:
        result = service.test_connection(
            config_id=str(data['config_id']) if data.get('config_id') else None,
            service_type=data.get('service_type'),
            host=data.get('host'),
            port=data.get('port'),
            settings=data.get('settings'),
        )
    except InfrastructureConfigNotFoundError:
        raise NotFoundError('Configuration not found')
    except InfrastructureConfigError as e:
        result = {
            'success': False,
            'message': str(e),
        }
    except Exception as e:
        result = {
            'success': False,
            'message': f'Test failed: {str(e)}',
        }
    
    return jsonify(InfrastructureConfigTestResultSchema().dump(result))


@admin_bp.route('/infrastructure/configs/<uuid:config_id>/activate', methods=['POST'])
@jwt_required()
@require_permission('admin.infrastructure.edit')
def activate_infrastructure_config(config_id):
    """
    Activate an infrastructure configuration.
    
    This will deactivate any other configuration of the same type
    within the same scope (global or tenant-specific).
    
    Args:
        config_id: Configuration UUID
    
    Returns:
        Updated configuration details
    """
    current_user_id = get_jwt_identity()
    service = InfrastructureConfigService()
    
    try:
        config = service.update_config(
            config_id=str(config_id),
            updated_by=current_user_id,
            is_active=True,
        )
    except InfrastructureConfigNotFoundError:
        raise NotFoundError('Configuration not found')
    except InfrastructureConfigError as e:
        raise ValidationError(str(e))
    
    logger.info(f"Infrastructure config activated: {config_id} by user {current_user_id}")
    
    return jsonify({
        'config': InfrastructureConfigResponseSchema().dump(config.to_dict()),
        'message': 'Configuration activated successfully'
    })


@admin_bp.route('/infrastructure/defaults', methods=['POST'])
@jwt_required()
@require_permission('admin.infrastructure.create')
def initialize_infrastructure_defaults():
    """
    Initialize system default configurations.
    
    Creates default configurations for all infrastructure types
    if they don't already exist. Useful for initial setup.
    
    Returns:
        Success message
    """
    service = InfrastructureConfigService()
    service.initialize_defaults()
    
    logger.info("Infrastructure defaults initialized")
    
    return jsonify({
        'message': 'Default configurations initialized successfully'
    })
