"""
NovaSight Health Check Endpoints
================================

System health and readiness endpoints.

Exposes both root-level and /api/v1/ health endpoints.
Root-level: /health, /ready (for container health probes)
API-level: /api/v1/health, /api/v1/health/db, /api/v1/health/redis (for CI/deploy)
"""

from flask import Blueprint, jsonify, current_app
from app.extensions import db, redis_client
import logging

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)
health_api_bp = Blueprint("health_api", __name__)


@health_bp.route("/health", methods=["GET"])
@health_api_bp.route("/health", methods=["GET"])
def health_check():
    """
    Basic health check endpoint.
    
    Returns:
        JSON response with health status
    """
    return jsonify({
        "status": "healthy",
        "service": "novasight-api",
        "version": "1.0.0",
    })


@health_bp.route("/ready", methods=["GET"])
@health_api_bp.route("/health/ready", methods=["GET"])
def readiness_check():
    """
    Readiness check endpoint.
    
    Verifies database and cache connectivity.
    
    Returns:
        JSON response with detailed readiness status
    """
    checks = {
        "database": _check_database(),
        "redis": _check_redis(),
    }
    
    all_healthy = all(check["status"] == "healthy" for check in checks.values())
    overall_status = "ready" if all_healthy else "not_ready"
    status_code = 200 if all_healthy else 503
    
    return jsonify({
        "status": overall_status,
        "checks": checks,
    }), status_code


@health_api_bp.route("/health/db", methods=["GET"])
def db_health_check():
    """Database health check endpoint for CI/deploy verification."""
    result = _check_database()
    status_code = 200 if result["status"] == "healthy" else 503
    return jsonify(result), status_code


@health_api_bp.route("/health/redis", methods=["GET"])
def redis_health_check():
    """Redis health check endpoint for CI/deploy verification."""
    result = _check_redis()
    status_code = 200 if result["status"] == "healthy" else 503
    return jsonify(result), status_code


def _check_database() -> dict:
    """Check database connectivity."""
    try:
        db.session.execute(db.text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}


def _check_redis() -> dict:
    """Check Redis connectivity."""
    try:
        if redis_client.client is None:
            return {"status": "disabled"}
        redis_client.ping()
        return {"status": "healthy"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}
