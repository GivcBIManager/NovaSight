"""
NovaSight Platform – JWT Handlers
==================================

Flask-JWT-Extended callback handlers for token validation,
identity serialization / de-serialization, and error responses.

Canonical location – all other modules should import from here.
"""

import json
import logging
from typing import Optional

from flask import Flask, jsonify
from flask_jwt_extended import (
    JWTManager,
    get_jwt_identity as _get_jwt_identity_raw,
)

logger = logging.getLogger(__name__)


# ─── Identity serialization ────────────────────────────────────────

def serialize_identity(identity: dict) -> str:
    """Serialize identity dict to a deterministic JSON string for the JWT *sub* claim."""
    return json.dumps(identity, sort_keys=True)


def deserialize_identity(identity_raw) -> dict:
    """
    Deserialize identity from the JWT *sub* claim.

    Handles both the new JSON-string format and legacy dict format
    for backwards compatibility.
    """
    if isinstance(identity_raw, dict):
        return identity_raw
    if isinstance(identity_raw, str):
        try:
            return json.loads(identity_raw)
        except json.JSONDecodeError:
            logger.error("Failed to deserialize JWT identity: %s", identity_raw)
            return {}
    return {}


def get_jwt_identity_dict() -> dict:
    """
    Return the current JWT identity as a plain dictionary.

    Wraps Flask-JWT-Extended's ``get_jwt_identity()`` to transparently
    handle the JSON-string serialization used for the *sub* claim.
    """
    raw = _get_jwt_identity_raw()
    return deserialize_identity(raw)


# ─── JWT callback registration ─────────────────────────────────────

def register_jwt_handlers(jwt: JWTManager) -> None:
    """
    Register all JWT callback handlers on the given ``JWTManager``.

    Callbacks handle:
    * token blacklist checking
    * revoked / expired / invalid / missing token responses
    * identity serialization & lookup
    * additional claims injection
    """

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_jwt_header, jwt_payload) -> bool:
        from app.platform.auth.token_service import token_blacklist
        jti = jwt_payload.get("jti")
        return token_blacklist.is_blacklisted(jti)

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return jsonify({
            "error": "token_revoked",
            "message": "Token has been revoked. Please log in again.",
            "status_code": 401,
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return jsonify({
            "error": "token_expired",
            "message": "Token has expired. Please refresh or log in again.",
            "status_code": 401,
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(_error):
        return jsonify({
            "error": "invalid_token",
            "message": "Token is invalid or malformed.",
            "status_code": 401,
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(_error):
        return jsonify({
            "error": "authorization_required",
            "message": "Authorization token is required.",
            "status_code": 401,
        }), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_callback(_jwt_header, _jwt_payload):
        return jsonify({
            "error": "fresh_token_required",
            "message": "Fresh token required for this operation. Please log in again.",
            "status_code": 401,
        }), 401

    @jwt.user_identity_loader
    def user_identity_lookup(user):
        """
        Convert a user dict / model to a JSON string for the JWT *sub* claim.

        PyJWT's ``verify_sub`` requires the *sub* to be a string.
        """
        if isinstance(user, dict):
            return serialize_identity(user)
        # User model object
        identity = {
            "user_id": str(user.id),
            "email": user.email,
            "tenant_id": str(user.tenant_id),
            "roles": [r.name for r in user.roles] if hasattr(user, "roles") else [],
        }
        return serialize_identity(identity)

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_payload):
        identity_raw = jwt_payload.get("sub")
        if not identity_raw:
            return None
        identity = deserialize_identity(identity_raw)
        if not identity:
            return None
        from app.domains.identity.application.auth_service import AuthService
        return AuthService().validate_token_identity(identity)

    @jwt.additional_claims_loader
    def add_claims_to_access_token(identity):
        """Inject tenant_id, roles, and permissions into the JWT payload."""
        if not isinstance(identity, dict):
            return {}
        return {
            "tenant_id": identity.get("tenant_id"),
            "roles": identity.get("roles", []),
            "permissions": identity.get("permissions", []),
        }


# ─── Application-level initializer ─────────────────────────────────

def init_jwt_handlers(app: Flask) -> None:
    """Initialize JWT handlers for a Flask application."""
    from app.extensions import jwt
    register_jwt_handlers(jwt)
