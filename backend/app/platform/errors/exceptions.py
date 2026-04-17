"""
NovaSight Platform – Exception Hierarchy
==========================================

All domain-specific exceptions and Flask error-handler registration.

Canonical location – merges ``app.errors`` and
``app.middleware.error_handlers`` into a single module.
"""

import logging
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


# ─── Exception hierarchy ───────────────────────────────────────────

class NovaSightException(Exception):
    """Base exception for the NovaSight application."""

    status_code = 500
    error_code = "INTERNAL_ERROR"
    message = "An unexpected error occurred"

    def __init__(
        self,
        message: str = None,
        status_code: int = None,
        error_code: str = None,
        details: dict = None,
    ):
        super().__init__(message or self.message)
        if message:
            self.message = message
        if status_code:
            self.status_code = status_code
        if error_code:
            self.error_code = error_code
        self.details = details or {}

    def to_dict(self) -> dict:
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
            }
        }


class ValidationError(NovaSightException):
    status_code = 400
    error_code = "VALIDATION_ERROR"
    message = "Invalid input data"


class AuthenticationError(NovaSightException):
    status_code = 401
    error_code = "AUTHENTICATION_ERROR"
    message = "Authentication required"


class AuthorizationError(NovaSightException):
    status_code = 403
    error_code = "AUTHORIZATION_ERROR"
    message = "Access denied"


class NotFoundError(NovaSightException):
    status_code = 404
    error_code = "NOT_FOUND"
    message = "Resource not found"


class ConflictError(NovaSightException):
    status_code = 409
    error_code = "CONFLICT"
    message = "Resource conflict"


class TenantNotFoundError(NotFoundError):
    error_code = "TENANT_NOT_FOUND"
    message = "Tenant not found"


class ConnectionTestError(NovaSightException):
    status_code = 400
    error_code = "CONNECTION_TEST_FAILED"
    message = "Database connection test failed"


class TemplateRenderError(NovaSightException):
    status_code = 500
    error_code = "TEMPLATE_RENDER_ERROR"
    message = "Failed to render template"


class DagsterAPIError(NovaSightException):
    """Dagster API communication error."""
    status_code = 502
    error_code = "DAGSTER_API_ERROR"
    message = "Dagster API error"


# ─── Error handler registration ────────────────────────────────────

def register_error_handlers(app: Flask) -> None:
    """
    Register unified error handlers on *app*.

    Merges the two legacy handler sets (``app.errors`` +
    ``app.middleware.error_handlers``) into a single, consistent
    JSON-response scheme.
    """

    @app.errorhandler(NovaSightException)
    def handle_novasight(error: NovaSightException):
        logger.warning("%s: %s", error.error_code, error.message, exc_info=True)
        return jsonify(error.to_dict()), error.status_code

    @app.errorhandler(400)
    def bad_request(error):
        desc = getattr(error, "description", "Bad request")
        return jsonify({"error": {"code": "HTTP_400", "message": str(desc), "details": {}}}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        desc = getattr(error, "description", "Authentication required")
        return jsonify({"error": {"code": "HTTP_401", "message": str(desc), "details": {}}}), 401

    @app.errorhandler(403)
    def forbidden(error):
        desc = getattr(error, "description", "Access denied")
        return jsonify({"error": {"code": "HTTP_403", "message": str(desc), "details": {}}}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": {"code": "HTTP_404", "message": "Resource not found", "details": {}}}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": {"code": "HTTP_405", "message": "Method not allowed", "details": {}}}), 405

    @app.errorhandler(409)
    def conflict(error):
        desc = getattr(error, "description", "Resource conflict")
        return jsonify({"error": {"code": "HTTP_409", "message": str(desc), "details": {}}}), 409

    @app.errorhandler(422)
    def unprocessable(error):
        desc = getattr(error, "description", "Validation error")
        return jsonify({"error": {"code": "HTTP_422", "message": str(desc), "details": {}}}), 422

    @app.errorhandler(429)
    def rate_limited(error):
        return jsonify({"error": {"code": "HTTP_429", "message": "Too many requests", "details": {}}}), 429

    @app.errorhandler(HTTPException)
    def handle_http(error: HTTPException):
        return jsonify({
            "error": {
                "code": f"HTTP_{error.code}",
                "message": error.description,
                "details": {},
            }
        }), error.code

    @app.errorhandler(Exception)
    def handle_generic(error: Exception):
        logger.error("Unhandled exception: %s", error, exc_info=True)
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {},
            }
        }), 500
