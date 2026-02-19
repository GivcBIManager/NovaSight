"""
NovaSight PySpark Apps API Endpoints
====================================

REST API for PySpark application configuration and code generation.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required
from app.platform.auth.identity import get_current_identity
from pydantic import ValidationError as PydanticValidationError

from app.api.v1 import api_v1_bp
from app.domains.compute.application.pyspark_app_service import PySparkAppService
from app.decorators import require_roles, require_tenant_context
from app.errors import ValidationError, NotFoundError
from app.domains.compute.schemas.pyspark_schemas import (
    PySparkAppCreateSchema,
    PySparkAppUpdateSchema,
    PySparkCodePreviewSchema,
    QueryValidationRequestSchema,
)
from app.domains.compute.domain.models import (
    PySparkApp,
    PySparkAppStatus,
    SourceType,
    WriteMode,
    SCDType,
    CDCType,
)
import logging

logger = logging.getLogger(__name__)


@api_v1_bp.route("/pyspark-apps", methods=["GET"])
@jwt_required()
@require_tenant_context
def list_pyspark_apps():
    """
    List all PySpark apps for current tenant.
    
    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)
        - status: Filter by status (draft, active, inactive, error)
        - connection_id: Filter by source connection
        - search: Search by name/description
    
    Returns:
        Paginated list of PySpark apps
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")
    connection_id = request.args.get("connection_id")
    search = request.args.get("search")
    
    service = PySparkAppService(tenant_id)
    result = service.list_apps(
        page=page,
        per_page=per_page,
        status=status,
        connection_id=connection_id,
        search=search,
    )
    
    return jsonify(result)


@api_v1_bp.route("/pyspark-apps", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def create_pyspark_app():
    """
    Create a new PySpark app configuration.
    
    Request Body:
        - name: App display name (unique per tenant)
        - connection_id: Source connection UUID
        - source_type: 'table' or 'query'
        - source_table: Table name (if source_type is 'table')
        - source_query: SQL query (if source_type is 'query')
        - columns_config: Column configuration list
        - primary_key_columns: Primary key column names
        - cdc_type: CDC type (none, timestamp, version, hash)
        - cdc_column: CDC tracking column
        - partition_columns: Partition column names
        - scd_type: SCD type (none, type1, type2)
        - write_mode: Write mode (append, overwrite, merge)
        - target_database: Target database name
        - target_table: Target table name
        
    Returns:
        Created PySpark app details
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    user_id = identity.user_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")
    
    # Validate with Pydantic
    try:
        schema = PySparkAppCreateSchema(**data)
    except PydanticValidationError as e:
        errors = [{"field": err["loc"][0], "message": err["msg"]} for err in e.errors()]
        raise ValidationError("Validation failed", details={"errors": errors})
    
    service = PySparkAppService(tenant_id)
    app = service.create_app(
        name=schema.name,
        connection_id=schema.connection_id,
        created_by=user_id,
        description=schema.description,
        source_type=schema.source_type.value,
        source_schema=schema.source_schema,
        source_table=schema.source_table,
        source_query=schema.source_query,
        columns_config=[col.dict() for col in schema.columns_config],
        primary_key_columns=schema.primary_key_columns,
        cdc_type=schema.cdc_type.value,
        cdc_column=schema.cdc_column,
        partition_columns=schema.partition_columns,
        scd_type=schema.scd_type.value,
        write_mode=schema.write_mode.value,
        target_database=schema.target_database,
        target_table=schema.target_table,
        target_engine=schema.target_engine,
        options=schema.options,
    )
    
    return jsonify(app.to_dict()), 201


@api_v1_bp.route("/pyspark-apps/<app_id>", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_pyspark_app(app_id: str):
    """
    Get PySpark app details.
    
    Path Parameters:
        - app_id: PySpark app UUID
        
    Query Parameters:
        - include_code: Include generated code (default: false)
    
    Returns:
        PySpark app details
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    include_code = request.args.get("include_code", "false").lower() == "true"
    
    service = PySparkAppService(tenant_id)
    app = service.get_app(app_id, include_code=include_code)
    
    if not app:
        raise NotFoundError(f"PySpark app {app_id} not found")
    
    return jsonify(app.to_dict(include_code=include_code))


@api_v1_bp.route("/pyspark-apps/<app_id>", methods=["PUT"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def update_pyspark_app(app_id: str):
    """
    Update a PySpark app configuration.
    
    Path Parameters:
        - app_id: PySpark app UUID
        
    Request Body:
        Any fields from create endpoint (all optional)
    
    Returns:
        Updated PySpark app details
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")
    
    # Validate with Pydantic
    try:
        schema = PySparkAppUpdateSchema(**data)
    except PydanticValidationError as e:
        errors = [{"field": err["loc"][0], "message": err["msg"]} for err in e.errors()]
        raise ValidationError("Validation failed", details={"errors": errors})
    
    # Convert schema to dict, excluding None values
    # Use model_dump() for Pydantic v2 compatibility
    update_data = {k: v for k, v in schema.model_dump().items() if v is not None}
    
    # Convert enums to values
    if "source_type" in update_data:
        update_data["source_type"] = update_data["source_type"].value if hasattr(update_data["source_type"], 'value') else update_data["source_type"]
    if "cdc_type" in update_data:
        update_data["cdc_type"] = update_data["cdc_type"].value if hasattr(update_data["cdc_type"], 'value') else update_data["cdc_type"]
    if "scd_type" in update_data:
        update_data["scd_type"] = update_data["scd_type"].value if hasattr(update_data["scd_type"], 'value') else update_data["scd_type"]
    if "write_mode" in update_data:
        update_data["write_mode"] = update_data["write_mode"].value if hasattr(update_data["write_mode"], 'value') else update_data["write_mode"]
    if "status" in update_data:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
    # columns_config is already a list of dicts from model_dump()
    
    service = PySparkAppService(tenant_id)
    app = service.update_app(app_id, **update_data)
    
    return jsonify(app.to_dict())


@api_v1_bp.route("/pyspark-apps/<app_id>", methods=["DELETE"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def delete_pyspark_app(app_id: str):
    """
    Delete a PySpark app.
    
    Path Parameters:
        - app_id: PySpark app UUID
    
    Returns:
        Success message
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    service = PySparkAppService(tenant_id)
    service.delete_app(app_id)
    
    return jsonify({"message": f"PySpark app {app_id} deleted successfully"})


@api_v1_bp.route("/pyspark-apps/<app_id>/generate", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def generate_pyspark_code(app_id: str):
    """
    Generate PySpark code from app configuration.
    
    Writes the generated code to:
    1. Database (app.generated_code) for persistence
    2. /opt/spark/jobs/{app_name}.py file for execution
    
    Path Parameters:
        - app_id: PySpark app UUID
    
    Returns:
        Generated code and metadata including job file path
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    service = PySparkAppService(tenant_id)
    code, metadata = service.generate_code(app_id)
    
    return jsonify({
        "code": code,
        "template_name": metadata["template_name"],
        "template_version": metadata["template_version"],
        "parameters_hash": metadata["parameters_hash"],
        "generated_at": metadata["generated_at"],
        "job_file_path": metadata.get("job_file_path"),
    })


@api_v1_bp.route("/pyspark-apps/<app_id>/code", methods=["GET"])
@jwt_required()
@require_tenant_context
def get_pyspark_code(app_id: str):
    """
    Get previously generated PySpark code.
    
    Path Parameters:
        - app_id: PySpark app UUID
    
    Returns:
        Generated code and metadata
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    service = PySparkAppService(tenant_id)
    app = service.get_app(app_id, include_code=True)
    
    if not app:
        raise NotFoundError(f"PySpark app {app_id} not found")
    
    if not app.generated_code:
        raise ValidationError("Code has not been generated yet. Use POST /generate first.")
    
    return jsonify({
        "code": app.generated_code,
        "code_hash": app.generated_code_hash,
        "template_version": app.template_version,
        "generated_at": app.generated_at.isoformat() if app.generated_at else None,
    })


@api_v1_bp.route("/pyspark-apps/preview", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def preview_pyspark_code():
    """
    Preview PySpark code without saving.
    
    Request Body:
        Same as create endpoint
    
    Returns:
        Generated code preview and metadata
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")
    
    # Validate with Pydantic
    try:
        schema = PySparkCodePreviewSchema(**data)
    except PydanticValidationError as e:
        errors = [{"field": err["loc"][0], "message": err["msg"]} for err in e.errors()]
        raise ValidationError("Validation failed", details={"errors": errors})
    
    service = PySparkAppService(tenant_id)
    code, metadata = service.preview_code(
        connection_id=schema.connection_id,
        source_type=schema.source_type.value,
        source_schema=schema.source_schema,
        source_table=schema.source_table,
        source_query=schema.source_query,
        columns_config=[col.dict() for col in schema.columns_config],
        primary_key_columns=schema.primary_key_columns,
        cdc_type=schema.cdc_type.value,
        cdc_column=schema.cdc_column,
        partition_columns=schema.partition_columns,
        scd_type=schema.scd_type.value,
        write_mode=schema.write_mode.value,
        target_database=schema.target_database,
        target_table=schema.target_table,
        target_engine=schema.target_engine,
        options=schema.options,
    )
    
    return jsonify({
        "code": code,
        "template_name": metadata["template_name"],
        "template_version": metadata["template_version"],
        "parameters_hash": metadata["parameters_hash"],
        "is_preview": True,
    })


@api_v1_bp.route("/pyspark-apps/validate-query", methods=["POST"])
@jwt_required()
@require_tenant_context
def validate_pyspark_query():
    """
    Validate SQL query and get column metadata.
    
    Request Body:
        - connection_id: Connection UUID
        - query: SQL query to validate
    
    Returns:
        Validation result with columns
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("Request body required")
    
    connection_id = data.get("connection_id")
    query = data.get("query")
    
    if not connection_id:
        raise ValidationError("connection_id is required")
    if not query:
        raise ValidationError("query is required")
    
    try:
        schema = QueryValidationRequestSchema(query=query)
    except PydanticValidationError as e:
        errors = [{"field": err["loc"][0], "message": err["msg"]} for err in e.errors()]
        raise ValidationError("Validation failed", details={"errors": errors})
    
    service = PySparkAppService(tenant_id)
    result = service.validate_query(connection_id, schema.query)
    
    return jsonify(result)


@api_v1_bp.route("/pyspark-apps/<app_id>/activate", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def activate_pyspark_app(app_id: str):
    """
    Activate a PySpark app (set status to active).
    
    This makes the app visible to Dagster for scheduled execution.
    Code must be generated before activation.
    
    Path Parameters:
        - app_id: PySpark app UUID
    
    Returns:
        Updated PySpark app details
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    service = PySparkAppService(tenant_id)
    app = service.get_app(app_id)
    
    if not app:
        raise NotFoundError(f"PySpark app {app_id} not found")
    
    # Ensure code is generated before activating
    if not app.generated_code:
        raise ValidationError("Cannot activate app without generated code. Generate code first.")
    
    # Update status to active
    app = service.update_app(app_id, status="active")
    
    # Trigger Dagster code location reload so it picks up the new asset
    try:
        _reload_dagster_code_location()
    except Exception as e:
        logger.warning(f"Failed to reload Dagster code location: {e}")
    
    return jsonify({
        **app.to_dict(),
        "message": "App activated successfully. It will appear in Dagster shortly."
    })


@api_v1_bp.route("/pyspark-apps/<app_id>/deactivate", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def deactivate_pyspark_app(app_id: str):
    """
    Deactivate a PySpark app (set status to inactive).
    
    This removes the app from Dagster scheduled execution.
    
    Path Parameters:
        - app_id: PySpark app UUID
    
    Returns:
        Updated PySpark app details
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    service = PySparkAppService(tenant_id)
    app = service.get_app(app_id)
    
    if not app:
        raise NotFoundError(f"PySpark app {app_id} not found")
    
    # Update status to inactive
    app = service.update_app(app_id, status="inactive")
    
    # Trigger Dagster code location reload
    try:
        _reload_dagster_code_location()
    except Exception as e:
        logger.warning(f"Failed to reload Dagster code location: {e}")
    
    return jsonify({
        **app.to_dict(),
        "message": "App deactivated successfully."
    })


@api_v1_bp.route("/pyspark-apps/<app_id>/run", methods=["POST"])
@jwt_required()
@require_tenant_context
@require_roles(["data_engineer", "tenant_admin"])
def run_pyspark_app(app_id: str):
    """
    Trigger an immediate execution of a PySpark app via Dagster.
    
    This materializes the corresponding Dagster asset.
    
    Path Parameters:
        - app_id: PySpark app UUID
    
    Returns:
        Run information including Dagster run_id
    """
    import requests
    from flask import current_app
    
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    
    service = PySparkAppService(tenant_id)
    app = service.get_app(app_id)
    
    if not app:
        raise NotFoundError(f"PySpark app {app_id} not found")
    
    if app.status != PySparkAppStatus.ACTIVE:
        raise ValidationError("Can only run active apps. Activate the app first.")
    
    if not app.generated_code:
        raise ValidationError("Cannot run app without generated code. Generate code first.")
    
    # Build asset key for Dagster
    safe_tenant_id = str(tenant_id).replace('-', '_')
    safe_app_name = app.name.lower().replace(' ', '_').replace('-', '_')
    asset_key = ["pyspark", safe_tenant_id, f"pyspark_{safe_app_name}"]
    
    # Call Dagster GraphQL to materialize the asset
    dagster_url = current_app.config.get('DAGSTER_GRAPHQL_URL', 'http://localhost:3000/graphql')
    
    mutation = """
    mutation LaunchAssetRun($assetKey: AssetKeyInput!) {
        launchPipelineExecution(
            executionParams: {
                selector: {
                    repositoryLocationName: "novasight"
                    repositoryName: "__repository__"
                    assetSelection: [$assetKey]
                    assetCheckSelection: []
                }
                mode: "default"
            }
        ) {
            ... on LaunchRunSuccess {
                run {
                    id
                    runId
                    status
                }
            }
            ... on PipelineNotFoundError {
                message
            }
            ... on InvalidSubsetError {
                message
            }
            ... on RunConfigValidationInvalid {
                errors {
                    message
                }
            }
            ... on PythonError {
                message
            }
        }
    }
    """
    
    try:
        response = requests.post(
            dagster_url,
            json={
                "query": mutation,
                "variables": {
                    "assetKey": {"path": asset_key}
                }
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        
        if "errors" in result:
            raise ValidationError(f"Dagster error: {result['errors'][0].get('message', 'Unknown error')}")
        
        launch_result = result.get("data", {}).get("launchPipelineExecution", {})
        
        if "run" in launch_result:
            run_info = launch_result["run"]
            return jsonify({
                "success": True,
                "run_id": run_info.get("runId"),
                "dagster_run_id": run_info.get("id"),
                "status": run_info.get("status"),
                "message": f"PySpark job started successfully. Run ID: {run_info.get('runId')}"
            })
        else:
            error_msg = launch_result.get("message", "Failed to launch run")
            raise ValidationError(f"Failed to start run: {error_msg}")
            
    except requests.exceptions.ConnectionError:
        raise ValidationError("Cannot connect to Dagster. Please ensure Dagster is running.")
    except requests.exceptions.Timeout:
        raise ValidationError("Request to Dagster timed out.")


def _reload_dagster_code_location():
    """
    Trigger a reload of the Dagster code location to pick up new/changed assets.
    """
    import requests
    from flask import current_app
    
    dagster_url = current_app.config.get('DAGSTER_GRAPHQL_URL', 'http://localhost:3000/graphql')
    
    mutation = """
    mutation ReloadCodeLocation {
        reloadRepositoryLocation(repositoryLocationName: "novasight") {
            ... on WorkspaceLocationEntry {
                name
                loadStatus
            }
            ... on ReloadNotSupported {
                message
            }
            ... on RepositoryLocationNotFound {
                message
            }
            ... on PythonError {
                message
            }
        }
    }
    """
    
    response = requests.post(
        dagster_url,
        json={"query": mutation},
        headers={"Content-Type": "application/json"},
        timeout=30
    )
    response.raise_for_status()
    return response.json()
