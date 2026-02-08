"""
NovaSight Data Sources Domain — Connection Routes
===================================================

Database connection management API endpoints.

Canonical location: ``app.domains.datasources.api.connection_routes``

Changes from legacy ``app.api.v1.connections``:
- Imports service from ``domains.datasources.application``
- Uses ``platform.auth`` decorators and identity resolution
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required

from app.api.v1 import api_v1_bp
from app.domains.datasources.application.connection_service import ConnectionService
from app.platform.auth.identity import get_current_identity
from app.decorators import require_roles, require_tenant_context
from app.errors import ValidationError, NotFoundError
import logging

logger = logging.getLogger(__name__)


@api_v1_bp.route("/connections", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_connections():
    """List all data connections for current tenant."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

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
    """Create a new data source connection."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    user_id = identity.user_id
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    required_fields = [
        "name", "db_type", "host", "port", "database", "username", "password",
    ]
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")

    valid_db_types = ["postgresql", "oracle", "sqlserver", "mysql", "clickhouse"]
    if data["db_type"] not in valid_db_types:
        raise ValidationError(
            f"Invalid db_type. Must be one of: {', '.join(valid_db_types)}"
        )

    connection_service = ConnectionService(tenant_id)

    ssl_mode = data.get("ssl_mode")
    if ssl_mode is None and data.get("ssl_enabled"):
        ssl_mode = "require"

    try:
        connection = connection_service.create_connection(
            name=data["name"],
            db_type=data["db_type"],
            host=data["host"],
            port=data["port"],
            database=data["database"],
            username=data["username"],
            password=data["password"],
            ssl_mode=ssl_mode,
            extra_params=data.get("extra_params", {}),
            created_by=user_id,
        )
    except ValueError as e:
        raise ValidationError(str(e))

    logger.info(f"Connection '{data['name']}' created in tenant {tenant_id}")

    return jsonify({"connection": connection.to_dict(mask_password=True)}), 201


@api_v1_bp.route("/connections/<connection_id>", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_connection(connection_id: str):
    """Get connection details."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

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
    """Update connection details."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id
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
    """Delete a data connection."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

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
    """Test database connection."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

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
    """Test connection parameters without saving."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    required_fields = ["db_type", "host", "port", "database", "username", "password"]
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")

    connection_service = ConnectionService(tenant_id)

    ssl_mode = data.get("ssl_mode")
    if ssl_mode is None and data.get("ssl_enabled"):
        ssl_mode = "require"

    result = connection_service.test_connection_params(
        db_type=data["db_type"],
        host=data["host"],
        port=data["port"],
        database=data["database"],
        username=data["username"],
        password=data["password"],
        ssl_mode=ssl_mode,
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
    """Get database schema information."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

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
    """Trigger data sync for a connection."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    data = request.get_json() or {}
    sync_config = {
        "tables": data.get("tables"),
        "incremental": data.get("incremental", False),
        **data.get("sync_config", {}),
    }

    connection_service = ConnectionService(tenant_id)
    job_id = connection_service.trigger_sync(
        connection_id=connection_id,
        sync_config=sync_config,
    )

    if not job_id:
        raise NotFoundError("Connection not found or sync failed to start")

    logger.info(f"Sync triggered for connection {connection_id}: job_id={job_id}")

    return jsonify({
        "job_id": job_id,
        "status": "started",
        "message": "Data sync job started successfully",
    })
