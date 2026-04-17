"""
Connections API Namespace
==========================

Flask-RESTX namespace for data connection endpoint documentation.
"""

from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from app.platform.auth.jwt_handler import get_jwt_identity_dict
from app.domains.datasources.application.connection_service import ConnectionService
from app.platform.auth.decorators import authenticated, require_roles, tenant_required
from app.errors import ValidationError, NotFoundError, ConnectionTestError
import logging

logger = logging.getLogger(__name__)

ns = Namespace(
    'connections',
    description='Data source connection management',
    decorators=[jwt_required()]
)

# Define models
connection_create = ns.model('ConnectionCreate', {
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

connection_update = ns.model('ConnectionUpdate', {
    'name': fields.String(description='Connection display name'),
    'host': fields.String(description='Database host'),
    'port': fields.Integer(description='Database port'),
    'database': fields.String(description='Database name'),
    'username': fields.String(description='Connection username'),
    'password': fields.String(description='New password (if changing)'),
    'ssl_mode': fields.String(description='SSL mode'),
    'extra_params': fields.Raw(description='Additional connection parameters'),
})

connection_response = ns.model('Connection', {
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

connection_list_response = ns.model('ConnectionListResponse', {
    'connections': fields.List(fields.Nested(connection_response)),
    'pagination': fields.Raw(description='Pagination information'),
})

test_result = ns.model('ConnectionTestResult', {
    'success': fields.Boolean(description='Whether connection test succeeded'),
    'message': fields.String(description='Test result message'),
    'latency_ms': fields.Float(description='Connection latency in milliseconds'),
})

schema_column = ns.model('SchemaColumn', {
    'name': fields.String(description='Column name'),
    'type': fields.String(description='Data type'),
    'nullable': fields.Boolean(description='Is nullable'),
    'primary_key': fields.Boolean(description='Is primary key'),
})

schema_table = ns.model('SchemaTable', {
    'name': fields.String(description='Table name'),
    'schema': fields.String(description='Schema name'),
    'type': fields.String(description='Table or view'),
    'row_count': fields.Integer(description='Estimated row count'),
    'columns': fields.List(fields.Nested(schema_column)),
})

schema_response = ns.model('SchemaResponse', {
    'tables': fields.List(fields.Nested(schema_table)),
    'views': fields.List(fields.Nested(schema_table)),
})

error_response = ns.model('ErrorResponse', {
    'success': fields.Boolean(default=False),
    'message': fields.String(),
    'code': fields.String(),
})


@ns.route('')
class ConnectionList(Resource):
    @ns.doc('list_connections', security='Bearer')
    @ns.param('page', 'Page number', type=int, default=1)
    @ns.param('per_page', 'Items per page', type=int, default=20)
    @ns.param('db_type', 'Filter by database type', type=str)
    @ns.param('status', 'Filter by status', type=str)
    @ns.marshal_with(connection_list_response)
    @ns.response(401, 'Unauthorized', error_response)
    @tenant_required
    def get(self):
        """
        List all data connections for current tenant.
        
        Returns a paginated list of configured database connections.
        Credentials are masked in the response.
        
        **Permissions Required:** Authenticated user
        """
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        db_type = request.args.get("db_type")
        status = request.args.get("status")
        
        connection_service = ConnectionService(tenant_id)
        result = connection_service.list_connections(
            page=page, per_page=per_page, db_type=db_type, status=status
        )
        
        return result
    
    @ns.doc('create_connection', security='Bearer')
    @ns.expect(connection_create, validate=True)
    @ns.marshal_with(connection_response, code=201)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(409, 'Connection name already exists', error_response)
    @tenant_required
    @require_roles(["data_engineer", "tenant_admin"])
    def post(self):
        """
        Create a new data source connection.
        
        Creates a database connection with the provided configuration.
        The connection will be tested automatically before saving.
        
        **Important:** 
        - Passwords are encrypted using AES-256 before storage
        - Connection names must be unique within a tenant
        
        **Permissions Required:** `data_engineer` or `tenant_admin` role
        """
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        user_id = identity.get("user_id")
        data = request.get_json()
        
        if not data:
            raise ValidationError("Request body required")
        
        required_fields = ["name", "db_type", "host", "port", "database", "username", "password"]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Field '{field}' is required")
        
        valid_db_types = ["postgresql", "oracle", "sqlserver", "mysql", "clickhouse"]
        if data["db_type"] not in valid_db_types:
            raise ValidationError(f"Invalid db_type. Must be one of: {', '.join(valid_db_types)}")
        
        connection_service = ConnectionService(tenant_id)
        connection = connection_service.create_connection(
            name=data["name"],
            db_type=data["db_type"],
            host=data["host"],
            port=data["port"],
            database=data["database"],
            username=data["username"],
            password=data["password"],
            ssl_mode=data.get("ssl_mode"),
            extra_params=data.get("extra_params", {}),
            created_by=user_id,
        )
        
        logger.info(f"Connection '{data['name']}' created in tenant {tenant_id}")
        
        return connection.to_dict(mask_password=True), 201


@ns.route('/<string:connection_id>')
@ns.param('connection_id', 'Connection UUID')
class ConnectionDetail(Resource):
    @ns.doc('get_connection', security='Bearer')
    @ns.marshal_with(connection_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(404, 'Connection not found', error_response)
    @tenant_required
    def get(self, connection_id):
        """
        Get connection details by ID.
        
        Returns the connection configuration. Password is never included
        in the response.
        """
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        connection_service = ConnectionService(tenant_id)
        connection = connection_service.get_connection(connection_id)
        
        if not connection:
            raise NotFoundError("Connection not found")
        
        return connection.to_dict(mask_password=True)
    
    @ns.doc('update_connection', security='Bearer')
    @ns.expect(connection_update)
    @ns.marshal_with(connection_response)
    @ns.response(400, 'Validation Error', error_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(404, 'Connection not found', error_response)
    @tenant_required
    @require_roles(["data_engineer", "tenant_admin"])
    def patch(self, connection_id):
        """
        Update connection details.
        
        Partial updates are supported. Only include the fields you want to change.
        If password is included, the connection will be re-tested.
        
        **Permissions Required:** `data_engineer` or `tenant_admin` role
        """
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        data = request.get_json()
        
        connection_service = ConnectionService(tenant_id)
        connection = connection_service.update_connection(connection_id, **data)
        
        if not connection:
            raise NotFoundError("Connection not found")
        
        logger.info(f"Connection '{connection_id}' updated in tenant {tenant_id}")
        
        return connection.to_dict(mask_password=True)
    
    @ns.doc('delete_connection', security='Bearer')
    @ns.response(204, 'Connection deleted')
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(403, 'Forbidden', error_response)
    @ns.response(404, 'Connection not found', error_response)
    @tenant_required
    @require_roles(["data_engineer", "tenant_admin"])
    def delete(self, connection_id):
        """
        Delete a data source connection.
        
        **Warning:** This will also delete:
        - All ingested/cached data from this source
        - Associated semantic models
        - Dashboard widgets using this source
        
        This action cannot be undone.
        
        **Permissions Required:** `data_engineer` or `tenant_admin` role
        """
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        connection_service = ConnectionService(tenant_id)
        success = connection_service.delete_connection(connection_id)
        
        if not success:
            raise NotFoundError("Connection not found")
        
        logger.info(f"Connection '{connection_id}' deleted from tenant {tenant_id}")
        
        return '', 204


@ns.route('/<string:connection_id>/test')
@ns.param('connection_id', 'Connection UUID')
class ConnectionTest(Resource):
    @ns.doc('test_connection', security='Bearer')
    @ns.marshal_with(test_result)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(404, 'Connection not found', error_response)
    @tenant_required
    def post(self, connection_id):
        """
        Test a data source connection.
        
        Attempts to connect to the database using stored credentials.
        Returns connection status and latency.
        
        **Note:** Does not sync any data - only tests connectivity.
        """
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        connection_service = ConnectionService(tenant_id)
        result = connection_service.test_connection(connection_id)
        
        return {
            'success': result['success'],
            'message': result.get('message'),
            'latency_ms': result.get('latency_ms'),
        }


@ns.route('/<string:connection_id>/schema')
@ns.param('connection_id', 'Connection UUID')
class ConnectionSchema(Resource):
    @ns.doc('get_connection_schema', security='Bearer')
    @ns.marshal_with(schema_response)
    @ns.response(401, 'Unauthorized', error_response)
    @ns.response(404, 'Connection not found', error_response)
    @ns.response(503, 'Unable to connect to database', error_response)
    @tenant_required
    def get(self, connection_id):
        """
        Get the database schema for a connection.
        
        Introspects the connected database and returns:
        - Available schemas/databases
        - Tables and views
        - Column names and data types
        - Primary and foreign key information
        
        **Note:** Large schemas may take several seconds to retrieve.
        Consider caching the response client-side.
        """
        identity = get_jwt_identity_dict()
        tenant_id = identity.get("tenant_id")
        
        connection_service = ConnectionService(tenant_id)
        schema = connection_service.get_schema(connection_id)
        
        return schema
