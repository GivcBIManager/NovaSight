"""
NovaSight API v1 Models
========================

Flask-RESTX models for API request/response serialization and OpenAPI documentation.
All API models are defined here for consistent documentation across endpoints.
"""

from flask_restx import fields


def register_models(api):
    """
    Register all API models with the Flask-RESTX Api instance.
    
    Args:
        api: Flask-RESTX Api instance
        
    Returns:
        Dictionary of registered models
    """
    models = {}
    
    # =========================================================================
    # Common Models
    # =========================================================================
    
    models['pagination'] = api.model('Pagination', {
        'page': fields.Integer(description='Current page number', example=1),
        'per_page': fields.Integer(description='Items per page', example=20),
        'total': fields.Integer(description='Total items', example=150),
        'pages': fields.Integer(description='Total pages', example=8),
        'has_next': fields.Boolean(description='Has next page'),
        'has_prev': fields.Boolean(description='Has previous page'),
    })
    
    models['error'] = api.model('Error', {
        'success': fields.Boolean(default=False, description='Always false for errors'),
        'message': fields.String(description='Error message', example='Validation failed'),
        'code': fields.String(description='Error code', example='VALIDATION_ERROR'),
        'details': fields.Raw(description='Additional error details'),
    })
    
    models['success_message'] = api.model('SuccessMessage', {
        'message': fields.String(description='Success message'),
    })
    
    # =========================================================================
    # Authentication Models
    # =========================================================================
    
    models['login_request'] = api.model('LoginRequest', {
        'email': fields.String(
            required=True,
            description='User email address',
            example='user@example.com'
        ),
        'password': fields.String(
            required=True,
            description='User password',
            example='SecurePassword123!'
        ),
        'tenant_slug': fields.String(
            description='Optional tenant slug for multi-tenant login',
            example='acme-corp'
        ),
    })
    
    models['register_request'] = api.model('RegisterRequest', {
        'email': fields.String(
            required=True,
            description='User email address',
            example='newuser@example.com'
        ),
        'password': fields.String(
            required=True,
            description='User password (min 12 chars with complexity requirements)',
            example='SecurePassword123!'
        ),
        'name': fields.String(
            required=True,
            description='User display name',
            example='John Doe'
        ),
        'tenant_slug': fields.String(
            required=True,
            description='Tenant identifier slug',
            example='acme-corp'
        ),
    })
    
    models['user_brief'] = api.model('UserBrief', {
        'id': fields.String(description='User UUID', example='550e8400-e29b-41d4-a716-446655440000'),
        'email': fields.String(description='User email', example='user@example.com'),
        'name': fields.String(description='User display name', example='John Doe'),
        'tenant_id': fields.String(description='Tenant UUID'),
        'roles': fields.List(fields.String, description='User roles', example=['analyst', 'viewer']),
    })
    
    models['login_response'] = api.model('LoginResponse', {
        'access_token': fields.String(description='JWT access token'),
        'refresh_token': fields.String(description='JWT refresh token'),
        'token_type': fields.String(description='Token type', example='Bearer'),
        'user': fields.Nested(models['user_brief']),
    })
    
    models['token_response'] = api.model('TokenResponse', {
        'access_token': fields.String(description='JWT access token'),
        'token_type': fields.String(description='Token type', example='Bearer'),
    })
    
    models['change_password_request'] = api.model('ChangePasswordRequest', {
        'current_password': fields.String(required=True, description='Current password'),
        'new_password': fields.String(required=True, description='New password'),
    })
    
    # =========================================================================
    # Data Source / Connection Models
    # =========================================================================
    
    models['connection_config'] = api.model('ConnectionConfig', {
        'host': fields.String(required=True, description='Database host', example='db.example.com'),
        'port': fields.Integer(required=True, description='Database port', example=5432),
        'database': fields.String(required=True, description='Database name', example='analytics'),
        'username': fields.String(required=True, description='Connection username', example='readonly_user'),
        'password': fields.String(required=True, description='Connection password (stored encrypted)'),
        'ssl_mode': fields.String(description='SSL mode', example='require'),
        'extra_params': fields.Raw(description='Additional connection parameters'),
    })
    
    models['connection_create'] = api.model('ConnectionCreate', {
        'name': fields.String(
            required=True,
            description='Connection display name (unique per tenant)',
            example='Production Database'
        ),
        'db_type': fields.String(
            required=True,
            enum=['postgresql', 'mysql', 'clickhouse', 'oracle', 'sqlserver'],
            description='Database type',
            example='postgresql'
        ),
        'host': fields.String(required=True, example='db.example.com'),
        'port': fields.Integer(required=True, example=5432),
        'database': fields.String(required=True, example='analytics'),
        'username': fields.String(required=True, example='readonly_user'),
        'password': fields.String(required=True, description='Password (stored encrypted)'),
        'ssl_mode': fields.String(description='SSL mode', example='require'),
        'extra_params': fields.Raw(description='Additional connection parameters'),
    })
    
    models['connection_update'] = api.model('ConnectionUpdate', {
        'name': fields.String(description='Connection display name'),
        'host': fields.String(description='Database host'),
        'port': fields.Integer(description='Database port'),
        'database': fields.String(description='Database name'),
        'username': fields.String(description='Connection username'),
        'password': fields.String(description='New password (if changing)'),
        'ssl_mode': fields.String(description='SSL mode'),
        'extra_params': fields.Raw(description='Additional connection parameters'),
    })
    
    models['connection_response'] = api.model('Connection', {
        'id': fields.String(description='Connection UUID'),
        'name': fields.String(description='Connection name'),
        'db_type': fields.String(description='Database type'),
        'host': fields.String(description='Database host'),
        'port': fields.Integer(description='Database port'),
        'database': fields.String(description='Database name'),
        'username': fields.String(description='Connection username'),
        'ssl_mode': fields.String(description='SSL mode'),
        'status': fields.String(
            enum=['active', 'inactive', 'error', 'testing'],
            description='Connection status'
        ),
        'last_tested_at': fields.DateTime(description='Last successful test'),
        'created_at': fields.DateTime(description='Creation timestamp'),
        'updated_at': fields.DateTime(description='Last update timestamp'),
    })
    
    models['connection_test_result'] = api.model('ConnectionTestResult', {
        'success': fields.Boolean(description='Whether connection test succeeded'),
        'message': fields.String(description='Test result message'),
        'latency_ms': fields.Float(description='Connection latency in milliseconds'),
    })
    
    models['schema_column'] = api.model('SchemaColumn', {
        'name': fields.String(description='Column name'),
        'type': fields.String(description='Data type'),
        'nullable': fields.Boolean(description='Is nullable'),
        'primary_key': fields.Boolean(description='Is primary key'),
    })
    
    models['schema_table'] = api.model('SchemaTable', {
        'name': fields.String(description='Table name'),
        'schema': fields.String(description='Schema name'),
        'type': fields.String(description='Table or view'),
        'columns': fields.List(fields.Nested(models['schema_column'])),
    })
    
    # =========================================================================
    # Semantic Layer Models
    # =========================================================================
    
    models['semantic_model_create'] = api.model('SemanticModelCreate', {
        'name': fields.String(required=True, description='Model name', example='sales'),
        'dbt_model': fields.String(required=True, description='Reference to dbt model', example='sales_facts'),
        'label': fields.String(description='Human-readable label', example='Sales'),
        'description': fields.String(description='Model description'),
        'model_type': fields.String(
            enum=['fact', 'dimension', 'aggregate'],
            description='Model type',
            example='fact'
        ),
        'cache_enabled': fields.Boolean(default=True, description='Enable query caching'),
        'cache_ttl_seconds': fields.Integer(description='Cache TTL in seconds', example=3600),
        'tags': fields.List(fields.String, description='Tags'),
        'meta': fields.Raw(description='Additional metadata'),
    })
    
    models['dimension_create'] = api.model('DimensionCreate', {
        'name': fields.String(required=True, description='Dimension name', example='region'),
        'label': fields.String(description='Display label', example='Region'),
        'description': fields.String(description='Dimension description'),
        'type': fields.String(
            enum=['string', 'number', 'date', 'datetime', 'boolean', 'time'],
            description='Data type',
            example='string'
        ),
        'expression': fields.String(description='SQL expression'),
        'hidden': fields.Boolean(default=False, description='Hide from UI'),
    })
    
    models['measure_create'] = api.model('MeasureCreate', {
        'name': fields.String(required=True, description='Measure name', example='total_revenue'),
        'label': fields.String(description='Display label', example='Total Revenue'),
        'description': fields.String(description='Measure description'),
        'type': fields.String(
            enum=['sum', 'count', 'count_distinct', 'avg', 'min', 'max', 'median'],
            description='Aggregation type',
            example='sum'
        ),
        'expression': fields.String(required=True, description='SQL expression', example='SUM(amount)'),
        'format': fields.String(description='Display format', example='$,.2f'),
        'hidden': fields.Boolean(default=False, description='Hide from UI'),
    })
    
    models['dimension_response'] = api.model('Dimension', {
        'id': fields.String(description='Dimension UUID'),
        'name': fields.String(),
        'label': fields.String(),
        'description': fields.String(),
        'type': fields.String(),
        'expression': fields.String(),
        'hidden': fields.Boolean(),
        'created_at': fields.DateTime(),
    })
    
    models['measure_response'] = api.model('Measure', {
        'id': fields.String(description='Measure UUID'),
        'name': fields.String(),
        'label': fields.String(),
        'description': fields.String(),
        'type': fields.String(),
        'expression': fields.String(),
        'format': fields.String(),
        'hidden': fields.Boolean(),
        'created_at': fields.DateTime(),
    })
    
    models['semantic_model_response'] = api.model('SemanticModel', {
        'id': fields.String(description='Model UUID'),
        'name': fields.String(),
        'label': fields.String(),
        'description': fields.String(),
        'model_type': fields.String(),
        'dbt_model': fields.String(),
        'cache_enabled': fields.Boolean(),
        'cache_ttl_seconds': fields.Integer(),
        'is_active': fields.Boolean(),
        'dimensions_count': fields.Integer(),
        'measures_count': fields.Integer(),
        'created_at': fields.DateTime(),
        'updated_at': fields.DateTime(),
    })
    
    models['semantic_model_detail'] = api.model('SemanticModelDetail', {
        'id': fields.String(description='Model UUID'),
        'name': fields.String(),
        'label': fields.String(),
        'description': fields.String(),
        'model_type': fields.String(),
        'dbt_model': fields.String(),
        'cache_enabled': fields.Boolean(),
        'cache_ttl_seconds': fields.Integer(),
        'is_active': fields.Boolean(),
        'dimensions': fields.List(fields.Nested(models['dimension_response'])),
        'measures': fields.List(fields.Nested(models['measure_response'])),
        'created_at': fields.DateTime(),
        'updated_at': fields.DateTime(),
    })
    
    # =========================================================================
    # Dashboard Models
    # =========================================================================
    
    models['grid_position'] = api.model('GridPosition', {
        'x': fields.Integer(required=True, min=0, max=11, description='X position'),
        'y': fields.Integer(required=True, min=0, description='Y position'),
        'w': fields.Integer(required=True, min=1, max=12, description='Width'),
        'h': fields.Integer(required=True, min=1, description='Height'),
    })
    
    models['widget_config'] = api.model('WidgetConfig', {
        'name': fields.String(required=True, description='Widget name', example='Sales by Region'),
        'type': fields.String(
            required=True,
            enum=['metric_card', 'line_chart', 'bar_chart', 'pie_chart', 'table', 'heatmap', 'scatter', 'area'],
            description='Widget type'
        ),
        'query_config': fields.Raw(description='Query configuration'),
        'viz_config': fields.Raw(description='Visualization settings'),
        'grid_position': fields.Nested(models['grid_position']),
    })
    
    models['widget_create'] = api.model('WidgetCreate', {
        'name': fields.String(required=True, description='Widget name'),
        'widget_type': fields.String(required=True, description='Widget type'),
        'semantic_model_id': fields.String(description='Semantic model UUID'),
        'dimensions': fields.List(fields.String, description='Selected dimensions'),
        'measures': fields.List(fields.String, description='Selected measures'),
        'filters': fields.Raw(description='Widget filters'),
        'viz_config': fields.Raw(description='Visualization configuration'),
        'grid_position': fields.Nested(models['grid_position']),
    })
    
    models['widget_response'] = api.model('Widget', {
        'id': fields.String(description='Widget UUID'),
        'dashboard_id': fields.String(description='Dashboard UUID'),
        'name': fields.String(),
        'widget_type': fields.String(),
        'semantic_model_id': fields.String(),
        'dimensions': fields.List(fields.String),
        'measures': fields.List(fields.String),
        'filters': fields.Raw(),
        'viz_config': fields.Raw(),
        'grid_position': fields.Raw(),
        'created_at': fields.DateTime(),
        'updated_at': fields.DateTime(),
    })
    
    models['dashboard_theme'] = api.model('DashboardTheme', {
        'primary_color': fields.String(description='Primary color', example='#3B82F6'),
        'background_color': fields.String(description='Background color', example='#FFFFFF'),
        'font_family': fields.String(description='Font family', example='Inter'),
    })
    
    models['dashboard_create'] = api.model('DashboardCreate', {
        'name': fields.String(required=True, description='Dashboard name', example='Sales Dashboard'),
        'description': fields.String(description='Dashboard description'),
        'is_public': fields.Boolean(default=False, description='Public visibility'),
        'layout': fields.Raw(description='Initial layout configuration'),
        'global_filters': fields.Raw(description='Global filter settings'),
        'auto_refresh': fields.Boolean(default=False, description='Enable auto-refresh'),
        'refresh_interval': fields.Integer(description='Refresh interval in seconds'),
        'theme': fields.Nested(models['dashboard_theme']),
        'tags': fields.List(fields.String, description='Dashboard tags'),
    })
    
    models['dashboard_response'] = api.model('Dashboard', {
        'id': fields.String(description='Dashboard UUID'),
        'name': fields.String(),
        'description': fields.String(),
        'is_public': fields.Boolean(),
        'layout': fields.Raw(),
        'global_filters': fields.Raw(),
        'auto_refresh': fields.Boolean(),
        'refresh_interval': fields.Integer(),
        'theme': fields.Raw(),
        'tags': fields.List(fields.String),
        'owner_id': fields.String(),
        'created_at': fields.DateTime(),
        'updated_at': fields.DateTime(),
    })
    
    models['dashboard_detail'] = api.model('DashboardDetail', {
        'id': fields.String(description='Dashboard UUID'),
        'name': fields.String(),
        'description': fields.String(),
        'is_public': fields.Boolean(),
        'layout': fields.Raw(),
        'global_filters': fields.Raw(),
        'auto_refresh': fields.Boolean(),
        'refresh_interval': fields.Integer(),
        'theme': fields.Raw(),
        'tags': fields.List(fields.String),
        'owner_id': fields.String(),
        'widgets': fields.List(fields.Nested(models['widget_response'])),
        'created_at': fields.DateTime(),
        'updated_at': fields.DateTime(),
    })
    
    models['dashboard_share'] = api.model('DashboardShare', {
        'user_ids': fields.List(fields.String, description='User UUIDs to share with'),
        'role_ids': fields.List(fields.String, description='Role UUIDs to share with'),
        'permission': fields.String(
            enum=['view', 'edit'],
            description='Permission level',
            example='view'
        ),
    })
    
    # =========================================================================
    # Query / AI Assistant Models
    # =========================================================================
    
    models['query_column'] = api.model('QueryColumn', {
        'name': fields.String(description='Column name'),
        'type': fields.String(description='Data type'),
        'label': fields.String(description='Display label'),
    })
    
    models['query_request'] = api.model('QueryRequest', {
        'query': fields.String(
            required=True,
            description='Natural language query',
            example='What were total sales by region last month?'
        ),
        'execute': fields.Boolean(default=True, description='Whether to execute the query'),
        'explain': fields.Boolean(default=False, description='Include result explanation'),
        'strict': fields.Boolean(default=False, description='Reject unknown references'),
    })
    
    models['query_response'] = api.model('QueryResponse', {
        'data': fields.Raw(description='Query result data'),
        'columns': fields.List(fields.Nested(models['query_column'])),
        'row_count': fields.Integer(description='Number of rows returned'),
        'execution_time_ms': fields.Float(description='Query execution time'),
        'generated_sql': fields.String(description='SQL query that was executed'),
        'explanation': fields.String(description='AI explanation of results'),
        'intent': fields.Raw(description='Parsed query intent'),
    })
    
    models['suggest_request'] = api.model('SuggestRequest', {
        'context': fields.String(
            description='Current analysis context',
            example='Analyzing sales performance for Q4'
        ),
    })
    
    models['suggestion'] = api.model('Suggestion', {
        'query': fields.String(description='Suggested natural language query'),
        'description': fields.String(description='Why this query might be useful'),
    })
    
    # =========================================================================
    # Admin Models
    # =========================================================================
    
    models['tenant_create'] = api.model('TenantCreate', {
        'name': fields.String(required=True, description='Tenant name', example='Acme Corporation'),
        'slug': fields.String(required=True, description='URL-safe identifier', example='acme-corp'),
        'plan': fields.String(
            enum=['free', 'starter', 'professional', 'enterprise'],
            description='Subscription plan',
            example='professional'
        ),
        'settings': fields.Raw(description='Tenant settings'),
    })
    
    models['tenant_response'] = api.model('Tenant', {
        'id': fields.String(description='Tenant UUID'),
        'name': fields.String(),
        'slug': fields.String(),
        'plan': fields.String(),
        'is_active': fields.Boolean(),
        'settings': fields.Raw(),
        'user_count': fields.Integer(),
        'created_at': fields.DateTime(),
        'updated_at': fields.DateTime(),
    })
    
    models['user_create'] = api.model('UserCreate', {
        'email': fields.String(required=True, description='User email'),
        'name': fields.String(required=True, description='User name'),
        'password': fields.String(required=True, description='Initial password'),
        'role_ids': fields.List(fields.String, description='Role UUIDs to assign'),
    })
    
    models['user_response'] = api.model('User', {
        'id': fields.String(description='User UUID'),
        'email': fields.String(),
        'name': fields.String(),
        'is_active': fields.Boolean(),
        'roles': fields.List(fields.String, description='Assigned roles'),
        'tenant_id': fields.String(),
        'last_login_at': fields.DateTime(),
        'created_at': fields.DateTime(),
    })
    
    models['role_response'] = api.model('Role', {
        'id': fields.String(description='Role UUID'),
        'name': fields.String(),
        'description': fields.String(),
        'permissions': fields.List(fields.String),
        'is_system': fields.Boolean(description='System-defined role'),
    })
    
    # =========================================================================
    # Audit Models
    # =========================================================================
    
    models['audit_log'] = api.model('AuditLog', {
        'id': fields.String(description='Audit log UUID'),
        'action': fields.String(description='Action performed'),
        'resource_type': fields.String(description='Type of resource'),
        'resource_id': fields.String(description='Resource UUID'),
        'user_id': fields.String(description='User who performed action'),
        'user_email': fields.String(description='User email'),
        'details': fields.Raw(description='Action details'),
        'ip_address': fields.String(description='Client IP address'),
        'created_at': fields.DateTime(description='Timestamp'),
    })
    
    return models
