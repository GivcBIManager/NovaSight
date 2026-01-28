"""
NovaSight PySpark Job Management Endpoints
==========================================

REST API endpoints for PySpark job configuration and code generation.
"""

from flask import request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from io import BytesIO
from app.api.v1 import api_v1_bp
from app.services.pyspark_job_service import PySparkJobService
from app.decorators import require_roles, require_tenant_context
from app.errors import ValidationError, NotFoundError, ConflictError
import logging

logger = logging.getLogger(__name__)


@api_v1_bp.route("/pyspark-jobs", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_pyspark_jobs():
    """
    List all PySpark job configurations for current tenant.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)
        - status: Filter by status (draft, active, inactive, archived)
        - connection_id: Filter by connection UUID
        - search: Search in job name or description
    
    Returns:
        Paginated list of PySpark job configurations
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")
    connection_id = request.args.get("connection_id")
    search = request.args.get("search")
    
    service = PySparkJobService(tenant_id)
    result = service.list_jobs(
        page=page,
        per_page=per_page,
        status=status,
        connection_id=connection_id,
        search=search
    )
    
    return jsonify(result)


@api_v1_bp.route("/pyspark-jobs/<job_id>", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_pyspark_job(job_id):
    """
    Get a specific PySpark job configuration.
    
    Path Parameters:
        - job_id: Job UUID
    
    Query Parameters:
        - include_code: Include generated code (default: false)
    
    Returns:
        PySpark job configuration
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    include_code = request.args.get("include_code", "false").lower() == "true"
    
    service = PySparkJobService(tenant_id)
    job = service.get_job(job_id, include_code=include_code)
    
    return jsonify(job)


@api_v1_bp.route("/pyspark-jobs", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def create_pyspark_job():
    """
    Create a new PySpark job configuration.
    
    Request Body:
        - job_name: Unique job identifier (required)
        - description: Job description (optional)
        - connection_id: Source connection UUID (required)
        - source_type: "table" or "sql_query" (required)
        - source_table: Table name (required if source_type is "table")
        - source_query: SQL query (required if source_type is "sql_query")
        - selected_columns: Array of column names (optional, empty means all)
        - primary_keys: Array of primary key column names (optional)
        - scd_type: "type_0", "type_1", or "type_2" (default: "type_1")
        - write_mode: "append", "overwrite", "upsert", or "merge" (default: "append")
        - cdc_column: CDC column name (optional)
        - partition_columns: Array of partition column names (optional)
        - target_database: Target database name (required)
        - target_table: Target table name (required)
        - target_schema: Target schema (optional)
        - spark_config: Additional Spark configuration (optional)
    
    Returns:
        Created PySpark job configuration
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    user_id = identity.get("user_id")
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    service = PySparkJobService(tenant_id)
    job = service.create_job(data, user_id)
    
    return jsonify(job), 201


@api_v1_bp.route("/pyspark-jobs/<job_id>", methods=["PUT"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def update_pyspark_job(job_id):
    """
    Update an existing PySpark job configuration.
    
    Path Parameters:
        - job_id: Job UUID
    
    Request Body:
        Same fields as create, all optional
    
    Returns:
        Updated PySpark job configuration
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    user_id = identity.get("user_id")
    data = request.get_json()
    
    if not data:
        raise ValidationError("Request body required")
    
    service = PySparkJobService(tenant_id)
    job = service.update_job(job_id, data, user_id)
    
    return jsonify(job)


@api_v1_bp.route("/pyspark-jobs/<job_id>", methods=["DELETE"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def delete_pyspark_job(job_id):
    """
    Delete a PySpark job configuration.
    
    Path Parameters:
        - job_id: Job UUID
    
    Returns:
        Success message
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    service = PySparkJobService(tenant_id)
    service.delete_job(job_id)
    
    return jsonify({"message": "PySpark job deleted successfully"}), 200


@api_v1_bp.route("/pyspark-jobs/<job_id>/generate", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def generate_pyspark_code(job_id):
    """
    Generate PySpark code for a job configuration.
    
    Path Parameters:
        - job_id: Job UUID
    
    Returns:
        Generated PySpark code and metadata
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    service = PySparkJobService(tenant_id)
    result = service.generate_code(job_id)
    
    return jsonify(result)


@api_v1_bp.route("/pyspark-jobs/<job_id>/preview", methods=["GET"])
@jwt_required()
@require_tenant_context
def preview_pyspark_code(job_id):
    """
    Preview generated PySpark code.
    
    Path Parameters:
        - job_id: Job UUID
    
    Returns:
        Generated PySpark code (plain text or JSON)
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    format_type = request.args.get("format", "json")  # json or text
    
    service = PySparkJobService(tenant_id)
    result = service.generate_code(job_id)
    
    if format_type == "text":
        return result["code"], 200, {"Content-Type": "text/plain; charset=utf-8"}
    else:
        return jsonify(result)


@api_v1_bp.route("/pyspark-jobs/<job_id>/download", methods=["GET"])
@jwt_required()
@require_tenant_context
def download_pyspark_code(job_id):
    """
    Download generated PySpark code as a file.
    
    Path Parameters:
        - job_id: Job UUID
    
    Returns:
        PySpark code file for download
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    
    service = PySparkJobService(tenant_id)
    result = service.generate_code(job_id)
    
    # Create a BytesIO object with the code
    code_bytes = result["code"].encode("utf-8")
    file_obj = BytesIO(code_bytes)
    file_obj.seek(0)
    
    # Generate filename
    filename = f"{result['job_name']}.py"
    
    return send_file(
        file_obj,
        mimetype="text/x-python",
        as_attachment=True,
        download_name=filename
    )


@api_v1_bp.route("/pyspark-jobs/<job_id>/activate", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def activate_pyspark_job(job_id):
    """
    Activate a PySpark job (change status to active).
    
    Path Parameters:
        - job_id: Job UUID
    
    Returns:
        Updated job configuration
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    user_id = identity.get("user_id")
    
    service = PySparkJobService(tenant_id)
    
    # First generate code to ensure it's valid
    service.generate_code(job_id)
    
    # Then update status
    job = service.update_job(job_id, {"status": "active"}, user_id)
    
    return jsonify(job)


@api_v1_bp.route("/pyspark-jobs/<job_id>/deactivate", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def deactivate_pyspark_job(job_id):
    """
    Deactivate a PySpark job (change status to inactive).
    
    Path Parameters:
        - job_id: Job UUID
    
    Returns:
        Updated job configuration
    """
    identity = get_jwt_identity()
    tenant_id = identity.get("tenant_id")
    user_id = identity.get("user_id")
    
    service = PySparkJobService(tenant_id)
    job = service.update_job(job_id, {"status": "inactive"}, user_id)
    
    return jsonify(job)
