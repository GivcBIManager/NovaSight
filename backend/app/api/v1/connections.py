"""
NovaSight Data Connection Endpoints
===================================

Database connection management for data sources.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1 import api_v1_bp
from app.services.connection_service import ConnectionService
from app.decorators import require_roles, require_tenant_context
from app.errors import ValidationError, NotFoundError, ConnectionTestError
import logging

logger = logging.getLogger(__name__)


@api_v1_bp.route("/connections", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_connections():
    """
    List all data connections for current tenant.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)
        - db_type: Filter by database type
        - status: Filter by connection status
    
    Returns:
        Paginated list of connections (credentials masked)
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    db_type = request.args.get("db_type")
    status = request.args.get("status")
    
    connection_service = ConnectionService(tenant_id)
    result = connection_service.list_connections(
        page=page, per_page=per_page, db_type=db_type, status=status
    )
    
    return jsonify(result)


@api_v1_bp.route("/connections", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def create_connection():
    """
    Create a new data source connection.
    
    Request Body:
        - name: Connection display name (unique per tenant)
        - db_type: Database type (postgresql, oracle, sqlserver)
        - host: Database host/IP address
        - port: Database port
        - database: Database name
        - username: Connection username
        - password: Connection password
        - ssl_mode: Optional SSL mode
        - extra_params: Optional additional connection parameters
    
    Returns:
        Created connection details (password masked)
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    user_id = identity.get("user_id")
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    required_fields = ["name", "db_type", "host", "port", "database", "username", "password"]
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")
    
    # Validate database type
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
    
    return jsonify({"connection": connection.to_dict(mask_password=True)}), 201


@api_v1_bp.route("/connections/<connection_id>", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_connection(connection_id: str):
    """
    Get connection details.
    
    Args:
        connection_id: Connection UUID
    
    Returns:
        Connection details (password masked)
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    connection_service = ConnectionService(tenant_id)
    connection = connection_service.get_connection(connection_id)
    
    if not connection:
        raise NotFoundError("Connection not found")
    
    return jsonify({"connection": connection.to_dict(mask_password=True)})


@api_v1_bp.route("/connections/<connection_id>", methods=["PATCH"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def update_connection(connection_id: str):
    """
    Update connection details.
    
    Args:
        connection_id: Connection UUID
    
    Request Body:
        - name: Connection display name
        - host: Database host
        - port: Database port
        - database: Database name
        - username: Connection username
        - password: New password (optional)
        - ssl_mode: SSL mode
        - extra_params: Additional parameters
    
    Returns:
        Updated connection details
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    connection_service = ConnectionService(tenant_id)
    connection = connection_service.update_connection(connection_id, **data)
    
    if not connection:
        raise NotFoundError("Connection not found")
    
    logger.info(f"Connection {connection_id} updated in tenant {tenant_id}")
    
    return jsonify({"connection": connection.to_dict(mask_password=True)})


@api_v1_bp.route("/connections/<connection_id>", methods=["DELETE"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def delete_connection(connection_id: str):
    """
    Delete a data connection.
    
    Args:
        connection_id: Connection UUID
    
    Returns:
        Success message
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    connection_service = ConnectionService(tenant_id)
    success = connection_service.delete_connection(connection_id)
    
    if not success:
        raise NotFoundError("Connection not found")
    
    logger.info(f"Connection {connection_id} deleted from tenant {tenant_id}")
    
    return jsonify({"message": "Connection deleted successfully"})


@api_v1_bp.route("/connections/<connection_id>/test", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin", "viewer"])
def test_connection(connection_id: str):
    """
    Test database connection.
    
    Args:
        connection_id: Connection UUID
    
    Returns:
        Connection test result
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    connection_service = ConnectionService(tenant_id)
    result = connection_service.test_connection(connection_id)
    
    if not result["success"]:
        return jsonify({
            "success": False,
            "message": result.get("error", "Connection test failed"),
            "details": result.get("details", {}),
        }), 400
    
    return jsonify({
        "success": True,
        "message": "Connection successful",
        "details": result.get("details", {}),
    })


@api_v1_bp.route("/connections/test", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def test_new_connection():
    """
    Test connection parameters without saving.
    
    Request Body:
        - db_type: Database type
        - host: Database host
        - port: Database port
        - database: Database name
        - username: Connection username
        - password: Connection password
        - ssl_mode: Optional SSL mode
    
    Returns:
        Connection test result
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    required_fields = ["db_type", "host", "port", "database", "username", "password"]
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")
    
    connection_service = ConnectionService(tenant_id)
    result = connection_service.test_connection_params(
        db_type=data["db_type"],
        host=data["host"],
        port=data["port"],
        database=data["database"],
        username=data["username"],
        password=data["password"],
        ssl_mode=data.get("ssl_mode"),
    )
    
    if not result["success"]:
        return jsonify({
            "success": False,
            "message": result.get("error", "Connection test failed"),
            "details": result.get("details", {}),
        }), 400
    
    return jsonify({
        "success": True,
        "message": "Connection successful",
        "details": result.get("details", {}),
    })


@api_v1_bp.route("/connections/<connection_id>/schema", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_connection_schema(connection_id: str):
    """
    Get database schema information.
    
    Args:
        connection_id: Connection UUID
    
    Query Parameters:
        - schema_name: Filter by schema name
        - include_columns: Include column details (default: false)
    
    Returns:
        Database schema information (tables, columns, types)
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    schema_name = request.args.get("schema_name")
    include_columns = request.args.get("include_columns", "false").lower() == "true"
    
    connection_service = ConnectionService(tenant_id)
    schema_info = connection_service.get_schema(
        connection_id=connection_id,
        schema_name=schema_name,
        include_columns=include_columns,
    )
    
    if schema_info is None:
        raise NotFoundError("Connection not found or inaccessible")
    
    return jsonify({"schema": schema_info})


@api_v1_bp.route("/connections/<connection_id>/sync", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def trigger_connection_sync(connection_id: str):
    """
    Trigger data sync for a connection.
    
    Args:
        connection_id: Connection UUID
    
    Request Body (optional):
        - tables: List of tables to sync (default: all)
        - incremental: Whether to sync incrementally (default: false)
        - sync_config: Additional sync configuration
    
    Returns:
        Job information with job_id and status
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    data = request.get_json() or {}
    sync_config = {
        "tables": data.get("tables"),
        "incremental": data.get("incremental", False),
        **data.get("sync_config", {})
    }
    
    connection_service = ConnectionService(tenant_id)
    job_id = connection_service.trigger_sync(
        connection_id=connection_id,
        sync_config=sync_config
    )
    
    if not job_id:
        raise NotFoundError("Connection not found or sync failed to start")
    
    logger.info(f"Sync triggered for connection {connection_id}: job_id={job_id}")
    
    return jsonify({
        "job_id": job_id,
        "status": "started",
        "message": "Data sync job started successfully"
    })


@api_v1_bp.route("/connections/<connection_id>/tables", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_connection_tables(connection_id: str):
    """
    List all tables in a connection's database.
    
    Args:
        connection_id: Connection UUID
    
    Query Parameters:
        - schema_name: Filter by schema name (optional)
        - search: Search tables by name (optional)
    
    Returns:
        List of table names
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    schema_name = request.args.get("schema_name")
    search = request.args.get("search")
    
    connection_service = ConnectionService(tenant_id)
    
    # Get connection
    connection = connection_service.get_connection(connection_id)
    if not connection:
        raise NotFoundError("Connection not found")
    
    try:
        # Get schema information with tables
        schema_info = connection_service.get_schema(
            connection_id=connection_id,
            schema_name=schema_name,
            include_columns=False
        )
        
        if schema_info is None:
            raise ConnectionTestError("Failed to retrieve schema information")
        
        tables = schema_info.get("tables", [])
        
        # Filter by search if provided
        if search:
            search_lower = search.lower()
            tables = [t for t in tables if search_lower in t.lower()]
        
        return jsonify({
            "connection_id": connection_id,
            "schema_name": schema_name or connection.schema_name,
            "tables": tables,
            "count": len(tables)
        })
        
    except Exception as e:
        logger.error(f"Error listing tables for connection {connection_id}: {str(e)}")
        raise ConnectionTestError(f"Failed to list tables: {str(e)}")


@api_v1_bp.route("/connections/<connection_id>/tables/<table_name>/columns", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_table_columns(connection_id: str, table_name: str):
    """
    Get column details for a specific table.
    
    Args:
        connection_id: Connection UUID
        table_name: Table name
    
    Query Parameters:
        - schema_name: Schema name (optional)
    
    Returns:
        List of column definitions with names and data types
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    schema_name = request.args.get("schema_name")
    
    connection_service = ConnectionService(tenant_id)
    
    # Get connection
    connection = connection_service.get_connection(connection_id)
    if not connection:
        raise NotFoundError("Connection not found")
    
    try:
        # Get schema information with column details
        schema_info = connection_service.get_schema(
            connection_id=connection_id,
            schema_name=schema_name,
            include_columns=True
        )
        
        if schema_info is None:
            raise ConnectionTestError("Failed to retrieve schema information")
        
        # Find the requested table
        tables = schema_info.get("tables", {})
        if isinstance(tables, list):
            # If tables is a list of names, we need to fetch columns separately
            # For now, return an error asking to use the schema endpoint
            raise ValidationError("Table column details not available. Please use the schema endpoint with include_columns=true")
        
        if table_name not in tables:
            raise NotFoundError(f"Table '{table_name}' not found in schema")
        
        table_info = tables[table_name]
        columns = table_info.get("columns", [])
        
        return jsonify({
            "connection_id": connection_id,
            "table_name": table_name,
            "schema_name": schema_name or connection.schema_name,
            "columns": columns,
            "count": len(columns)
        })
        
    except NotFoundError:
        raise
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error getting columns for table {table_name}: {str(e)}")
        raise ConnectionTestError(f"Failed to get table columns: {str(e)}")


@api_v1_bp.route("/connections/<connection_id>/query/validate", methods=["POST"])
@jwt_required()
@require_tenant_context
def validate_sql_query(connection_id: str):
    """
    Validate a SQL query without executing it.
    
    Args:
        connection_id: Connection UUID
    
    Request Body:
        - query: SQL query to validate
    
    Returns:
        Validation result with syntax check and estimated column schema
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    data = request.get_json()
    
    if not data or not data.get("query"):
        raise ValidationError("SQL query is required")
    
    query = data["query"]
    
    connection_service = ConnectionService(tenant_id)
    
    # Get connection
    connection = connection_service.get_connection(connection_id)
    if not connection:
        raise NotFoundError("Connection not found")
    
    try:
        # Validate query syntax by using EXPLAIN or a similar approach
        # For now, we'll do a simple syntax check
        # TODO: Implement proper query validation using database-specific methods
        
        # Basic validation
        query_lower = query.lower().strip()
        
        # Check for dangerous operations
        dangerous_keywords = ['drop', 'delete', 'truncate', 'insert', 'update', 'alter', 'create']
        for keyword in dangerous_keywords:
            if keyword in query_lower.split():
                raise ValidationError(f"Query contains potentially dangerous keyword: {keyword}")
        
        # Check if it's a SELECT query
        if not query_lower.startswith('select'):
            raise ValidationError("Only SELECT queries are allowed")
        
        return jsonify({
            "valid": True,
            "message": "Query syntax appears valid",
            "query": query
        })
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error validating query: {str(e)}")
        return jsonify({
            "valid": False,
            "message": f"Query validation failed: {str(e)}",
            "query": query
        }), 400
