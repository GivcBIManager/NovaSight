"""
NovaSight Orchestration Domain â€” DAG Routes
=============================================

Dagster pipeline configuration and monitoring API endpoints.
Provides REST API for managing DAG configurations, triggering runs,
and monitoring pipeline execution.

Canonical location: ``app.domains.orchestration.api.dag_routes``
"""

from flask import request, jsonify

from app.api.v1 import api_v1_bp
from app.platform.auth.identity import get_current_identity
from app.domains.orchestration.application.dag_service import DagService
from app.platform.auth.decorators import authenticated, require_roles, tenant_required
from app.errors import ValidationError, NotFoundError, DagsterAPIError
from app.platform.audit.service import AuditService
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# DAG CRUD Endpoints
# ============================================================================


@api_v1_bp.route("/dags", methods=["GET"])
@authenticated
@tenant_required
def list_dags():
    """
    List all DAG configurations for current tenant.

    Query Parameters:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)
        - status: Filter by status (active, paused, draft)
        - tag: Filter by tag
        - include_archived: Include archived (deleted) DAGs (default: false)

    Returns:
        Paginated list of DAG configurations
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")
    tag = request.args.get("tag")
    include_archived = request.args.get("include_archived", "false").lower() == "true"

    dag_service = DagService(tenant_id)
    result = dag_service.list_dags(
        page=page,
        per_page=per_page,
        status=status,
        tag=tag,
        include_archived=include_archived,
    )

    return jsonify(result)


@api_v1_bp.route("/dags", methods=["POST"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def create_dag():
    """
    Create a new DAG configuration.

    Request Body:
        - dag_id: Unique DAG identifier
        - description: DAG description
        - schedule_type: Schedule type (cron, preset, manual)
        - schedule_cron: CRON expression (if schedule_type is cron)
        - schedule_preset: Preset schedule (hourly, daily, weekly, monthly)
        - timezone: Execution timezone
        - start_date: DAG start date
        - tasks: List of task configurations
        - tags: List of tags
        - notification_emails: Email addresses for notifications
        - email_on_failure: Send email on task failure
        - email_on_success: Send email on DAG success

    Returns:
        Created DAG configuration
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    user_id = identity.user_id
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    required_fields = ["dag_id", "tasks"]
    for field in required_fields:
        if not data.get(field):
            raise ValidationError(f"Field '{field}' is required")

    dag_id = data["dag_id"]
    if not dag_id.replace("_", "").isalnum() or not dag_id[0].isalpha():
        raise ValidationError(
            "DAG ID must start with a letter and contain only "
            "alphanumeric characters and underscores"
        )

    dag_service = DagService(tenant_id)
    dag_config = dag_service.create_dag(
        dag_id=dag_id,
        description=data.get("description", ""),
        schedule_type=data.get("schedule_type", "manual"),
        schedule_cron=data.get("schedule_cron"),
        schedule_preset=data.get("schedule_preset"),
        timezone=data.get("timezone", "UTC"),
        start_date=data.get("start_date"),
        tasks=data["tasks"],
        tags=data.get("tags", []),
        notification_emails=data.get("notification_emails", []),
        email_on_failure=data.get("email_on_failure", True),
        email_on_success=data.get("email_on_success", False),
        catchup=data.get("catchup", False),
        max_active_runs=data.get("max_active_runs", 1),
        created_by=user_id,
    )

    logger.info(f"DAG '{dag_id}' created in tenant {tenant_id}")
    
    # Audit log: DAG created
    AuditService.log(
        action='dag.created',
        resource_type='dag',
        resource_id=str(dag_config.id),
        resource_name=dag_id,
        tenant_id=tenant_id,
        extra_data={'schedule_type': data.get('schedule_type', 'manual')},
    )
    
    return jsonify({"dag": dag_config.to_dict()}), 201


@api_v1_bp.route("/dags/<dag_id>", methods=["GET"])
@authenticated
@tenant_required
def get_dag(dag_id: str):
    """Get DAG configuration details."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    include_runs = request.args.get("include_runs", "false").lower() == "true"

    dag_service = DagService(tenant_id)
    dag_config = dag_service.get_dag(dag_id, include_runs=include_runs)

    if not dag_config:
        raise NotFoundError("DAG not found")

    return jsonify({"dag": dag_config.to_dict()})


@api_v1_bp.route("/dags/<dag_id>", methods=["PUT"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def update_dag(dag_id: str):
    """Update DAG configuration (creates new version)."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    user_id = identity.user_id
    data = request.get_json()

    if not data:
        raise ValidationError("Request body required")

    # Remove dag_id from data if present (it's already in URL)
    data.pop("dag_id", None)

    dag_service = DagService(tenant_id)
    dag_config = dag_service.update_dag(dag_id, updated_by=user_id, **data)

    if not dag_config:
        raise NotFoundError("DAG not found")

    logger.info(f"DAG '{dag_id}' updated in tenant {tenant_id}")
    
    # Audit log: DAG updated
    AuditService.log(
        action='dag.updated',
        resource_type='dag',
        resource_id=str(dag_config.id),
        resource_name=dag_id,
        tenant_id=tenant_id,
        changes={'updated_fields': list(data.keys())},
    )
    
    return jsonify({"dag": dag_config.to_dict()})


@api_v1_bp.route("/dags/<dag_id>", methods=["DELETE"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def delete_dag(dag_id: str):
    """
    Delete DAG configuration.

    Performs full cleanup: pauses in Dagster, removes the generated job
    definition, and archives or hard-deletes from DB.

    Query Parameters:
        - hard: If "true", permanently removes the DAG from the database.
                Otherwise the DAG is archived (soft-delete).
    """
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    hard_delete = request.args.get("hard", "false").lower() == "true"

    dag_service = DagService(tenant_id)
    success = dag_service.delete_dag(dag_id, hard_delete=hard_delete)

    if not success:
        raise NotFoundError("DAG not found")

    action = "permanently deleted" if hard_delete else "archived"
    logger.info(f"DAG '{dag_id}' {action} from tenant {tenant_id}")
    
    # Audit log: DAG deleted
    AuditService.log(
        action='dag.deleted',
        resource_type='dag',
        resource_name=dag_id,
        tenant_id=tenant_id,
        extra_data={'hard_delete': hard_delete},
    )
    
    return jsonify({"message": f"DAG {action} successfully"})


@api_v1_bp.route("/dags/<dag_id>/validate", methods=["POST"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def validate_dag(dag_id: str):
    """Validate DAG configuration."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    dag_service = DagService(tenant_id)
    result = dag_service.validate_dag(dag_id)

    if result is None:
        raise NotFoundError("DAG not found")

    return jsonify(result)


@api_v1_bp.route("/dags/<dag_id>/deploy", methods=["POST"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def deploy_dag(dag_id: str):
    """Deploy DAG to Dagster."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    user_id = identity.user_id

    logger.info(f"Deploy request for dag_id='{dag_id}' in tenant={tenant_id}")
    
    dag_service = DagService(tenant_id)
    result = dag_service.deploy_dag(dag_id, deployed_by=user_id)

    logger.info(f"Deploy result for dag_id='{dag_id}': {result}")
    
    if result is None:
        raise NotFoundError("DAG not found")

    if not result.get("success"):
        raise DagsterAPIError(result.get("error", "Deployment failed"))

    logger.info(f"DAG '{dag_id}' deployed to Dagster by user {user_id}")
    
    # Audit log: DAG deployed
    AuditService.log(
        action='dag.deployed',
        resource_type='dag',
        resource_name=dag_id,
        tenant_id=tenant_id,
    )
    
    return jsonify(result)


@api_v1_bp.route("/dags/<dag_id>/trigger", methods=["POST"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def trigger_dag(dag_id: str):
    """Trigger immediate DAG run."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id
    data = request.get_json() or {}

    dag_service = DagService(tenant_id)
    result = dag_service.trigger_dag(dag_id, conf=data.get("conf", {}))

    if result is None:
        raise NotFoundError("DAG not found")

    if not result.get("success"):
        raise DagsterAPIError(result.get("error", "Failed to trigger job"))

    logger.info(f"DAG '{dag_id}' triggered in tenant {tenant_id}")
    
    # Audit log: DAG triggered
    AuditService.log(
        action='dag.triggered',
        resource_type='dag',
        resource_name=dag_id,
        tenant_id=tenant_id,
        extra_data={'conf': data.get('conf', {})},
    )
    
    return jsonify(result)


@api_v1_bp.route("/dags/<dag_id>/pause", methods=["POST"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def pause_dag(dag_id: str):
    """Pause DAG scheduling in Dagster."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    dag_service = DagService(tenant_id)
    result = dag_service.pause_dag(dag_id)

    if result is None:
        raise NotFoundError("DAG not found")

    if not result.get("success"):
        raise DagsterAPIError(result.get("error", "Failed to pause DAG in Dagster"))

    logger.info(f"DAG '{dag_id}' paused in tenant {tenant_id}")
    
    # Audit log: DAG paused
    AuditService.log(
        action='dag.paused',
        resource_type='dag',
        resource_name=dag_id,
        tenant_id=tenant_id,
    )
    
    return jsonify(result)


@api_v1_bp.route("/dags/<dag_id>/unpause", methods=["POST"])
@authenticated
@tenant_required
@require_roles(["data_engineer", "tenant_admin"])
def unpause_dag(dag_id: str):
    """Resume DAG scheduling in Dagster."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    dag_service = DagService(tenant_id)
    result = dag_service.unpause_dag(dag_id)

    if result is None:
        raise NotFoundError("DAG not found")

    if not result.get("success"):
        raise DagsterAPIError(result.get("error", "Failed to resume DAG in Dagster"))

    logger.info(f"DAG '{dag_id}' unpaused in tenant {tenant_id}")
    
    # Audit log: DAG unpaused
    AuditService.log(
        action='dag.unpaused',
        resource_type='dag',
        resource_name=dag_id,
        tenant_id=tenant_id,
    )
    
    return jsonify(result)


@api_v1_bp.route("/dags/<dag_id>/runs", methods=["GET"])
@authenticated
@tenant_required
def list_dag_runs(dag_id: str):
    """List DAG run history."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 25, type=int)
    state = request.args.get("state")

    dag_service = DagService(tenant_id)
    result = dag_service.list_dag_runs(dag_id, page=page, per_page=per_page, state=state)

    if result is None:
        raise NotFoundError("DAG not found")

    return jsonify(result)


@api_v1_bp.route("/dags/<dag_id>/runs/<run_id>", methods=["GET"])
@authenticated
@tenant_required
def get_dag_run(dag_id: str, run_id: str):
    """Get DAG run details with task instances."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    dag_service = DagService(tenant_id)
    result = dag_service.get_dag_run(dag_id, run_id)

    if result is None:
        raise NotFoundError("DAG run not found")

    return jsonify(result)


@api_v1_bp.route("/dags/<dag_id>/runs/<run_id>/tasks/<task_id>/logs", methods=["GET"])
@authenticated
@tenant_required
def get_task_logs(dag_id: str, run_id: str, task_id: str):
    """Get task execution logs."""
    identity = get_current_identity()
    tenant_id = identity.tenant_id

    try_number = request.args.get("try_number", type=int)

    dag_service = DagService(tenant_id)
    result = dag_service.get_task_logs(dag_id, run_id, task_id, try_number)

    if result is None:
        raise NotFoundError("Task logs not found")

    return jsonify(result)
